import { AlertItem, TaskItem, ProjectItem, DailyUpdate, PerformanceBreakdown, UserProfile } from '../types';

export function evaluateAlerts(
  user: UserProfile,
  tasks: TaskItem[],
  projects: ProjectItem[],
  dailyUpdates: DailyUpdate[],
  metrics: PerformanceBreakdown,
  overallScore: number
): AlertItem[] {
  const generatedAlerts: AlertItem[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Task Overdue Alert
  tasks.forEach(task => {
    if (task.status !== 'Completed' && task.dueDate && task.dueDate < todayStr) {
      generatedAlerts.push({
        id: `alert-task-${task.id}`,
        userId: user.uid,
        employeeId: user.employeeId,
        employeeName: user.fullName,
        teamId: user.teamId,
        managerId: user.managerId,
        type: 'TASK_OVERDUE',
        title: `Task Overdue: ${task.taskName}`,
        description: `Task "${task.taskName}" was due on ${task.dueDate} but is currently "${task.status}" at ${task.completionPercentage}% completion.`,
        severity: task.priority === 'Urgent' || task.priority === 'High' ? 'Critical' : 'High',
        date: todayStr,
        status: 'NEW',
        entityId: task.id,
        entityType: 'task',
        createdAt: new Date().toISOString(),
      });
    }
  });

  // 2. Project Delayed Alert
  projects.forEach(project => {
    if (
      project.currentStatus === 'Delayed' || 
      (project.currentStatus !== 'Completed' && project.expectedCompletionDate && project.expectedCompletionDate < todayStr)
    ) {
      generatedAlerts.push({
        id: `alert-project-${project.id}`,
        userId: user.uid,
        employeeId: user.employeeId,
        employeeName: user.fullName,
        teamId: user.teamId,
        managerId: user.managerId,
        type: 'PROJECT_DELAYED',
        title: `Project Milestone Delay: ${project.projectName}`,
        description: `Project "${project.projectName}" is flagged as delayed at ${project.overallCompletionPercentage}% in stage "${project.currentStage}".`,
        severity: 'High',
        date: todayStr,
        status: 'NEW',
        entityId: project.id,
        entityType: 'project',
        createdAt: new Date().toISOString(),
      });
    }
  });

  // 3. Low Task Completion Velocity
  if (metrics.totalTasks > 3 && metrics.taskCompletionScore < 50) {
    generatedAlerts.push({
      id: `alert-task-velocity-${user.uid}`,
      userId: user.uid,
      employeeId: user.employeeId,
      employeeName: user.fullName,
      teamId: user.teamId,
      managerId: user.managerId,
      type: 'LOW_TASK_COMPLETION',
      title: `Low Task Completion Velocity`,
      description: `Task completion rate is at ${metrics.taskCompletionScore}%, below the team target benchmark of 75%.`,
      severity: 'Medium',
      date: todayStr,
      status: 'NEW',
      entityId: user.uid,
      entityType: 'task',
      createdAt: new Date().toISOString(),
    });
  }

  // 4. Missing Daily Work Update (Only check after account creation date)
  const sortedUpdates = [...dailyUpdates].sort((a, b) => b.date.localeCompare(a.date));
  const userRegDate = user.createdAt ? new Date(user.createdAt) : null;
  const now = new Date();

  if (sortedUpdates.length > 0) {
    const lastUpdateDate = new Date(sortedUpdates[0].date);
    const diffDays = Math.floor((now.getTime() - lastUpdateDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays >= 2) {
      generatedAlerts.push({
        id: `alert-missing-update-${user.uid}`,
        userId: user.uid,
        employeeId: user.employeeId,
        employeeName: user.fullName,
        teamId: user.teamId,
        managerId: user.managerId,
        type: 'MISSING_DAILY_UPDATE',
        title: `Pending Daily Work Update`,
        description: `No daily work logs submitted for past ${diffDays} days. Please ensure accomplishments and hours are logged.`,
        severity: 'Medium',
        date: todayStr,
        status: 'NEW',
        entityId: user.uid,
        entityType: 'dailyUpdate',
        createdAt: new Date().toISOString(),
      });
    }
  } else if (userRegDate) {
    // If no updates logged yet, only alert if account was created 2 or more days ago
    const daysSinceReg = Math.floor((now.getTime() - userRegDate.getTime()) / (1000 * 3600 * 24));
    if (daysSinceReg >= 2) {
      generatedAlerts.push({
        id: `alert-missing-update-${user.uid}`,
        userId: user.uid,
        employeeId: user.employeeId,
        employeeName: user.fullName,
        teamId: user.teamId,
        managerId: user.managerId,
        type: 'MISSING_DAILY_UPDATE',
        title: `Pending Daily Work Update`,
        description: `No daily work logs submitted since registration (${daysSinceReg} days ago). Please ensure accomplishments and hours are logged.`,
        severity: 'Medium',
        date: todayStr,
        status: 'NEW',
        entityId: user.uid,
        entityType: 'dailyUpdate',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 5. Overall Performance Critical Drop
  if (overallScore < 60) {
    generatedAlerts.push({
      id: `alert-crit-perf-${user.uid}`,
      userId: user.uid,
      employeeId: user.employeeId,
      employeeName: user.fullName,
      teamId: user.teamId,
      managerId: user.managerId,
      type: 'PERFORMANCE_DROP',
      title: `Critical Attention Required: Performance Score ${overallScore}%`,
      description: `Composite performance score has dropped below 60% (${overallScore}%). Immediate managerial intervention recommended.`,
      severity: 'Critical',
      date: todayStr,
      status: 'NEW',
      entityId: user.uid,
      entityType: 'performance',
      createdAt: new Date().toISOString(),
    });
  }

  return generatedAlerts;
}
