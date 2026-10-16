import React, { useState } from 'react';
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  Database, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { DEFAULT_WEIGHTS } from '../../lib/performanceEngine';
import { seedEnterpriseData } from '../../lib/seedDatabase';
import { PerformanceWeightConfig } from '../../types';

export const SettingsView: React.FC = () => {
  const { performanceWeights, updateWeights } = useData();

  const [weights, setWeights] = useState<PerformanceWeightConfig>(performanceWeights);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const totalWeight = 
    Number(weights.classDelivery) +
    Number(weights.taskCompletion) +
    Number(weights.projectProgress) +
    Number(weights.additionalContribution);

  const isValidTotal = totalWeight === 100;

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidTotal) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await updateWeights(weights);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  const handleReSeedData = async () => {
    if (!confirm('Re-populate Firestore database with fresh enterprise test data? This will ensure all trainer scorecards, classes, tasks, and project milestones are fully populated.')) {
      return;
    }
    setSeeding(true);
    setSeedSuccess(false);
    try {
      await seedEnterpriseData();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-5 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Performance Engine & System Configuration
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure the 4-parameter weighted scoring model, governance thresholds, and manage data synchronization
        </p>
      </div>

      {/* Success / Warning Alerts */}
      {saveSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          ✓ Weighted scoring configuration updated and synchronized across all organizational dashboards!
        </div>
      )}

      {seedSuccess && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-xs font-semibold text-purple-800">
          ✓ Enterprise dataset successfully populated in Cloud Firestore!
        </div>
      )}

      {/* Weights Config Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-purple-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Weighted Scoring Formula Parameters
              </h2>
              <p className="text-xs text-slate-500">
                Adjust organizational weights for composite employee score calculation (4 Pillars)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Standard Defaults</span>
          </button>
        </div>

        <form onSubmit={handleSaveWeights} className="mt-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>1. Work & Class Delivery Weight (%)</span>
                <span className="text-purple-600 font-bold">{weights.classDelivery}%</span>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={weights.classDelivery}
                onChange={(e) => setWeights({ ...weights, classDelivery: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 p-2.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>2. Task Completion Weight (%)</span>
                <span className="text-purple-600 font-bold">{weights.taskCompletion}%</span>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={weights.taskCompletion}
                onChange={(e) => setWeights({ ...weights, taskCompletion: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 p-2.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>3. Project Milestones Progress Weight (%)</span>
                <span className="text-purple-600 font-bold">{weights.projectProgress}%</span>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={weights.projectProgress}
                onChange={(e) => setWeights({ ...weights, projectProgress: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 p-2.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>4. Extra Contributions Weight (%)</span>
                <span className="text-purple-600 font-bold">{weights.additionalContribution}%</span>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={weights.additionalContribution}
                onChange={(e) => setWeights({ ...weights, additionalContribution: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-200 p-2.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Sum Validation Banner */}
          <div
            className={`flex items-center justify-between rounded-xl p-3 text-xs font-semibold ${
              isValidTotal
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>Total Weight: <strong>{totalWeight}%</strong> (Must equal exactly 100%)</span>
            {isValidTotal ? (
              <span className="text-emerald-700 flex items-center gap-1">✓ Valid Formula</span>
            ) : (
              <span className="text-rose-700 flex items-center gap-1">⚠️ Adjust weights to sum to 100%</span>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={!isValidTotal || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Scoring Weights'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Database Seeding & Maintenance Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 dark:border-slate-800">
          <Database className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Enterprise Firestore Demo Data Management
            </h2>
            <p className="text-xs text-slate-500">
              Populate or refresh the live Cloud Firestore database with realistic multi-trainer enterprise data
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400 max-w-lg">
            Initializes complete sample records for 4 specialized trainers, classes, task deliverables, 8-stage project milestones, and daily workload logs.
          </p>

          <button
            type="button"
            onClick={handleReSeedData}
            disabled={seeding}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 disabled:opacity-50 shrink-0 shadow-2xs"
          >
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span>{seeding ? 'Seeding Database...' : 'Re-Seed Enterprise Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
