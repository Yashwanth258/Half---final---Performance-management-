import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Plus, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { TargetItem } from '../../types';
import { Modal } from '../common/Modal';

export const TrainerTargetsView: React.FC = () => {
  const { userProfile } = useAuth();
  const { targets = [], addTarget } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    metricType: 'Hours' as TargetItem['metricType'],
    targetValue: 40,
    currentValue: 0,
    unit: 'Hours',
    period: 'Monthly' as TargetItem['period'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  // Filter user targets and strictly exclude QA Audit and Student SAT/rating metrics as requested
  const myTargets = useMemo(() => {
    if (!userProfile) return [];
    return (targets || [])
      .filter(t => t.userId === userProfile.uid)
      .filter(t => {
        const type = (t.metricType || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        if (type === 'qa score' || type === 'student rating') return false;
        if (title.includes('qa audit') || title.includes('sat') || title.includes('csat') || title.includes('audit score') || title.includes('student rating')) {
          return false;
        }
        return true;
      });
  }, [targets, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setSaving(true);
    try {
      await addTarget({
        userId: userProfile.uid,
        employeeId: userProfile.employeeId,
        managerId: userProfile.managerId,
        title: formData.title,
        metricType: formData.metricType,
        targetValue: Number(formData.targetValue),
        currentValue: Number(formData.currentValue),
        unit: formData.unit,
        period: formData.period,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: Number(formData.currentValue) >= Number(formData.targetValue) ? 'Achieved' : 'In Progress',
      });
      setIsModalOpen(false);
      setFormData({
        title: '',
        metricType: 'Hours',
        targetValue: 40,
        currentValue: 0,
        unit: 'Hours',
        period: 'Monthly',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Ascend Targets & OKRs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track your weekly, monthly, and quarterly training delivery, task execution, and project milestones
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Set New Target</span>
        </button>
      </div>

      {/* Targets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myTargets.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-sky-100 bg-white p-12 text-center shadow-xs">
            <Target className="mx-auto h-10 w-10 text-sky-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              No targets active
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Set goals for monthly class delivery hours, task execution, or project milestones.
            </p>
          </div>
        ) : (
          myTargets.map((tgt) => {
            const pct = Math.min(100, Math.round((tgt.currentValue / Math.max(1, tgt.targetValue)) * 100));
            const isAchieved = tgt.status === 'Achieved' || pct >= 100;

            return (
              <div
                key={tgt.id}
                className="flex flex-col justify-between rounded-2xl border border-sky-100 bg-white p-5 shadow-xs transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200">
                      {tgt.period} Goal
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        isAchieved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isAchieved ? '✓ Achieved' : 'In Progress'}
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-900">
                    {tgt.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Metric: {tgt.metricType}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-sky-50 space-y-2.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-500">Current Progress</span>
                    <span className="font-bold text-slate-900">
                      {tgt.currentValue} / {tgt.targetValue} {tgt.unit} ({pct}%)
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-sky-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isAchieved ? 'bg-emerald-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-medium">
                    <span>📅 {tgt.startDate}</span>
                    <span>🏁 {tgt.endDate}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Target Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Set New Target Objective"
        subtitle="Establish measurable target benchmarks for training delivery, classes, tasks, and project milestones"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Target Goal Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Deliver 40 Class Delivery Hours This Month"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Metric Type *
              </label>
              <select
                value={formData.metricType}
                onChange={(e) => {
                  const newType = e.target.value as TargetItem['metricType'];
                  let defaultUnit = 'Hours';
                  if (newType === 'Classes') defaultUnit = 'Classes';
                  else if (newType === 'Tasks') defaultUnit = 'Tasks';
                  else if (newType === 'Projects') defaultUnit = 'Projects';
                  setFormData({ ...formData, metricType: newType, unit: defaultUnit });
                }}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                <option value="Hours">Delivery Hours</option>
                <option value="Classes">Classes Handled</option>
                <option value="Tasks">Tasks Completed</option>
                <option value="Projects">Projects Completed</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Cadence Period *
              </label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              >
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Target Value *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Current Value *
              </label>
              <input
                type="number"
                step="any"
                required
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Unit
              </label>
              <input
                type="text"
                placeholder="e.g. Hours, Tasks"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-sky-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-sky-200 px-4 py-2 font-semibold text-slate-700 hover:bg-sky-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-500 shadow-xs shadow-sky-600/20 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Save Target'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
