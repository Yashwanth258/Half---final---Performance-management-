import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Award, 
  Calendar, 
  CheckSquare, 
  Star, 
  ChevronRight,
  Download,
  Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { StatusBadge } from '../common/StatusBadge';
import { calculateTrainerMetrics, computeOverallScore, getPerformanceCategory } from '../../lib/performanceEngine';
import { UserProfile } from '../../types';

interface TeamPerformanceViewProps {
  onSelectEmployee: (empId: string) => void;
  onNavigate: (view: string) => void;
}

export const TeamPerformanceView: React.FC<TeamPerformanceViewProps> = ({ onSelectEmployee, onNavigate }) => {
  const { 
    allTrainers = [], 
    classes = [], 
    tasks = [], 
    projects = [], 
    feedbacks = [], 
    attendanceList = [], 
    dailyUpdates = [],
    performanceWeights, 
    teams = [] 
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'score' | 'name' | 'classes' | 'tasks' | 'contributions'>('score');
  const [sortAsc, setSortAsc] = useState(false);

  // Compute metrics for each trainer
  const teamMetrics = (allTrainers || []).map(trainer => {
    const tClasses = (classes || []).filter(c => c.userId === trainer.uid);
    const tTasks = (tasks || []).filter(t => t.assignedTo === trainer.uid);
    const tProjects = (projects || []).filter(p => p.assignedTo === trainer.uid);
    const tFeedbacks = (feedbacks || []).filter(f => f.userId === trainer.uid);
    const tAttendance = (attendanceList || []).filter(a => a.userId === trainer.uid);
    const tLogs = (dailyUpdates || []).filter(l => l.userId === trainer.uid);

    const metrics = calculateTrainerMetrics(tClasses, tTasks, tProjects, tFeedbacks, tAttendance, 90, tLogs);
    const overallScore = computeOverallScore(metrics, performanceWeights);
    const category = getPerformanceCategory(overallScore);

    // Calculate workload status
    const activeTasksCount = (tTasks || []).filter(t => t.status !== 'Completed').length;
    const weeklyHoursEst = (tClasses || []).filter(c => c.status === 'Completed').reduce((sum, c) => sum + (c.durationMinutes || 0), 0) / 60;
    
    let workloadStatus: 'Overloaded' | 'Optimal' | 'Underutilized' = 'Optimal';
    if (activeTasksCount > 5 || weeklyHoursEst > 25) workloadStatus = 'Overloaded';
    else if (activeTasksCount < 2 && weeklyHoursEst < 8) workloadStatus = 'Underutilized';

    return {
      trainer,
      metrics,
      overallScore,
      category,
      workloadStatus,
      classesCount: tClasses.length,
      tasksCount: tTasks.length,
      activeTasksCount,
    };
  });

  // Filter
  const filteredList = teamMetrics.filter(item => {
    if (teamFilter !== 'ALL' && item.trainer.teamId !== teamFilter) return false;
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        item.trainer.fullName.toLowerCase().includes(q) ||
        item.trainer.employeeId.toLowerCase().includes(q) ||
        item.trainer.subject.toLowerCase().includes(q) ||
        (item.trainer.teamName && item.trainer.teamName.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Sort
  filteredList.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'score') comparison = a.overallScore - b.overallScore;
    else if (sortField === 'name') comparison = a.trainer.fullName.localeCompare(b.trainer.fullName);
    else if (sortField === 'classes') comparison = a.metrics.classDeliveryScore - b.metrics.classDeliveryScore;
    else if (sortField === 'tasks') comparison = a.metrics.taskCompletionScore - b.metrics.taskCompletionScore;
    else if (sortField === 'projects') comparison = a.metrics.projectProgressScore - b.metrics.projectProgressScore;
    else if (sortField === 'contributions') comparison = a.metrics.additionalContributionScore - b.metrics.additionalContributionScore;
    return sortAsc ? comparison : -comparison;
  });

  const handleExportCSV = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Team',
      'Designation',
      'Overall Score (%)',
      'Delivery Sessions Delivered',
      'Tasks Completed',
      'Tasks Assigned',
      'Project Progress (%)',
      'Workload Status'
    ];

    const rows = filteredList.map(item => [
      item.trainer.employeeId,
      item.trainer.fullName,
      item.trainer.teamName || 'Engineering',
      item.trainer.designation,
      item.overallScore,
      item.metrics.classesCompleted,
      item.metrics.tasksCompleted,
      item.metrics.totalTasks,
      item.metrics.projectProgressScore,
      item.workloadStatus,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Team_Performance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Team Performance Roster (BRD Section 14)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Centralized organizational leaderboard with live Firestore synchronized metrics & 360° drill-down
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-purple-500 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by instructor name, employee ID, specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs focus:bg-white dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="ALL">All Departments & Teams</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="ALL">All Performance Statuses</option>
          <option value="Excellent">Excellent (90-100)</option>
          <option value="Good">Good (75-89)</option>
          <option value="Needs Improvement">Needs Improvement (60-74)</option>
          <option value="Critical">Critical (&lt;60)</option>
        </select>
      </div>

      {/* Team Roster Master Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
              <tr>
                <th
                  onClick={() => {
                    setSortField('name');
                    setSortAsc(!sortAsc);
                  }}
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Instructor / Employee</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Team / Specialization</th>
                <th
                  onClick={() => {
                    setSortField('score');
                    setSortAsc(!sortAsc);
                  }}
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Composite Score</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('classes');
                    setSortAsc(!sortAsc);
                  }}
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>1. Delivery ({performanceWeights.classDelivery}%)</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('tasks');
                    setSortAsc(!sortAsc);
                  }}
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>2. Tasks ({performanceWeights.taskCompletion}%)</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('projects');
                    setSortAsc(!sortAsc);
                  }}
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>3. Projects ({performanceWeights.projectProgress}%)</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('contributions');
                    setSortAsc(!sortAsc);
                  }}
                  className="px-4 py-3.5 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    <span>4. Extra ({performanceWeights.additionalContribution}%)</span>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Workload</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    No team members found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredList.map(({ trainer, overallScore, category, metrics, workloadStatus }) => (
                  <tr
                    key={trainer.uid}
                    className="hover:bg-purple-50/30 transition-colors dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          {trainer.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {trainer.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {trainer.employeeId} • {trainer.designation}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {trainer.teamName || 'Engineering'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {trainer.subject} • {trainer.location}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-base font-extrabold text-slate-900 dark:text-white">
                        {overallScore}%
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {metrics.classDeliveryScore}% ({metrics.classesCompleted} sessions)
                    </td>

                    <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {metrics.taskCompletionScore}% ({metrics.tasksCompleted}/{metrics.totalTasks})
                    </td>

                    <td className="px-4 py-3.5 font-medium text-sky-700 dark:text-sky-400">
                      {metrics.projectProgressScore}% ({metrics.activeProjectsCount} active)
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-purple-600">
                      {metrics.additionalContributionScore}%
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          workloadStatus === 'Optimal'
                            ? 'bg-emerald-50 text-emerald-700'
                            : workloadStatus === 'Overloaded'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {workloadStatus}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectEmployee(trainer.uid);
                          onNavigate('individual-performance');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-purple-700 shadow-2xs hover:bg-purple-50 dark:border-slate-700 dark:bg-slate-800 dark:text-purple-400"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>360° Profile</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
