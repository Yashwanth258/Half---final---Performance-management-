import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Award, 
  Calendar, 
  Plus, 
  TrendingUp, 
  Flame,
  UserCheck,
  MapPin,
  ChevronDown,
  Layers,
  ChevronRight,
  Sparkles,
  ArrowRight,
  GitCompare,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Cell 
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { KpiCard } from '../common/KpiCard';
import { StatusBadge } from '../common/StatusBadge';
import { getPerformanceCategory } from '../../lib/performanceEngine';
import { calculateTrainerMetrics, computeOverallScore } from '../../lib/performanceEngine';
import { Tooltip as UiTooltip } from '../common/Tooltip';
import { TrainerBurnoutWeeklyView } from './TrainerBurnoutWeeklyView';
import { TrainerSearchAutocomplete } from './TrainerSearchAutocomplete';

interface ManagerDashboardProps {
  onNavigate: (view: string) => void;
  onSelectEmployee?: (empId: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onNavigate, onSelectEmployee }) => {
  const { userProfile } = useAuth();
  const { 
    allTrainers = [], 
    classes = [], 
    tasks = [], 
    projects = [], 
    dailyUpdates = [],
    feedbacks = [], 
    attendanceList = [],
    managerChangeRequests = [],
    performanceWeights,
    selectedTraineeId,
    setSelectedTraineeId,
  } = useData();

  const pendingChangeRequests = (managerChangeRequests || []).filter(r => r.status === 'PENDING');

  // Handler when manager selects a trainee from any component in dashboard
  const handleSelectTrainer = (id: string) => {
    setSelectedTraineeId(id);
    if (onSelectEmployee) {
      onSelectEmployee(id);
    }
  };

  // Calculate scores for all team members
  const trainerPerformanceList = (allTrainers || []).map(trainer => {
    const tClasses = (classes || []).filter(c => c.userId === trainer.uid);
    const tTasks = (tasks || []).filter(t => t.assignedTo === trainer.uid);
    const tProjects = (projects || []).filter(p => p.assignedTo === trainer.uid);
    const tFeedbacks = (feedbacks || []).filter(f => f.userId === trainer.uid);
    const tAttendance = (attendanceList || []).filter(a => a.userId === trainer.uid);
    const tLogs = (dailyUpdates || []).filter(l => l.userId === trainer.uid);

    const metrics = calculateTrainerMetrics(tClasses, tTasks, tProjects, tFeedbacks, tAttendance, 90, tLogs);
    const overallScore = computeOverallScore(metrics, performanceWeights);
    const category = getPerformanceCategory(overallScore);

    return {
      trainer,
      metrics,
      overallScore,
      category,
      tClasses,
      tTasks,
      tProjects,
    };
  });

  // KPI Calculations
  const totalTeamMembers = (allTrainers || []).length;
  const activeEmployees = (allTrainers || []).filter(t => t.isActive).length;

  const excellentCount = trainerPerformanceList.filter(t => t.category === 'Excellent').length;
  const goodCount = trainerPerformanceList.filter(t => t.category === 'Good').length;
  const needsImprovementCount = trainerPerformanceList.filter(t => t.category === 'Needs Improvement').length;
  const criticalCount = trainerPerformanceList.filter(t => t.category === 'Critical').length;

  const totalTasksCompleted = (tasks || []).filter(t => t.status === 'Completed').length;
  const totalTasksAssigned = (tasks || []).length;
  const taskCompletionRate = totalTasksAssigned > 0 ? Math.round((totalTasksCompleted / totalTasksAssigned) * 100) : 0;
  
  const avgScore = totalTeamMembers > 0
    ? Number((trainerPerformanceList.reduce((acc, t) => acc + t.overallScore, 0) / totalTeamMembers).toFixed(1))
    : 0;

  // Selected trainer profile
  const currentTrainer = (allTrainers || []).find(t => t.uid === selectedTraineeId) || allTrainers[0];

  // Distribution chart data
  const distributionData = [
    { name: 'Excellent (90-100)', count: excellentCount, color: '#10b981' },
    { name: 'Good (75-89)', count: goodCount, color: '#0284c7' },
    { name: 'Needs Impr. (60-74)', count: needsImprovementCount, color: '#f59e0b' },
    { name: 'Critical (<60)', count: criticalCount, color: '#f43f5e' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Executive Welcome Banner */}
      <div className="rounded-2xl border border-sky-200 bg-linear-to-r from-sky-600 via-sky-700 to-blue-800 p-6 text-white shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-sky-100 backdrop-blur-xs mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Executive Manager Oversight Workspace
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Team Performance & Workload Center
            </h1>
            <p className="mt-1 text-sm text-sky-100/90 max-w-2xl">
              {userProfile?.fullName || 'Sarah Jenkins'} • {userProfile?.designation || 'VP of Technical Enablement & Training'}
            </p>
          </div>

          {/* Quick Manager Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <UiTooltip content="Add upcoming training batch and calendar session" placement="bottom">
              <button
                type="button"
                onClick={() => onNavigate('class-tracking')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/30 transition-colors"
                aria-label="Schedule Class"
              >
                <Calendar className="h-4 w-4" />
                <span>Schedule Class</span>
              </button>
            </UiTooltip>
            <UiTooltip content="Export comprehensive Excel workbooks (.xlsx) for individual instructors and full team" placement="bottom">
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/30 transition-colors cursor-pointer"
                aria-label="Reports & Excel Export Hub"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Reports & Excel Hub</span>
              </button>
            </UiTooltip>
          </div>
        </div>
      </div>

      {/* Pending Manager Change Requests Alert Banner */}
      {pendingChangeRequests.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800 shrink-0 border border-amber-300">
              <GitCompare className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-extrabold text-amber-950">
                  Manager Change Requests Pending Review
                </h3>
                <span className="rounded-full bg-amber-200 text-amber-900 text-[10px] font-black px-2.5 py-0.5 border border-amber-300">
                  {pendingChangeRequests.length} Pending
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                {pendingChangeRequests.length === 1
                  ? `${pendingChangeRequests[0].instructorName} (${pendingChangeRequests[0].instructorEmployeeId}) has requested a reporting manager transfer to ${pendingChangeRequests[0].requestedManagerName}.`
                  : `${pendingChangeRequests.length} instructors have requested manager transfers awaiting your review and approval.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('manager-change-requests')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <span>Review Change Requests</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Mapped Trainees Status Notice if empty */}
      {allTrainers.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-slate-800 shadow-xs flex items-start gap-3.5">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-900">
              No Trainees Currently Mapped to Your Workspace
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              When trainees sign up or update their profile with you as their <strong>Reporting Manager</strong> ({userProfile?.fullName || 'Manager'} • Employee ID: {userProfile?.employeeId || userProfile?.uid}), their workload, scorecard, daily logs, and metrics will appear in your workspace.
            </p>
          </div>
        </div>
      )}

      {/* 4-Box Overview Grid: Team Name, Assigned Trainee Focus, Deployment Location, Task Completion Rate */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Box 1: Team Organization / Team Name */}
        <KpiCard
          title="Team Name & Organization"
          value={userProfile?.teamName || 'Engineering Talent Org'}
          subtitle={`${activeEmployees} Active / ${totalTeamMembers} Total Registered`}
          icon={Users}
          variant="primary"
          onClick={() => onNavigate('team-performance')}
        />

        {/* Box 2: Assigned Trainee Focus (Searchable Autocomplete) */}
        <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-sky-600 block">
                Assigned Trainee Focus
              </span>
              <span className="text-sm font-extrabold text-slate-800 block mt-0.5 truncate max-w-[150px]">
                {currentTrainer?.fullName || 'No Trainees Mapped'}
              </span>
            </div>
            <div className="rounded-xl bg-sky-50 p-2 text-sky-600 border border-sky-100">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2">
            {allTrainers && allTrainers.length > 0 ? (
              <TrainerSearchAutocomplete
                trainers={allTrainers}
                selectedTrainerId={selectedTraineeId}
                onSelectTrainer={handleSelectTrainer}
                compact={true}
                placeholder="Type 2+ letters (e.g. 'es', 'pri')..."
              />
            ) : (
              <div className="py-2 text-xs text-slate-400 italic">
                No trainees mapped yet.
              </div>
            )}
          </div>
          <span className="text-2xs text-slate-400 mt-1 block">
            {allTrainers && allTrainers.length > 0 ? 'Select to view daily work & burnout' : 'Trainees will appear when mapped'}
          </span>
        </div>

        {/* Box 3: Deployment Location (Next to Assigned Trainee Focus, Same Size) */}
        <KpiCard
          title="Deployment Location"
          value={currentTrainer?.location || 'Hyderabad Campus'}
          subtitle={`Campus & location for ${currentTrainer?.fullName || 'selected trainee'}`}
          icon={MapPin}
          variant="primary"
        />

        {/* Box 4: Team Average Score */}
        <KpiCard
          title="Team Average Score"
          value={`${avgScore.toFixed(1)}%`}
          subtitle={`${excellentCount + goodCount} in high performance tier`}
          icon={Award}
          progress={{ current: avgScore, max: 100, color: 'bg-emerald-600' }}
          onClick={() => onNavigate('team-performance')}
        />
      </div>

      {/* Main Dedicated Trainer Work Hours & Weekly Burnout Analysis Section */}
      <TrainerBurnoutWeeklyView
        trainers={allTrainers}
        dailyUpdates={dailyUpdates}
        selectedTrainerId={selectedTraineeId}
        onSelectTrainer={handleSelectTrainer}
      />

      {/* Bottom Section: Performance Tier Distribution & Power BI Data Hub */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Score and Performance Distribution */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-sky-50 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Team Performance & Score Distribution
                </h3>
                <p className="text-xs text-slate-500">
                  Performance breakdown across Excellent (90-100), Good (75-89), Needs Improvement (60-74), and Critical (&lt;60)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('team-performance')}
                className="text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
              >
                View Full Scorecard →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-7 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0f2fe" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="md:col-span-5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5">
                  <span className="text-emerald-800 font-semibold block text-2xs">Excellent (90-100)</span>
                  <span className="text-base font-bold text-emerald-900">{excellentCount} Instructors</span>
                </div>
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-2.5">
                  <span className="text-sky-800 font-semibold block text-2xs">Good (75-89)</span>
                  <span className="text-base font-bold text-sky-900">{goodCount} Instructors</span>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-2.5">
                  <span className="text-amber-800 font-semibold block text-2xs">Needs Impr. (60-74)</span>
                  <span className="text-base font-bold text-amber-900">{needsImprovementCount} Instructors</span>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-2.5">
                  <span className="text-rose-800 font-semibold block text-2xs">Critical (&lt;60)</span>
                  <span className="text-base font-bold text-rose-900">{criticalCount} Instructors</span>
                </div>
              </div>
            </div>
          </div>

          {/* High Performance Highlight Card - Positioned below Team Performance & Score Distribution bar graph */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-sky-50/50 p-4.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-xs">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      High Performance Cohort (≥75% Overall Score)
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {Math.round(((excellentCount + goodCount) / Math.max(1, totalTeamMembers)) * 100)}% of Team
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    <strong>{excellentCount + goodCount} of {totalTeamMembers} trainees</strong> meet or exceed the organizational high-performance benchmark ({excellentCount} Excellent, {goodCount} Good).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('team-performance')}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors whitespace-nowrap"
              >
                <span>Inspect High Performers</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Manager Reports & Excel Export Action Card */}
        <div className="lg:col-span-4 rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50/70 via-white to-sky-50/50 p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Reports &amp; Excel Export Hub
              </h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-200">
                .xlsx
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Export verified individual instructor reports or full team multi-sheet workbooks (.xlsx) with daily logs, session counts, workload hours, leaves, and missing log tracking.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100/80 space-y-2">
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs shadow-emerald-600/20 transition-all w-full cursor-pointer"
              aria-label="Open Reports & Excel Hub"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Open Reports &amp; Excel Hub</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


