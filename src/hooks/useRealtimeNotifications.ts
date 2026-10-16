import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

export const useRealtimeNotifications = (onNavigate: (view: string) => void) => {
  const { userProfile, isManager, isTrainer } = useAuth();
  const { tasks, projects, dailyUpdates, loadingData } = useData();
  const { addToast, removeToast } = useToast();

  const isInitialTasksLoad = useRef(true);
  const seenTaskIdsRef = useRef<Set<string>>(new Set());
  const notifiedProjectsRef = useRef<Set<string>>(new Set());
  const notifiedDailyLogDateRef = useRef<string | null>(null);
  const notifiedMissedLogsRef = useRef<boolean>(false);

  // 1. Monitor New Tasks Assigned in Real-Time
  useEffect(() => {
    if (loadingData || !userProfile || !tasks || tasks.length === 0) {
      if (tasks && tasks.length > 0) {
        tasks.forEach((t) => seenTaskIdsRef.current.add(t.id));
        isInitialTasksLoad.current = false;
      }
      return;
    }

    if (isInitialTasksLoad.current) {
      tasks.forEach((t) => seenTaskIdsRef.current.add(t.id));
      isInitialTasksLoad.current = false;
      return;
    }

    // Detect new tasks that haven't been seen yet
    tasks.forEach((task) => {
      if (!seenTaskIdsRef.current.has(task.id)) {
        seenTaskIdsRef.current.add(task.id);

        const isAssignedToMe = task.assignedTo === userProfile.uid || task.assignedToEmployeeId === userProfile.employeeId;

        if (isTrainer && isAssignedToMe) {
          addToast({
            id: `new-task-${task.id}`,
            title: '🎯 New Task Assigned',
            message: `"${task.taskName}" (${task.priority} Priority) • Due ${task.dueDate}`,
            type: task.priority === 'Urgent' ? 'urgent' : task.priority === 'High' ? 'warning' : 'info',
            category: 'task',
            duration: 8000,
            action: {
              label: 'View Task Board',
              onClick: () => onNavigate('task-management'),
            },
          });
        } else if (isManager) {
          addToast({
            id: `manager-task-${task.id}`,
            title: '📋 New Task Created & Assigned',
            message: `"${task.taskName}" assigned to ${task.assignedToName || 'Trainer'} • Due ${task.dueDate}`,
            type: 'info',
            category: 'task',
            duration: 7000,
            action: {
              label: 'View Task Board',
              onClick: () => onNavigate('task-management'),
            },
          });
        }
      }
    });
  }, [tasks, userProfile, isTrainer, isManager, loadingData, addToast, onNavigate]);

  // 2. Monitor Project Deadlines Nearing Completion
  useEffect(() => {
    if (loadingData || !userProfile || !projects || projects.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    projects.forEach((project) => {
      // Only monitor non-completed projects with < 100% progress
      if (project.currentStatus === 'Completed' || project.overallCompletionPercentage >= 100) {
        return;
      }

      const isMyProject =
        isManager ||
        project.assignedTo === userProfile.uid ||
        project.assignedToEmployeeId === userProfile.employeeId;

      if (!isMyProject) return;

      if (!project.expectedCompletionDate) return;

      const dueDate = new Date(project.expectedCompletionDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Key to avoid repetitive duplicate notifications within session
      const notifKey = `${project.id}-${diffDays}-${project.overallCompletionPercentage}`;

      if (notifiedProjectsRef.current.has(notifKey)) return;

      // If deadline is within 7 days or overdue
      if (diffDays <= 7) {
        notifiedProjectsRef.current.add(notifKey);

        if (diffDays < 0) {
          addToast({
            id: `project-overdue-${project.id}`,
            title: '⚠️ Project Overdue',
            message: `"${project.projectName}" passed target date (${project.expectedCompletionDate}). Current progress: ${project.overallCompletionPercentage}%.`,
            type: 'urgent',
            category: 'project',
            duration: 8000,
            action: {
              label: 'Update Project',
              onClick: () => onNavigate('project-tracking'),
            },
          });
        } else if (diffDays === 0) {
          addToast({
            id: `project-today-${project.id}`,
            title: '🚨 Project Deadline Today',
            message: `"${project.projectName}" is due today with ${project.overallCompletionPercentage}% completion.`,
            type: 'urgent',
            category: 'project',
            duration: 8000,
            action: {
              label: 'Review Milestones',
              onClick: () => onNavigate('project-tracking'),
            },
          });
        } else if (diffDays <= 3) {
          addToast({
            id: `project-approaching-${project.id}`,
            title: '⏳ Project Deadline Approaching',
            message: `"${project.projectName}" is due in ${diffDays} day${diffDays === 1 ? '' : 's'} (${project.overallCompletionPercentage}% completed).`,
            type: 'warning',
            category: 'project',
            duration: 7500,
            action: {
              label: 'View Milestones',
              onClick: () => onNavigate('project-tracking'),
            },
          });
        } else if (diffDays <= 7) {
          addToast({
            id: `project-nearing-${project.id}`,
            title: '📅 Project Deadline Nearing',
            message: `"${project.projectName}" target date is ${project.expectedCompletionDate} (${diffDays} days remaining).`,
            type: 'info',
            category: 'project',
            duration: 6500,
            action: {
              label: 'View Project',
              onClick: () => onNavigate('project-tracking'),
            },
          });
        }
      }
    });
  }, [projects, userProfile, isManager, isTrainer, loadingData, addToast, onNavigate]);

  // 3. Automated Daily Work Log Reminders for Instructors
  useEffect(() => {
    if (loadingData || !userProfile || !isTrainer) return;

    const now = new Date();
    const isSunday = now.getDay() === 0; // Sunday is holiday/weekly off
    if (isSunday) return;

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Filter updates for current instructor
    const myUpdates = (dailyUpdates || []).filter(
      u => u.userId === userProfile.uid || (u.employeeId && u.employeeId === userProfile.employeeId)
    );

    const hasSubmittedToday = myUpdates.some(u => (u.date || '').split('T')[0] === todayStr);

    // If log has been submitted today, avoid sending repeated or unnecessary reminders
    // and remove any existing reminder toast
    if (hasSubmittedToday) {
      notifiedDailyLogDateRef.current = todayStr;
      removeToast('daily-log-reminder-today');
      return;
    }

    // Remind instructor if today's log has not been completed
    if (notifiedDailyLogDateRef.current !== todayStr) {
      notifiedDailyLogDateRef.current = todayStr;

      addToast({
        id: 'daily-log-reminder-today',
        title: '⏰ Daily Work Log Reminder',
        message: "You haven't submitted your daily work log for today yet. Please record your classes, practice sessions, and workload to keep your attendance current.",
        type: 'warning',
        category: 'system',
        duration: 10000,
        action: {
          label: 'Submit Daily Log',
          onClick: () => onNavigate('daily-work'),
        },
      });
    }

    // Check for missed logs from past workdays (within 7-day grace window)
    if (!notifiedMissedLogsRef.current) {
      const userRegDateStr = userProfile.createdAt ? userProfile.createdAt.split('T')[0] : '';
      const missedDates: string[] = [];

      // Check last 6 days (excluding Sunday)
      for (let offset = 1; offset <= 6; offset++) {
        const past = new Date(now);
        past.setDate(now.getDate() - offset);
        if (past.getDay() === 0) continue; // Skip Sunday

        const pYyyy = past.getFullYear();
        const pMm = String(past.getMonth() + 1).padStart(2, '0');
        const pDd = String(past.getDate()).padStart(2, '0');
        const pDateStr = `${pYyyy}-${pMm}-${pDd}`;

        if (userRegDateStr && pDateStr < userRegDateStr) continue;

        const hasLog = myUpdates.some(u => (u.date || '').split('T')[0] === pDateStr);
        if (!hasLog) {
          missedDates.push(past.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        }
      }

      if (missedDates.length > 0) {
        notifiedMissedLogsRef.current = true;
        addToast({
          id: 'daily-log-reminder-missed',
          title: '⚠️ Missed Work Log Pending',
          message: `You have ${missedDates.length} unsubmitted workday log${missedDates.length === 1 ? '' : 's'} (${missedDates.slice(0, 2).join(', ')}${missedDates.length > 2 ? '...' : ''}). Missed logs are highlighted in red on manager reports.`,
          type: 'urgent',
          category: 'system',
          duration: 12000,
          action: {
            label: 'Complete Past Logs',
            onClick: () => onNavigate('daily-work'),
          },
        });
      }
    }
  }, [dailyUpdates, userProfile, isTrainer, loadingData, addToast, removeToast, onNavigate]);
};
