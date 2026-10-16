import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ArrowLeftRight, 
  Award, 
  Star, 
  Calendar, 
  CheckSquare, 
  Download,
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { useData } from '../../context/DataContext';
import { calculateTrainerMetrics, computeOverallScore, getPerformanceCategory } from '../../lib/performanceEngine';
import { StatusBadge } from '../common/StatusBadge';

export const TeamComparisonView: React.FC = () => {
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

  // Selected trainer IDs for comparison (default first 4)
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<string[]>(
    (allTrainers || []).slice(0, 4).map(t => t.uid)
  );

  useEffect(() => {
    setSelectedTrainerIds(prev => {
      const valid = prev.filter(id => allTrainers.some(t => t.uid === id));
      if (valid.length > 0) return valid;
      return (allTrainers || []).slice(0, 4).map(t => t.uid);
    });
  }, [allTrainers]);

  const toggleTrainer = (uid: string) => {
    if (selectedTrainerIds.includes(uid)) {
      if (selectedTrainerIds.length > 1) {
        setSelectedTrainerIds(selectedTrainerIds.filter(id => id !== uid));
      }
    } else {
      setSelectedTrainerIds([...selectedTrainerIds, uid]);
    }
  };

  const comparedTrainers = (allTrainers || [])
    .filter(t => selectedTrainerIds.includes(t.uid))
    .map(trainer => {
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
        classesHeld: metrics.classesCompleted,
        tasksCompleted: metrics.tasksCompleted,
      };
    });

  // Chart comparison data
  const chartData = comparedTrainers.map(item => ({
    name: item.trainer.fullName.split(' ')[0],
    Score: item.overallScore,
    'Work Delivery': item.metrics.classDeliveryScore,
    'Task Completion': item.metrics.taskCompletionScore,
    'Project Milestones': item.metrics.projectProgressScore,
    'Extra Contributions': item.metrics.additionalContributionScore,
  }));

  if (allTrainers.length === 0) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Multi-Trainer Comparative Matrix
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Side-by-side benchmarking across 4 performance pillars
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Mapped Trainees Available</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            When trainees are registered and mapped to your manager profile, you will be able to perform side-by-side comparative benchmarking here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Multi-Instructor Comparative Matrix
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Side-by-side benchmarking across 4 performance pillars to identify top performers and coaching needs
          </p>
        </div>
      </div>

      {/* Instructor Select Pills */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
          Select Instructors to Compare (Click to toggle):
        </span>
        <div className="flex flex-wrap gap-2">
          {allTrainers.map(t => {
            const isSelected = selectedTrainerIds.includes(t.uid);
            return (
              <button
                key={t.uid}
                type="button"
                onClick={() => toggleTrainer(t.uid)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {t.fullName} ({t.employeeId})
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparative Group Bar Chart */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
          Comparative Pillar Scores Comparison (%)
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="Score" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Overall Composite %" />
              <Bar dataKey="Work Delivery" fill="#2563eb" radius={[4, 4, 0, 0]} name="Work & Delivery %" />
              <Bar dataKey="Task Completion" fill="#10b981" radius={[4, 4, 0, 0]} name="Task Completion %" />
              <Bar dataKey="Project Milestones" fill="#0284c7" radius={[4, 4, 0, 0]} name="Project Milestones %" />
              <Bar dataKey="Extra Contributions" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Extra Contributions %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-Side Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/50">
              <tr>
                <th className="px-4 py-3.5">Instructor Profile</th>
                <th className="px-4 py-3.5">Overall Score</th>
                <th className="px-4 py-3.5">Performance Category</th>
                <th className="px-4 py-3.5">1. Delivery ({performanceWeights.classDelivery}%)</th>
                <th className="px-4 py-3.5">2. Tasks ({performanceWeights.taskCompletion}%)</th>
                <th className="px-4 py-3.5">3. Projects ({performanceWeights.projectProgress}%)</th>
                <th className="px-4 py-3.5">4. Contributions ({performanceWeights.additionalContribution}%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {comparedTrainers.map(({ trainer, overallScore, category, metrics }) => (
                <tr key={trainer.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {trainer.fullName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {trainer.employeeId} • {trainer.subject}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-base font-extrabold text-purple-700 dark:text-purple-400">
                      {overallScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge type="performance" value={category} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 font-semibold">
                    {metrics.classDeliveryScore}% ({metrics.classesCompleted} sessions)
                  </td>
                  <td className="px-4 py-3.5 font-semibold">
                    {metrics.taskCompletionScore}% ({metrics.tasksCompleted} tasks)
                  </td>
                  <td className="px-4 py-3.5 font-semibold">
                    {metrics.projectProgressScore}%
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-purple-600">
                    {metrics.additionalContributionScore}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
