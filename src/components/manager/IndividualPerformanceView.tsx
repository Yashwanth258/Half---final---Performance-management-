import React, { useState, useMemo } from 'react';
import { 
  User, 
  Award, 
  Calendar, 
  CheckSquare, 
  FolderGit2, 
  Star, 
  Clock, 
  Plus, 
  TrendingUp, 
  BookOpen, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  ChevronLeft,
  MessageSquarePlus,
  ExternalLink,
  GitBranch,
  Check,
  Layers,
  Info,
  HeartHandshake,
  Users,
  Share2,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  Zap,
  Briefcase
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Tooltip, 
  CartesianGrid, 
  XAxis, 
  YAxis 
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { PermissionGuard } from '../common/PermissionGuard';
import { 
  calculateTrainerMetrics, 
  computeOverallScore, 
  getPerformanceCategory,
  calculateHolisticGuidanceMetrics
} from '../../lib/performanceEngine';
import { WorkEffortPieChart } from '../common/WorkEffortPieChart';
import { FeedbackItem, HolisticContributionRecord } from '../../types';
import { PROJECT_STAGES } from '../trainer/ProjectTrackingView';

interface IndividualPerformanceViewProps {
  selectedEmployeeId: string;
  onSelectEmployee: (empId: string) => void;
  onNavigate: (view: string) => void;
}

export const IndividualPerformanceView: React.FC<IndividualPerformanceViewProps> = ({
  selectedEmployeeId,
  onSelectEmployee,
  onNavigate,
}) => {
  const { userProfile } = useAuth();
  const { 
    allTrainers = [], 
    classes = [], 
    tasks = [], 
    projects = [], 
    feedbacks = [], 
    attendanceList = [], 
    dailyUpdates = [],
    holisticContributions = [],
    updateHolisticContribution,
    performanceWeights,
  } = useData();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'tasks' | 'projects' | 'logs' | 'holistic'>('overview');
  const [acknowledgingItem, setAcknowledgingItem] = useState<HolisticContributionRecord | null>(null);
  const [managerFeedbackInput, setManagerFeedbackInput] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  // Find currently selected employee
  const currentEmployee = (allTrainers || []).find(t => t.uid === selectedEmployeeId) || (allTrainers || [])[0];

  // Filter individual data
  const empClasses = useMemo(() => 
    (classes || []).filter(c => c.userId === currentEmployee?.uid),
    [classes, currentEmployee]
  );
  const empTasks = useMemo(() => 
    (tasks || []).filter(t => t.assignedTo === currentEmployee?.uid),
    [tasks, currentEmployee]
  );
  const empProjects = useMemo(() => 
    (projects || []).filter(p => p.assignedTo === currentEmployee?.uid),
    [projects, currentEmployee]
  );
  const empFeedbacks = useMemo(() => 
    (feedbacks || []).filter(f => f.userId === currentEmployee?.uid),
    [feedbacks, currentEmployee]
  );
  const empAttendance = useMemo(() => 
    (attendanceList || []).filter(a => a.userId === currentEmployee?.uid),
    [attendanceList, currentEmployee]
  );
  const empLogs = useMemo(() => 
    (dailyUpdates || []).filter(l => l.userId === currentEmployee?.uid),
    [dailyUpdates, currentEmployee]
  );

  // Holistic invisible guidance data
  const empHolistic = useMemo(() => {
    if (!currentEmployee) return [];
    return (holisticContributions || []).filter(h => 
      h.userId === currentEmployee.uid || 
      (h.employeeId && h.employeeId.toUpperCase() === currentEmployee.employeeId?.toUpperCase()) ||
      (h.employeeName && h.employeeName.trim().toLowerCase() === currentEmployee.fullName?.trim().toLowerCase())
    );
  }, [holisticContributions, currentEmployee]);

  const empHolisticMetrics = useMemo(() => {
    return calculateHolisticGuidanceMetrics(empHolistic);
  }, [empHolistic]);

  if (!currentEmployee) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800">
        <p className="text-xs text-slate-500">No employee selected or available.</p>
      </div>
    );
  }

  const metrics = calculateTrainerMetrics(empClasses, empTasks, empProjects, empFeedbacks, empAttendance, 90, empLogs);
  const overallScore = computeOverallScore(metrics, performanceWeights);
  const perfCategory = getPerformanceCategory(overallScore);

  // Individual workload telemetry
  const individualTelemetry = useMemo(() => {
    let totalHoursLogged = 0;
    let totalOvertimeHours = 0;
    let totalPaperHours = 0;
    let totalInServiceHours = 0;
    let severeBurnoutDays = 0;
    const distinctDates = new Set<string>();

    empLogs.forEach(log => {
      if (log.date) distinctDates.add(log.date);
      const logged = Number(log.hoursLogged) || 6;
      totalHoursLogged += logged;
      totalOvertimeHours += Number(log.extraHoursWorked) || Math.max(0, logged - 6);
      totalPaperHours += Number(log.paperEvaluationHours) || 0;
      totalInServiceHours += Number(log.inServiceHours) || 0;
      if (log.burnoutRiskLevel === 'High' || log.burnoutRiskLevel === 'Severe') {
        severeBurnoutDays++;
      }
    });

    const activeDays = Math.max(1, distinctDates.size || empLogs.length || 1);
    const avgDailyHours = Number((totalHoursLogged / activeDays).toFixed(1));
    const extraHoursTotal = Number((totalOvertimeHours + totalPaperHours + totalInServiceHours + (empHolisticMetrics.totalHours || 0)).toFixed(1));

    return {
      activeDays,
      totalHoursLogged: Number(totalHoursLogged.toFixed(1)),
      avgDailyHours,
      totalOvertimeHours: Number(totalOvertimeHours.toFixed(1)),
      totalAdditionalDutiesHours: Number((totalPaperHours + totalInServiceHours).toFixed(1)),
      extraHoursTotal,
      severeBurnoutDays,
      peerHours: empHolisticMetrics.totalHours,
      peerSessions: empHolisticMetrics.totalSessions,
      classesCompleted: empClasses.length,
      tasksCompleted: empTasks.filter(t => t.status === 'Completed').length,
      totalTasks: empTasks.length,
      activeProjects: empProjects.filter(p => p.status !== 'Completed').length,
    };
  }, [empLogs, empHolisticMetrics, empClasses, empTasks, empProjects]);

  const handleSaveFeedback = async () => {
    if (!acknowledgingItem) return;
    try {
      setIsSavingFeedback(true);
      await updateHolisticContribution(acknowledgingItem.id, {
        acknowledgedByManager: true,
        managerFeedbackNotes: managerFeedbackInput.trim() || 'Reviewed and acknowledged by Manager.',
      });
      addToast({
        id: `ack-${Date.now()}`,
        title: 'Contribution Acknowledged',
        message: `Feedback recorded for ${currentEmployee.fullName}'s contribution.`,
        type: 'success',
        category: 'performance',
      });
      setAcknowledgingItem(null);
      setManagerFeedbackInput('');
    } catch (err: any) {
      addToast({
        id: `ack-err-${Date.now()}`,
        title: 'Update Failed',
        message: err.message || 'Could not record manager feedback.',
        type: 'error',
        category: 'system',
      });
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const currentEmpIndex = allTrainers.findIndex(t => t.uid === currentEmployee.uid);
  const handlePrevEmployee = () => {
    if (allTrainers.length <= 1) return;
    const prevIdx = (currentEmpIndex - 1 + allTrainers.length) % allTrainers.length;
    onSelectEmployee(allTrainers[prevIdx].uid);
  };
  const handleNextEmployee = () => {
    if (allTrainers.length <= 1) return;
    const nextIdx = (currentEmpIndex + 1) % allTrainers.length;
    onSelectEmployee(allTrainers[nextIdx].uid);
  };

  // Circular gauge math
  const scoreGradientId = overallScore >= 85 ? 'scoreGradEmerald' : overallScore >= 70 ? 'scoreGradSky' : 'scoreGradAmber';
  const gaugeCircumference = 2 * Math.PI * 45; // ~282.74
  const gaugeDashoffset = gaugeCircumference - (Math.min(100, Math.max(0, overallScore)) / 100) * gaugeCircumference;

  return (
    <PermissionGuard
      trainer={currentEmployee}
      manager={userProfile}
      fallbackTrainer={allTrainers[0]}
      onSelectFallbackTrainer={onSelectEmployee}
    >
      <div className="space-y-6 pb-12">
        {/* Employee Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-slate-50/60 to-white p-4.5 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-600 to-indigo-700 font-extrabold text-white text-base shadow-sm ring-2 ring-sky-200/80 dark:ring-sky-900">
              {currentEmployee.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-2xs" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white">
                {currentEmployee.fullName}
              </h1>
              <span className="inline-flex items-center rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-950/50 dark:border-sky-800 dark:text-sky-300">
                {currentEmployee.employeeId}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{currentEmployee.designation}</span> • {currentEmployee.subject}
            </p>
          </div>
        </div>

        {/* Switch Employee Control with Quick Arrows */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <button
            type="button"
            onClick={handlePrevEmployee}
            title="Previous Employee"
            disabled={allTrainers.length <= 1}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 transition-all dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="relative flex items-center">
            <Users className="absolute left-2.5 h-3.5 w-3.5 text-sky-600 dark:text-sky-400 pointer-events-none" />
            <select
              value={currentEmployee.uid}
              onChange={(e) => onSelectEmployee(e.target.value)}
              className="rounded-lg border border-transparent bg-slate-50 hover:bg-slate-100 pl-8 pr-7 py-1.5 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:bg-slate-700/60 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {allTrainers.map(t => (
                <option key={t.uid} value={t.uid}>
                  {t.fullName} ({t.employeeId} - {t.subject})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleNextEmployee}
            title="Next Employee"
            disabled={allTrainers.length <= 1}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 transition-all dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 360° Scorecard Hero with Individual Workload & Cadence */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Overall Performance Score with Radial Progress Ring */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-3 text-center border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 dark:text-slate-500">
              Individual Performance Index
            </span>
            
            <div className="relative flex h-36 w-36 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 110 110">
                <defs>
                  <linearGradient id="scoreGradEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="scoreGradSky" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient id="scoreGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
                {/* Background track */}
                <circle
                  cx="55"
                  cy="55"
                  r="45"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Animated Score Progress Arc */}
                <circle
                  cx="55"
                  cy="55"
                  r="45"
                  stroke={`url(#${scoreGradientId})`}
                  strokeWidth="8"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={gaugeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {overallScore}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  out of 100
                </span>
              </div>
            </div>

            <div className="mt-3">
              <StatusBadge type="performance" value={perfCategory} />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {empLogs.length === 0 ? 'No daily work logs recorded yet' : `Calculated across ${empLogs.length} work logs (${individualTelemetry.activeDays} distinct days)`}
              </p>
            </div>
          </div>

          {/* Individual Workload & Cadence Telemetry */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Individual Delivery & Workload Cadence
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Benchmark: <strong className="text-slate-700 dark:text-slate-300">6.0 hrs/day shift</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Daily Average */}
              <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white p-3 dark:border-sky-950 dark:from-sky-950/40 dark:to-slate-900">
                <div className="flex items-center justify-between text-sky-700 dark:text-sky-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Daily Avg Work</span>
                  <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                </div>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
                  {individualTelemetry.avgDailyHours} hrs
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Across {individualTelemetry.activeDays} active days ({individualTelemetry.totalHoursLogged}h total)
                </span>
              </div>

              {/* Extra Hours & Overtime */}
              <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-3 dark:border-amber-950 dark:from-amber-950/40 dark:to-slate-900">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Extra Effort</span>
                  <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-xl font-black text-amber-950 dark:text-amber-200 mt-1 block">
                  +{individualTelemetry.extraHoursTotal} hrs
                </span>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 block mt-0.5">
                  Overtime & additional duties
                </span>
              </div>

              {/* Class Sessions Delivered */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/70">
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Classes Delivered</span>
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 block">
                  {individualTelemetry.classesCompleted} sessions
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Delivery Rate: {metrics.classDeliveryScore}%
                </span>
              </div>

              {/* Tasks Execution */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/70">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Tasks Resolved</span>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 block">
                  {individualTelemetry.tasksCompleted} / {individualTelemetry.totalTasks}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Task Score: {metrics.taskCompletionScore}%
                </span>
              </div>

              {/* Work Health / Burnout Status */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-800/70">
                <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Work Load Health</span>
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <span className={`text-sm font-extrabold mt-1 block ${
                  individualTelemetry.avgDailyHours > 8 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                }`}>
                  {individualTelemetry.avgDailyHours > 8.5 ? 'Heavy Load' : individualTelemetry.avgDailyHours >= 6 ? 'Steady Output' : 'Light Load'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  {individualTelemetry.severeBurnoutDays > 0 ? `${individualTelemetry.severeBurnoutDays} high load days` : 'Optimal load balance'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {[
          { id: 'overview', label: 'Workload & Effort Distribution' },
          { id: 'classes', label: `Classes (${empClasses.length})` },
          { id: 'tasks', label: `Tasks (${empTasks.length})` },
          { id: 'projects', label: `Projects (${empProjects.length})` },
          { id: 'logs', label: `Daily Logs (${empLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`border-b-2 px-4 py-3 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-sky-600 text-sky-700 dark:border-sky-400 dark:text-sky-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview Breakdown */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Enhanced Pie Graph with Mode Boxes & Timeframe Basis Selector */}
          <WorkEffortPieChart 
            dailyUpdates={empLogs}
            holisticContributions={empHolistic}
            employeeName={currentEmployee.fullName}
            title={`${currentEmployee.fullName}'s Work & Contribution Distribution`}
            subtitle="Explore exact hours and percentages by clicking on Total Work Split, Extra & Overtime, or Additional Duties on a Per Day, Per Week, Per Month, or All-Time basis"
            defaultTimeframe="day"
            defaultMode="all"
          />
        </div>
      )}

      {/* Tab 2: Classes */}
      {activeTab === 'classes' && (
        <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-sky-100 bg-sky-50/80 text-sky-950 font-bold">
              <tr>
                <th className="px-4 py-3">Class Name</th>
                <th className="px-4 py-3">Batch & Subject</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {empClasses.map(cls => (
                <tr key={cls.id} className="hover:bg-sky-50/40">
                  <td className="px-4 py-3 font-bold text-slate-900">{cls.className}</td>
                  <td className="px-4 py-3 text-slate-600">{cls.batch} • {cls.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{cls.date} ({cls.startTime} - {cls.endTime})</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{cls.durationMinutes} min</td>
                  <td className="px-4 py-3 text-slate-600">{cls.deliveryMode}</td>
                  <td className="px-4 py-3"><StatusBadge type="classStatus" value={cls.status} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {empTasks.length === 0 ? (
            <div className="rounded-2xl border border-sky-100 bg-white p-8 text-center text-xs text-slate-500">
              No tasks assigned yet to this instructor.
            </div>
          ) : (
            empTasks.map(task => (
              <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-sky-100 bg-white p-4 shadow-xs gap-3 hover:border-sky-200 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge type="taskPriority" value={task.priority} size="sm" />
                    <StatusBadge type="taskStatus" value={task.status} size="sm" />
                    <span className="font-bold text-xs text-slate-900">{task.taskName}</span>
                  </div>
                  <p className="text-xs text-slate-500">{task.description}</p>
                  <span className="text-[11px] text-slate-400">📅 Due Date: <strong className="text-slate-700">{task.dueDate}</strong></span>
                </div>

                <div className="w-40 text-right">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-sky-700 font-bold">{task.completionPercentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-sky-100 overflow-hidden">
                    <div className="h-full rounded-full bg-sky-600" style={{ width: `${task.completionPercentage}%` }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Projects */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {empProjects.length === 0 ? (
            <div className="rounded-2xl border border-sky-100 bg-white p-8 text-center">
              <FolderGit2 className="mx-auto h-8 w-8 text-slate-400" />
              <h4 className="mt-2 text-xs font-bold text-slate-800">No active projects assigned or undertaken</h4>
              <p className="mt-1 text-2xs text-slate-500">Milestone progress evaluates to 0% when no project is undertaken.</p>
            </div>
          ) : (
            empProjects.map(proj => {
              const milestones = proj.milestones || [];
              return (
                <div key={proj.id} className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{proj.projectName}</h4>
                        <StatusBadge type="projectStatus" value={proj.currentStatus} size="sm" />
                        <span className="rounded-md bg-sky-50 px-2 py-0.5 text-2xs font-bold text-sky-800 border border-sky-200">
                          Active Stage: {proj.currentStage}
                        </span>
                        {proj.isSelfAssigned && (
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 text-2xs font-semibold text-purple-700 border border-purple-200">
                            Self-Assigned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{proj.projectDescription}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-2xs text-slate-400 pt-1">
                        <span>📅 Start: {proj.startDate}</span>
                        <span>🎯 Target: {proj.expectedCompletionDate}</span>
                        {proj.updatedAt && (
                          <span className="text-slate-500">🕒 Last Updated: {new Date(proj.updatedAt).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Deliverables & Repo Link */}
                      {(proj.deliverables || proj.repositoryUrl) && (
                        <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs">
                          {proj.deliverables && (
                            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-2xs text-slate-700">
                              📦 Deliverables: <strong>{proj.deliverables}</strong>
                            </span>
                          )}
                          {proj.repositoryUrl && (
                            <a
                              href={proj.repositoryUrl.startsWith('http') ? proj.repositoryUrl : `https://${proj.repositoryUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2.5 py-1 text-2xs font-semibold text-sky-800 border border-sky-200 hover:bg-sky-100"
                            >
                              <GitBranch className="h-3 w-3 text-sky-600" />
                              <span>Code Repo</span>
                              <ExternalLink className="h-2.5 w-2.5 text-sky-600" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Instructor Remarks */}
                      {proj.remarks && (
                        <div className="mt-2 rounded-lg bg-sky-50/60 p-2.5 border border-sky-100 text-xs text-sky-950">
                          <span className="font-bold text-2xs text-sky-800 block mb-0.5">Instructor Implementation Notes:</span>
                          <p className="italic text-slate-700 text-2xs">"{proj.remarks}"</p>
                        </div>
                      )}
                    </div>

                    <div className="text-right sm:min-w-[130px]">
                      <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block">Milestone Progress</span>
                      <p className="text-2xl font-extrabold text-sky-600">{proj.overallCompletionPercentage}%</p>
                      <div className="mt-1 h-2 w-full rounded-full bg-sky-100 overflow-hidden">
                        <div className="h-full rounded-full bg-sky-600" style={{ width: `${proj.overallCompletionPercentage}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* 9-Stage Stepper Progression */}
                  <div className="mt-3 pt-3 border-t border-sky-50">
                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
                      {PROJECT_STAGES.map((st, idx) => {
                        const m = milestones.find(item => item.stage === st || (item as any).stageName === st);
                        const isDone = m?.status === 'Completed' || (m?.progress || 0) === 100;
                        const isCurrent = m?.status === 'In Progress' || proj.currentStage === st;

                        return (
                          <div
                            key={st}
                            className={`rounded-lg border p-1.5 text-center text-2xs ${
                              isDone
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 font-semibold'
                                : isCurrent
                                ? 'border-sky-400 bg-sky-100 text-sky-950 font-bold ring-1 ring-sky-400'
                                : 'border-sky-100 bg-sky-50/30 text-slate-400'
                            }`}
                          >
                            <span className="block opacity-70">0{idx + 1}</span>
                            <span className="block truncate font-medium">{st}</span>
                            <span className="block text-[10px] mt-0.5">{isDone ? '100%' : isCurrent ? `${m?.progress || 50}%` : '0%'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 5: Daily Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          {empLogs.map(log => {
            const cCount = log.classesCount !== undefined ? log.classesCount : (parseInt(log.classesHandled) || 0);
            const pCount = log.practiceSessionsCount !== undefined ? log.practiceSessionsCount : 0;
            const totalSess = log.totalSessionsCount !== undefined ? log.totalSessionsCount : (cCount + pCount);
            return (
              <div key={log.id} className="rounded-2xl border border-sky-100 bg-white p-4 text-xs">
                <div className="flex items-center justify-between border-b border-sky-50 pb-2">
                  <span className="font-bold text-slate-900">📅 {log.date} ({log.hoursLogged || 8} hours logged)</span>
                  <span className="rounded-md bg-sky-50 px-2 py-0.5 font-bold text-sky-800 border border-sky-200">{totalSess} / 8 Daily Sessions</span>
                </div>
                <div className="mt-2 space-y-1.5 text-slate-600">
                  <p><strong>Sessions:</strong> {cCount} Classes, {pCount} Practice Sessions ({totalSess * 50} mins)</p>
                  <p><strong>Tasks Worked On:</strong> {log.tasksWorkedOn}</p>
                  {log.additionalResponsibilities && log.additionalResponsibilities !== 'None' && (
                    <p className="text-amber-800"><strong>Additional Responsibilities:</strong> {log.additionalResponsibilities}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  </PermissionGuard>
  );
};
