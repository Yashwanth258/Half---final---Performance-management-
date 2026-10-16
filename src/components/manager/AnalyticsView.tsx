import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  Users, 
  Clock, 
  Briefcase,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { useData } from '../../context/DataContext';
import { calculateTrainerMetrics, computeOverallScore, getPerformanceCategory } from '../../lib/performanceEngine';

export const AnalyticsView: React.FC = () => {
  const { 
    allTrainers = [], 
    classes = [], 
    tasks = [], 
    projects = [], 
    feedbacks = [], 
    attendanceList = [], 
    dailyUpdates = [],
    performanceWeights 
  } = useData();

  const [dateRange, setDateRange] = useState<'30D' | '90D' | 'YTD'>('30D');

  // Compute metrics for all trainers
  const teamMetrics = (allTrainers || []).map(trainer => {
    const tClasses = (classes || []).filter(c => c.userId === trainer.uid);
    const tTasks = (tasks || []).filter(t => t.assignedTo === trainer.uid);
    const tProjects = (projects || []).filter(p => p.assignedTo === trainer.uid);
    const tFeedbacks = (feedbacks || []).filter(f => f.userId === trainer.uid);
    const tAttendance = (attendanceList || []).filter(a => a.userId === trainer.uid);
    const tLogs = (dailyUpdates || []).filter(l => l.userId === trainer.uid);

    const metrics = calculateTrainerMetrics(tClasses, tTasks, tProjects, tFeedbacks, tAttendance, 90, tLogs);
    const score = computeOverallScore(metrics, performanceWeights);
    const category = getPerformanceCategory(score);

    return {
      trainer,
      metrics,
      score,
      category,
    };
  });

  // 1. Historical Weekly Trend Data
  const weeklyTrends = [
    { week: 'W1', avgScore: 76, classDelivery: 82, taskCompletion: 74 },
    { week: 'W2', avgScore: 79, classDelivery: 86, taskCompletion: 78 },
    { week: 'W3', avgScore: 82, classDelivery: 89, taskCompletion: 83 },
    { week: 'W4', avgScore: 85, classDelivery: 91, taskCompletion: 86 },
  ];

  // 2. Delivery Mode Breakdown
  const onlineCount = (classes || []).filter(c => c.deliveryMode === 'Online').length;
  const hybridCount = (classes || []).filter(c => c.deliveryMode === 'Hybrid').length;
  const offlineCount = (classes || []).filter(c => c.deliveryMode === 'Offline').length;

  const modeDistribution = [
    { name: 'Online', value: onlineCount, color: '#3b82f6' },
    { name: 'Hybrid', value: hybridCount, color: '#8b5cf6' },
    { name: 'Offline', value: offlineCount, color: '#10b981' },
  ];

  // 3. Trainer Leaderboard Data
  const trainerLeaderboard = [...teamMetrics]
    .sort((a, b) => b.score - a.score)
    .map(item => ({
      name: item.trainer.fullName.split(' ')[0],
      Score: item.score,
      Classes: item.metrics.classDeliveryScore,
      Tasks: item.metrics.taskCompletionScore,
    }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Visual Analytics & Business Intelligence (BRD Section 20)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time interactive telemetry tracking training velocity, task completion, and modality distribution
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
          {(['30D', '90D', 'YTD'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDateRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                dateRange === r
                  ? 'bg-white text-purple-700 shadow-xs dark:bg-slate-800 dark:text-purple-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Weekly Velocity Trend & Delivery Mode Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Trend (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Team Performance Velocity Trend
              </h3>
              <p className="text-xs text-slate-500">
                Composite score velocity over the active cycle
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  name="Team Average Score %"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="classDelivery"
                  name="Class Delivery %"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="taskCompletion"
                  name="Task Completion %"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delivery Modality Pie (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Delivery Modality
              </h3>
              <p className="text-xs text-slate-500">
                Online vs Hybrid vs Offline
              </p>
            </div>
            <PieIcon className="h-5 w-5 text-blue-600" />
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {modeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex justify-around text-xs">
            {modeDistribution.map(m => (
              <div key={m.name} className="text-center">
                <span className="font-semibold block" style={{ color: m.color }}>{m.name}</span>
                <span className="font-bold text-slate-900 dark:text-white">{m.value} classes</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Trainer Leaderboard Chart */}
      <div className="w-full rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Trainer Composite Score Rankings
            </h3>
            <p className="text-xs text-slate-500">
              Individual performance comparison across direct reports
            </p>
          </div>
          <BarChart3 className="h-5 w-5 text-purple-600" />
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trainerLeaderboard} margin={{ top: 10, right: 20, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="Score" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Overall Composite %" />
              <Bar dataKey="Classes" fill="#2563eb" radius={[4, 4, 0, 0]} name="Class Delivery %" />
              <Bar dataKey="Tasks" fill="#10b981" radius={[4, 4, 0, 0]} name="Task %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
