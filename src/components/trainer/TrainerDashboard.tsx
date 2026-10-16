import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Award, 
  PlusCircle, 
  ArrowRight, 
  TrendingUp, 
  AlertCircle, 
  ExternalLink, 
  ChevronRight, 
  Flame, 
  ShieldCheck, 
  FileText, 
  BarChart3, 
  Sun, 
  CalendarRange,
  PieChart as PieIcon,
  Info,
  BookOpen,
  X,
  GitCompare,
  Send,
  Lock,
  Palmtree,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { KpiCard } from '../common/KpiCard';
import { Modal } from '../common/Modal';
import { Tooltip } from '../common/Tooltip';

interface TrainerDashboardProps {
  onNavigate: (view: string) => void;
}

export const TrainerDashboard: React.FC<TrainerDashboardProps> = ({ onNavigate }) => {
  const { userProfile } = useAuth();
  const { 
    classes = [], 
    tasks = [], 
    projects = [], 
    dailyUpdates = [], 
    allManagers = [],
    managerChangeRequests = [],
    submitManagerChangeRequest,
    updateTaskProgress,
    updateClass 
  } = useData();
  const { addToast } = useToast();

  const [inspectingDay, setInspectingDay] = useState<any | null>(null);

  // Manager Change Request Modal state
  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
  const [requestedManagerId, setRequestedManagerId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [changeRequestError, setChangeRequestError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // User-specific data
  const myClasses = userProfile ? (classes || []).filter(c => c.userId === userProfile.uid) : [];
  const myTasks = userProfile ? (tasks || []).filter(t => t.assignedTo === userProfile.uid) : [];
  const myProjects = userProfile ? (projects || []).filter(p => p.assignedTo === userProfile.uid) : [];
  const myDailyUpdates = userProfile ? (dailyUpdates || []).filter(u => {
    if (u.userId && u.userId === userProfile.uid) return true;
    if (userProfile.employeeId && u.employeeId && u.employeeId.toUpperCase() === userProfile.employeeId.toUpperCase()) return true;
    if (userProfile.companyEmail && ((u as any).userEmail || (u as any).email || (u as any).companyEmail) && ((u as any).userEmail || (u as any).email || (u as any).companyEmail).toLowerCase() === userProfile.companyEmail.toLowerCase()) return true;
    if (userProfile.fullName && u.employeeName && u.employeeName.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase()) return true;
    return false;
  }) : [];

  // Filtered metrics for today
  const todayClasses = myClasses.filter(c => c.date === todayStr);
  const todayClassesCompleted = todayClasses.filter(c => c.status === 'Completed').length;
  
  // Today's Daily Update & Work Hours Calculation (6 hours daily baseline)
  const todayUpdate = myDailyUpdates.find(u => u.date === todayStr);
  const todayHoursLogged = todayUpdate ? (todayUpdate.hoursLogged || 6) : 0;
  const todayExtraHours = todayUpdate 
    ? (todayUpdate.extraHoursWorked !== undefined ? todayUpdate.extraHoursWorked : Math.max(0, todayHoursLogged - 6))
    : 0;

  // 36-Hour Standard Weekly Target & Exclude Sundays
  const STANDARD_WEEKLY_TARGET = 36.0;

  const currentWeekMetrics = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // Calculate Monday of the current week
    const monday = new Date(now);
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    monday.setDate(now.getDate() + diffToMonday);

    // Generate Monday (Day 1) to Saturday (Day 6) - strictly 6 working days
    const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const DAY_SHORTS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const workDays = [1, 2, 3, 4, 5, 6].map((dayOffset) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + (dayOffset - 1));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Find matching log for this workday
      const updateMatch = myDailyUpdates.find(u => (u.date || '').split('T')[0] === dateStr);
      const isPastDay = dateStr < todayStr;
      const userRegDateStr = userProfile?.createdAt ? userProfile.createdAt.split('T')[0] : '';
      const isAfterReg = !userRegDateStr || dateStr >= userRegDateStr;
      const isMissedLog = isPastDay && isAfterReg && !updateMatch;
      const isLeave = !!updateMatch?.isLeave;
      const leaveType = updateMatch?.leaveType || 'NONE';

      const hoursLogged = updateMatch 
        ? Number(updateMatch.hoursLogged ?? updateMatch.calculatedTotalHours ?? (isLeave ? (leaveType === 'UNPAID_LEAVE' ? 0 : 6) : 0)) 
        : 0;
      const extraHours = updateMatch 
        ? (isLeave ? 0 : (updateMatch.extraHoursWorked !== undefined ? updateMatch.extraHoursWorked : Math.max(0, hoursLogged - 6.0)))
        : 0;
      const isOvertime = !isLeave && hoursLogged > 6.0;

      return {
        dayNum: dayOffset,
        dayName: DAY_NAMES[dayOffset - 1],
        dayShort: DAY_SHORTS[dayOffset - 1],
        dateStr,
        hoursLogged,
        extraHours: Number(extraHours.toFixed(1)),
        isOvertime,
        hasLog: !!updateMatch,
        isMissedLog,
        isLeave,
        leaveType,
        update: updateMatch || null,
        isToday: dateStr === todayStr
      };
    });

    // Sunday of current week (strictly excluded from work hours calculation)
    const sundayDate = new Date(monday);
    sundayDate.setDate(monday.getDate() + 6);
    const sunYYYY = sundayDate.getFullYear();
    const sunMM = String(sundayDate.getMonth() + 1).padStart(2, '0');
    const sunDD = String(sundayDate.getDate()).padStart(2, '0');
    const sundayDateStr = `${sunYYYY}-${sunMM}-${sunDD}`;

    // Total weekly hours logged across Monday through Saturday ONLY (Sundays excluded)
    const totalWeeklyHours = Number(
      workDays.reduce((sum, d) => sum + d.hoursLogged, 0).toFixed(1)
    );

    // Burnout hours based on 36.0h standard weekly target
    const weeklyBurnoutHours = Math.max(0, Number((totalWeeklyHours - STANDARD_WEEKLY_TARGET).toFixed(1)));
    const standardHoursMet = Math.min(totalWeeklyHours, STANDARD_WEEKLY_TARGET);
    const remainingCapacity = Math.max(0, Number((STANDARD_WEEKLY_TARGET - totalWeeklyHours).toFixed(1)));
    const overtimeDaysCount = workDays.filter(d => d.isOvertime).length;
    const loggedWorkdaysCount = workDays.filter(d => d.hasLog).length;

    const firstDay = workDays[0];
    const lastDay = workDays[workDays.length - 1];
    const dateRangeLabel = `${firstDay.dayShort}, ${firstDay.dateStr.slice(5)} – ${lastDay.dayShort}, ${lastDay.dateStr.slice(5)}`;

    // Build Weekly Pie Chart Data
    // E.g., for 38h worked: 36h normal + 2h burnout
    // For 28h worked: 28h normal + 8h remaining capacity
    const pieData: Array<{ name: string; value: number; color: string; percentStr: string }> = [];
    if (totalWeeklyHours === 0) {
      pieData.push({
        name: 'Remaining Capacity',
        value: 36.0,
        color: '#e2e8f0',
        percentStr: '100%'
      });
    } else {
      pieData.push({
        name: 'Standard Work (≤36h)',
        value: standardHoursMet,
        color: '#0284c7', // sky-600
        percentStr: `${Math.round((standardHoursMet / Math.max(36.0, totalWeeklyHours)) * 100)}%`
      });

      if (weeklyBurnoutHours > 0) {
        pieData.push({
          name: 'Burnout Overtime (>36h)',
          value: weeklyBurnoutHours,
          color: '#f59e0b', // amber-500
          percentStr: `${Math.round((weeklyBurnoutHours / totalWeeklyHours) * 100)}%`
        });
      } else if (remainingCapacity > 0) {
        pieData.push({
          name: 'Remaining Capacity',
          value: remainingCapacity,
          color: '#bae6fd', // sky-200
          percentStr: `${Math.round((remainingCapacity / 36.0) * 100)}%`
        });
      }
    }

    return {
      workDays,
      sundayDateStr,
      totalWeeklyHours,
      standardWeeklyTarget: STANDARD_WEEKLY_TARGET,
      weeklyBurnoutHours,
      standardHoursMet,
      remainingCapacity,
      overtimeDaysCount,
      loggedWorkdaysCount,
      dateRangeLabel,
      isBurnout: weeklyBurnoutHours > 0,
      pieData
    };
  }, [myDailyUpdates, todayStr]);

  // Total hours delivered (sum of completed classes duration in hours)
  const completedClasses = myClasses.filter(c => c.status === 'Completed');
  const totalMinutesDelivered = completedClasses.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  const totalHoursDelivered = (totalMinutesDelivered / 60).toFixed(1);

  // Tasks
  const tasksAssigned = myTasks.length;
  const tasksCompleted = myTasks.filter(t => t.status === 'Completed').length;
  const tasksInProgress = myTasks.filter(t => t.status === 'In Progress').length;

  // Active Projects
  const activeProjects = myProjects.filter(p => p.currentStatus !== 'Completed').length;
  const avgProjectCompletion = myProjects.length > 0
    ? Math.round(myProjects.reduce((acc, p) => acc + p.overallCompletionPercentage, 0) / myProjects.length)
    : 0;

  // Missing Previous Days Work Log Reminder (up to 7 days grace window)
  // Strictly only prompt for days on or after the user's account registration date (skipping Sundays)
  const missedPreviousDays = useMemo(() => {
    const list: Array<{ label: string; dateStr: string; dayName: string; daysRemaining: number }> = [];
    const now = new Date();
    
    // User's registration date string (YYYY-MM-DD)
    const userRegDateStr = userProfile?.createdAt ? userProfile.createdAt.split('T')[0] : '';

    // Check up to past 7 working days (skipping Sundays)
    for (let offset = 1; offset <= 7; offset++) {
      const d = new Date(now);
      d.setDate(now.getDate() - offset);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0) continue; // Skip Sunday

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // If this date is prior to the user's registration date, skip it
      if (userRegDateStr && dateStr < userRegDateStr) {
        continue;
      }

      const hasLog = myDailyUpdates.some(u => (u.date || '').split('T')[0] === dateStr);
      if (!hasLog) {
        const daysRemaining = 7 - offset;
        const label = offset === 1 
          ? 'Yesterday' 
          : offset === 2 
          ? '2 Days Ago' 
          : `${offset} Days Ago`;
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        list.push({ label, dateStr, dayName, daysRemaining });
      }
    }
    return list;
  }, [myDailyUpdates, userProfile?.createdAt]);

  // Filter manager change requests for current instructor
  const myRequests = (managerChangeRequests || []).filter(
    r => r.instructorId === userProfile?.uid || (userProfile?.employeeId && r.instructorEmployeeId === userProfile.employeeId)
  );
  const latestPendingRequest = myRequests.find(r => r.status === 'PENDING');
  const latestReviewedRequest = myRequests.find(r => r.status !== 'PENDING');

  // Available candidate managers (excluding currently mapped manager)
  const availableTargetManagers = (allManagers || []).filter(m => {
    if (userProfile?.managerId && m.uid === userProfile.managerId) return false;
    if (userProfile?.managerEmail && m.companyEmail.toLowerCase() === userProfile.managerEmail.toLowerCase()) return false;
    if (userProfile?.managerName && m.fullName.toLowerCase() === userProfile.managerName.toLowerCase()) return false;
    return true;
  });

  const handleOpenChangeRequestModal = () => {
    setChangeRequestError(null);
    setChangeReason('');
    if (availableTargetManagers.length > 0) {
      setRequestedManagerId(availableTargetManagers[0].uid);
    } else {
      setRequestedManagerId('');
    }
    setIsChangeRequestModalOpen(true);
  };

  const handleSubmitManagerChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeRequestError(null);

    if (!userProfile) return;

    if (!requestedManagerId) {
      setChangeRequestError('Please select a manager to transfer to.');
      return;
    }

    if (!changeReason.trim() || changeReason.trim().length < 10) {
      setChangeRequestError('Please provide a detailed reason for the manager change request (at least 10 characters).');
      return;
    }

    const targetManager = availableTargetManagers.find(m => m.uid === requestedManagerId);
    if (!targetManager) {
      setChangeRequestError('Selected manager is not recognized.');
      return;
    }

    setSubmittingRequest(true);
    try {
      await submitManagerChangeRequest({
        instructorId: userProfile.uid,
        instructorName: userProfile.fullName,
        instructorEmail: userProfile.companyEmail,
        instructorEmployeeId: userProfile.employeeId,
        currentManagerId: userProfile.managerId || 'mgr-enterprise-01',
        currentManagerName: userProfile.managerName || 'Sarah Jenkins',
        currentManagerEmail: userProfile.managerEmail || 'manager@enterprise.com',
        requestedManagerId: targetManager.uid,
        requestedManagerName: targetManager.fullName,
        requestedManagerEmail: targetManager.companyEmail,
        reason: changeReason.trim(),
      });

      addToast({
        title: 'Manager Change Request Submitted',
        message: `Your request to transfer to manager ${targetManager.fullName} was submitted and routed to ${userProfile.managerName || 'your manager'} for approval.`,
        type: 'success',
        duration: 5000,
      });

      setIsChangeRequestModalOpen(false);
    } catch (err: any) {
      console.error('Failed to submit manager change request:', err);
      setChangeRequestError(err?.message || 'Failed to submit manager change request. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome Banner */}
      <div className="rounded-3xl border border-sky-200/80 bg-gradient-to-r from-sky-600 via-blue-600 to-sky-700 p-6 sm:p-8 text-white shadow-lg shadow-sky-600/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
              Instructor Workspace
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Welcome back, {userProfile?.fullName || 'Alex Morgan'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-sky-100 max-w-2xl font-medium">
              {userProfile?.designation} • {userProfile?.teamName || 'Engineering Talent Org'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Tooltip content="Submit today's accomplishments, hours, and blockers" placement="bottom">
              <button
                type="button"
                onClick={() => onNavigate('daily-work')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-sky-800 shadow-md hover:bg-sky-50 transition-colors"
                aria-label="Log Daily Work"
              >
                <PlusCircle className="h-4 w-4 text-sky-600" />
                <span>Log Daily Work</span>
              </button>
            </Tooltip>
            <Tooltip content="View full calendar and attendance logs" placement="bottom">
              <button
                type="button"
                onClick={() => onNavigate('daily-work')}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500/40 border border-white/30 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs hover:bg-sky-500/60 transition-colors"
                aria-label="View Attendance & Logs"
              >
                <CalendarRange className="h-4 w-4" />
                <span>Attendance & Work Logs</span>
              </button>
            </Tooltip>
            <Tooltip content="Submit a formal request to change your assigned reporting manager" placement="bottom">
              <button
                type="button"
                onClick={handleOpenChangeRequestModal}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/30 px-3.5 py-2.5 text-xs font-bold text-white backdrop-blur-xs hover:bg-white/25 transition-colors cursor-pointer"
                aria-label="Change Manager Request"
              >
                <GitCompare className="h-4 w-4 text-sky-200" />
                <span>Change Manager</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Active Manager Change Request Status Banner */}
      {latestPendingRequest && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 shrink-0 border border-amber-300">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-extrabold text-amber-950">
                  Manager Change Request: Under Review
                </h3>
                <span className="rounded-full bg-amber-200 text-amber-900 text-[10px] font-black px-2.5 py-0.5 border border-amber-300">
                  Status: PENDING
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                You requested a transfer to <strong className="font-bold">{latestPendingRequest.requestedManagerName}</strong> on{' '}
                {new Date(latestPendingRequest.requestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
                This request has been forwarded to your current reporting manager ({latestPendingRequest.currentManagerName}) for approval.
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 italic">
                Reason: "{latestPendingRequest.reason}"
              </p>
            </div>
          </div>
          <span className="text-2xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 shrink-0">
            Awaiting Manager Review
          </span>
        </div>
      )}

      {/* Recently Reviewed Manager Change Request Banner */}
      {!latestPendingRequest && latestReviewedRequest && (
        <div className={`rounded-2xl border p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          latestReviewedRequest.status === 'APPROVED' 
            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950' 
            : 'border-rose-200 bg-rose-50/80 text-rose-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2 shrink-0 ${
              latestReviewedRequest.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {latestReviewedRequest.status === 'APPROVED' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  Manager Change Request {latestReviewedRequest.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  latestReviewedRequest.status === 'APPROVED' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}>
                  {latestReviewedRequest.status}
                </span>
              </div>
              <p className="text-xs mt-1">
                {latestReviewedRequest.status === 'APPROVED'
                  ? `Your request to transfer to manager ${latestReviewedRequest.requestedManagerName} was approved. Your profile mapping is synchronized.`
                  : `Your request to transfer to manager ${latestReviewedRequest.requestedManagerName} was rejected by ${latestReviewedRequest.currentManagerName}. Your current manager mapping remains active.`
                }
              </p>
              {latestReviewedRequest.reviewNotes && (
                <p className="text-[11px] opacity-80 mt-0.5 italic">
                  Reviewer Notes: "{latestReviewedRequest.reviewNotes}"
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenChangeRequestModal}
            className="text-xs font-bold underline shrink-0 cursor-pointer hover:opacity-80"
          >
            Submit New Request &rarr;
          </button>
        </div>
      )}

      {/* Automated Daily Log Reminder (Active when instructor has not logged today's work) */}
      {!todayUpdate && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800 shrink-0 border border-amber-300">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-extrabold text-amber-950">
                  Automated Reminder: Today's Daily Work Log Pending
                </h3>
                <span className="rounded-full bg-amber-200 text-amber-900 text-[10px] font-black px-2.5 py-0.5 border border-amber-300">
                  Due Today ({todayStr})
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                You have not completed your daily work log for today yet. Submit your class delivery, practice sessions, and academic duties before ending your shift to keep your attendance record current.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('daily-work')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Log Today's Work</span>
          </button>
        </div>
      )}

      {/* Missed Previous Days Work Log Reminder Banner with 7-Day Grace Countdown */}
      {missedPreviousDays.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700 shrink-0 border border-rose-300">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-extrabold text-rose-950">
                  7-Day Grace Period: Missing Work Log Reminder
                </h3>
                <span className="rounded-full bg-rose-200 text-rose-900 text-[10px] font-black px-2.5 py-0.5 border border-rose-300 animate-pulse">
                  {missedPreviousDays.length} {missedPreviousDays.length === 1 ? 'Day Pending' : 'Days Pending'}
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                You have not submitted work logs for{' '}
                <strong className="font-bold text-rose-950">
                  {missedPreviousDays.map(m => `${m.label} (${m.dayName})`).join(' and ')}
                </strong>
                . You have a strict 7-day grace window to submit your daily attendance and workload logs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {missedPreviousDays.map(m => (
              <button
                key={m.dateStr}
                type="button"
                onClick={() => {
                  try {
                    localStorage.setItem('nxtwave_prefill_work_date', m.dateStr);
                  } catch {}
                  onNavigate('daily-work');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Fill {m.label}</span>
                <span className="bg-rose-800 text-rose-100 text-[10px] px-1.5 py-0.2 rounded-md font-semibold">
                  {m.daysRemaining > 0 ? `${m.daysRemaining}d left` : 'Last day!'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Today's Work Log"
          value={todayUpdate ? `${todayHoursLogged} hrs` : 'Pending'}
          subtitle={todayUpdate ? `${todayUpdate.classesCount || 0} class sessions` : 'No log submitted today'}
          icon={FileText}
          variant={todayUpdate ? 'primary' : 'warning'}
          onClick={() => onNavigate('daily-work')}
        />

        <KpiCard
          title="Weekly Workload (Mon–Sat)"
          value={`${currentWeekMetrics.totalWeeklyHours} / 36.0 hrs`}
          subtitle={
            currentWeekMetrics.isBurnout 
              ? `+${currentWeekMetrics.weeklyBurnoutHours}h Burnout Overtime (${currentWeekMetrics.overtimeDaysCount}d over 6h)`
              : `${currentWeekMetrics.remainingCapacity}h capacity left (0h Burnout)`
          }
          icon={currentWeekMetrics.isBurnout ? Flame : Clock}
          variant={currentWeekMetrics.isBurnout ? 'warning' : 'primary'}
          trend={{ value: 'Sun Excluded (6 Days)', isPositive: !currentWeekMetrics.isBurnout }}
          progress={{
            current: Math.min(36, currentWeekMetrics.totalWeeklyHours),
            max: 36,
            color: currentWeekMetrics.isBurnout ? 'bg-amber-500' : 'bg-sky-500'
          }}
          onClick={() => onNavigate('daily-work')}
        />

        <KpiCard
          title="Attendance Logged"
          value={`${currentWeekMetrics.loggedWorkdaysCount} / 6 Days`}
          subtitle={currentWeekMetrics.overtimeDaysCount > 0 ? `${currentWeekMetrics.overtimeDaysCount} overtime days logged` : 'Standard weekly pace'}
          icon={Calendar}
          progress={{ current: currentWeekMetrics.loggedWorkdaysCount, max: 6, color: 'bg-sky-500' }}
          onClick={() => onNavigate('daily-work')}
        />

        <KpiCard
          title="Delivered Classes"
          value={`${completedClasses.length} Completed`}
          subtitle={`${totalHoursDelivered} total hours delivered`}
          icon={BookOpen}
          variant="primary"
          onClick={() => onNavigate('daily-work')}
        />
      </div>

      {/* Two-Column Section: Today's Work Summary & Priority Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Today's Work & Daily Logs (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-sky-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-sky-50 p-2 text-sky-600 border border-sky-100">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Today's Work Summary
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daily delivery log, hours & accomplishments
                  </p>
                </div>
              </div>
              <Tooltip content="Navigate to full daily work logs" placement="left">
                <button
                  type="button"
                  onClick={() => onNavigate('daily-work')}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                  aria-label="View daily work logs"
                >
                  Daily Logs <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>

            <div className="mt-4">
              {todayUpdate ? (
                <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-800">
                        Logged for Today ({todayUpdate.date})
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {todayUpdate.hoursLogged || 6} Hours
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('daily-work')}
                      className="rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 transition-colors"
                    >
                      Edit Log
                    </button>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1.5 pt-1">
                    <p>
                      <strong className="text-slate-900">Class Sessions:</strong> {todayUpdate.classesCount || 0} classes delivered
                    </p>
                    {todayUpdate.tasksWorkedOn && (
                      <p>
                        <strong className="text-slate-900">Tasks Worked On:</strong> {todayUpdate.tasksWorkedOn}
                      </p>
                    )}
                    {todayUpdate.topicsCovered && (
                      <p>
                        <strong className="text-slate-900">Topics Covered:</strong> {todayUpdate.topicsCovered}
                      </p>
                    )}
                    {(todayUpdate.paperEvaluationHours || 0) > 0 && (
                      <p>
                        <strong className="text-slate-900">Paper Evaluation:</strong> {todayUpdate.paperEvaluationHours} hrs
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500">
                    You haven't submitted today's daily work update yet.
                  </p>
                  <Tooltip content="Open daily work logging form" placement="top">
                    <button
                      type="button"
                      onClick={() => onNavigate('daily-work')}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition-colors shadow-xs"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Submit Today's Log
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Attendance & Delivery Log Preview */}
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-sky-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-sky-50 p-2 text-sky-600 border border-sky-100">
                  <CalendarRange className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    This Week's Attendance & Daily Delivery
                  </h2>
                  <p className="text-xs text-slate-500">
                    Mon &ndash; Sat (6 days) &bull; Standard 6h / day baseline
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('daily-work')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                Full Calendar <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {currentWeekMetrics.workDays.map((day) => {
                const isToday = day.dateStr === todayStr;
                return (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      if (day.hasLog) {
                        setInspectingDay(day);
                      } else {
                        onNavigate('daily-work');
                      }
                    }}
                    className={`rounded-xl border p-3 cursor-pointer transition-all ${
                      isToday 
                        ? 'border-sky-400 bg-sky-50/60 ring-2 ring-sky-300/40 shadow-xs' 
                        : day.hasLog 
                        ? 'border-sky-100 bg-sky-50/20 hover:border-sky-200' 
                        : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className={isToday ? 'text-sky-900' : 'text-slate-800'}>
                        {day.dayShort}
                      </span>
                      {isToday && (
                        <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{day.dateStr.slice(5)}</div>
                    <div className="mt-2 flex items-center justify-between">
                      {day.hasLog ? (
                        <span className="text-xs font-black text-slate-900">
                          {day.hoursLogged} hrs
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No log</span>
                      )}
                      {day.isOvertime ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md">
                          +{day.extraHours}h
                        </span>
                      ) : day.hasLog ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                          Balanced
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Weekly Workload & Burnout Hours Analytics (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Weekly Workload & Burnout Hours Card (36h Target, Mon-Sat, Sunday Excluded) */}
          <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-sky-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className={`rounded-xl p-2.5 shadow-xs ${
                  currentWeekMetrics.isBurnout 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-sky-100 text-sky-700'
                }`}>
                  {currentWeekMetrics.isBurnout ? (
                    <Flame className="h-5 w-5 text-amber-600" />
                  ) : (
                    <BarChart3 className="h-5 w-5 text-sky-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Weekly Workload & Burnout
                  </h3>
                  <p className="text-2xs text-slate-500">
                    {currentWeekMetrics.dateRangeLabel} &bull; 36h Target
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                currentWeekMetrics.isBurnout
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}>
                {currentWeekMetrics.isBurnout ? 'Burnout Risk' : 'Healthy Load'}
              </span>
            </div>

            {/* Weekly Target vs Logged Hours Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                  Weekly Target (6 Days)
                </span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  36.0 hrs
                </span>
                <span className="text-2xs text-slate-500 block">
                  6 Working Days (Mon &ndash; Sat &bull; 6h/day)
                </span>
              </div>

              <div className={`rounded-xl border p-3 ${
                currentWeekMetrics.isBurnout
                  ? 'border-amber-300 bg-amber-50/60'
                  : 'border-sky-200 bg-sky-50'
              }`}>
                <span className="text-2xs font-bold text-slate-600 uppercase tracking-wider block">
                  Hours Logged this Week
                </span>
                <span className="text-lg font-black text-slate-950 mt-0.5 block">
                  {currentWeekMetrics.totalWeeklyHours} hrs
                </span>
                <span className={`text-2xs font-bold block ${
                  currentWeekMetrics.isBurnout ? 'text-amber-800' : 'text-emerald-700'
                }`}>
                  {currentWeekMetrics.isBurnout 
                    ? `+${currentWeekMetrics.weeklyBurnoutHours}h Burnout Overtime` 
                    : `${currentWeekMetrics.remainingCapacity}h capacity left`}
                </span>
              </div>
            </div>

            {/* Weekly Pie Graph: Standard 36h Target vs Burnout Hours */}
            <div className="rounded-xl border border-sky-100 bg-linear-to-b from-sky-50/40 to-white p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <PieIcon className="h-3.5 w-3.5 text-sky-600" />
                  <span>Weekly Work & Burnout Ratio</span>
                </span>
                <span className="text-2xs font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full">
                  6-Day Cycle
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Pie Chart Container */}
                <div className="sm:col-span-6 h-36 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentWeekMetrics.pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={56}
                        paddingAngle={4}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {currentWeekMetrics.pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [`${val} hrs`, name]}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart Legend & Hour Counts */}
                <div className="sm:col-span-6 space-y-2 text-2xs">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-sky-100">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-600 shrink-0" />
                      <span>Standard Work (≤36h)</span>
                    </span>
                    <span className="font-bold text-slate-900">{currentWeekMetrics.standardHoursMet}h</span>
                  </div>

                  {currentWeekMetrics.weeklyBurnoutHours > 0 ? (
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="flex items-center gap-1.5 font-bold text-amber-900">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Burnout Overtime (&gt;36h)</span>
                      </span>
                      <span className="font-extrabold text-amber-900">+{currentWeekMetrics.weeklyBurnoutHours}h</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-sky-50 border border-sky-100">
                      <span className="flex items-center gap-1.5 font-medium text-sky-800">
                        <span className="h-2.5 w-2.5 rounded-full bg-sky-200 shrink-0" />
                        <span>Remaining Capacity</span>
                      </span>
                      <span className="font-bold text-sky-900">{currentWeekMetrics.remainingCapacity}h</span>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 leading-tight pt-0.5">
                    *Formula: Overtime above 36.0 weekly standard is calculated as Burnout. Sundays (Day 7) excluded.
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar towards 36h target */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-2xs font-semibold text-slate-600">
                <span>Weekly Capacity Utilization</span>
                <span className="font-bold text-slate-900">
                  {Math.round((currentWeekMetrics.totalWeeklyHours / 36.0) * 100)}% of 36h Target
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    currentWeekMetrics.isBurnout 
                      ? 'bg-amber-500' 
                      : currentWeekMetrics.totalWeeklyHours > 30 
                      ? 'bg-sky-500' 
                      : 'bg-sky-400'
                  }`}
                  style={{ width: `${Math.min(100, (currentWeekMetrics.totalWeeklyHours / 36.0) * 100)}%` }}
                />
              </div>
            </div>

            {/* 6-Day Workday Tracker (Monday to Saturday Only) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <CalendarRange className="h-3.5 w-3.5 text-sky-600" />
                  <span>Workdays (Day 1: Mon to Day 6: Sat)</span>
                </span>
                <span className="text-2xs font-semibold text-slate-500">
                  6h Standard / Day
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {currentWeekMetrics.workDays.map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    onClick={() => setInspectingDay(d)}
                    className={`rounded-lg border p-2 text-center transition-all cursor-pointer hover:shadow-xs ${
                      d.isMissedLog
                        ? 'border-rose-400 bg-rose-50/80 text-rose-950 ring-1 ring-rose-300'
                        : d.isLeave
                        ? 'border-purple-300 bg-purple-50/80 text-purple-950'
                        : d.isOvertime
                        ? 'border-amber-300 bg-amber-50/80 text-amber-950'
                        : d.hasLog
                        ? 'border-sky-200 bg-sky-50/60 text-slate-900'
                        : 'border-slate-200 bg-slate-50/50 text-slate-500'
                    } ${d.isToday ? 'ring-2 ring-sky-500 font-bold' : ''}`}
                    aria-label={`View log for ${d.dayName} (${d.hoursLogged}h)`}
                  >
                    <span className="text-2xs font-extrabold uppercase block">
                      {d.dayShort}
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      {d.dateStr.slice(8)}
                    </span>
                    <div className="mt-1 font-bold text-xs">
                      {d.isMissedLog ? (
                        <span className="text-rose-700 font-black">0h</span>
                      ) : d.hasLog ? (
                        <span>{d.hoursLogged}h</span>
                      ) : (
                        <span className="text-2xs text-slate-400 font-normal">0h</span>
                      )}
                    </div>
                    {d.isMissedLog ? (
                      <span className="inline-block mt-0.5 text-[9px] font-black text-rose-700 bg-rose-100 rounded px-1 animate-pulse">
                        Missed (6h)
                      </span>
                    ) : d.isLeave ? (
                      <span className="inline-block mt-0.5 text-[9px] font-bold text-purple-700 bg-purple-100 rounded px-1">
                        Leave
                      </span>
                    ) : d.isOvertime ? (
                      <span className="inline-block mt-0.5 text-[9px] font-extrabold text-amber-700 bg-amber-100 rounded px-1">
                        +{d.extraHours}h
                      </span>
                    ) : d.hasLog ? (
                      <span className="inline-block mt-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-100 rounded px-1">
                        OK
                      </span>
                    ) : (
                      <span className="inline-block mt-0.5 text-[9px] text-slate-400">
                        &ndash;
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sunday Holiday & Exclusion Note */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-2.5 flex items-center justify-between text-2xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span><strong>Sunday:</strong> Official Weekly Off &bull; Excluded from work hour calculations.</span>
              </span>
              <span className="font-bold text-sky-800 bg-white px-2 py-0.5 rounded-md border border-sky-200 shrink-0 ml-2">
                0h Baseline
              </span>
            </div>

            {/* Quick Action Navigation */}
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={() => onNavigate('daily-work')}
                className="flex-1 rounded-xl bg-sky-600 text-white hover:bg-sky-500 py-2 text-xs font-bold transition-colors shadow-xs text-center"
              >
                Log Today's Work
              </button>
              <button
                type="button"
                onClick={() => onNavigate('daily-work')}
                className="rounded-xl border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 px-3 py-2 text-xs font-bold transition-colors text-center"
              >
                Full Burnout Report →
              </button>
            </div>
          </div>



          {/* Priority Tasks & Responsibilities Summary */}
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-sky-50 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-sky-600" />
                <span>Assigned Tasks & Focus</span>
              </h3>
              <span className="text-[10px] font-bold bg-sky-50 text-sky-800 px-2 py-0.5 rounded-md border border-sky-200">
                {tasksCompleted} / {tasksAssigned} Completed
              </span>
            </div>

            {myTasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center italic">
                No active tasks currently assigned.
              </p>
            ) : (
              <div className="space-y-2">
                {myTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="rounded-xl border border-sky-100 bg-sky-50/30 p-2.5 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{task.taskName}</p>
                      <p className="text-[10px] text-slate-500">Due: {task.dueDate || 'Ongoing'} &bull; {task.priority} Priority</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                      task.status === 'Completed' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {task.completionPercentage || 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => onNavigate('daily-work')}
              className="mt-2 w-full rounded-xl bg-sky-50 border border-sky-200/80 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-colors text-center"
            >
              Open Daily Work & Logs →
            </button>
          </div>
        </div>
      </div>



      {/* Day Work & Burnout Detail Inspection Modal */}
      <Modal
        isOpen={!!inspectingDay}
        onClose={() => setInspectingDay(null)}
        title={inspectingDay ? `${inspectingDay.dayName} Work & Workout Log` : 'Day Work Log'}
        subtitle={inspectingDay ? `${inspectingDay.dateStr} • ${inspectingDay.hoursLogged} Hours Total` : ''}
      >
        {inspectingDay && (
          <div className="space-y-4">
            {/* Hours summary pill */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Daily Baseline</span>
                <span className="text-base font-black text-slate-900 mt-0.5 block">6.0 hrs</span>
              </div>
              <div className={`rounded-xl border p-2.5 ${
                inspectingDay.isOvertime ? 'border-amber-200 bg-amber-50' : 'border-sky-100 bg-white'
              }`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Hours Logged</span>
                <span className="text-base font-black text-slate-900 mt-0.5 block">{inspectingDay.hoursLogged} hrs</span>
              </div>
              <div className={`rounded-xl border p-2.5 ${
                inspectingDay.isOvertime ? 'border-amber-300 bg-amber-100/70 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}>
                <span className="text-[10px] font-bold uppercase block">Burnout Overtime</span>
                <span className="text-base font-black mt-0.5 block">
                  {inspectingDay.isOvertime ? `+${inspectingDay.extraHours}h` : '0h'}
                </span>
              </div>
            </div>

            {/* Daily Log Details */}
            {inspectingDay.update ? (
              <div className="space-y-3 rounded-xl border border-sky-100 bg-slate-50/50 p-3.5 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block mb-0.5">Classes & Delivery:</span>
                  <p className="text-slate-600">
                    {inspectingDay.update.classesCount || 0} class(es) &bull; {inspectingDay.update.classDurationMinutes || 0} mins duration
                  </p>
                </div>

                {inspectingDay.update.tasksWorkedOn && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-0.5">Tasks / Workout Details:</span>
                    <p className="text-slate-800 bg-white p-2 rounded-lg border border-sky-100">
                      {inspectingDay.update.tasksWorkedOn}
                    </p>
                  </div>
                )}

                {inspectingDay.update.extraWorkReason && inspectingDay.update.extraWorkReason !== 'None' && (
                  <div>
                    <span className="font-bold text-amber-800 block mb-0.5">Overtime Reason:</span>
                    <p className="text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                      {inspectingDay.update.extraWorkReason}
                      {inspectingDay.update.extraWorkDetails && ` — ${inspectingDay.update.extraWorkDetails}`}
                    </p>
                  </div>
                )}

                {inspectingDay.update.remarks && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-0.5">Daily Notes & Remarks:</span>
                    <p className="text-slate-600 italic bg-white p-2 rounded-lg border border-sky-100">
                      &ldquo;{inspectingDay.update.remarks}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-sky-200 p-4 text-center text-xs text-slate-500">
                No detailed log submitted for this day yet. (Default standard 6h baseline applied).
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setInspectingDay(null)}
                className="rounded-xl border border-sky-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setInspectingDay(null);
                  onNavigate('daily-work');
                }}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs shadow-sky-600/20"
              >
                Edit / View in Daily Work →
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
