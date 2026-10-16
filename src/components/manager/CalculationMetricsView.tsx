import React, { useState } from 'react';
import { 
  Calculator, 
  Sparkles, 
  Flame, 
  HeartHandshake, 
  FolderGit2, 
  CheckSquare, 
  Award, 
  Sliders, 
  Save, 
  RotateCcw, 
  HelpCircle, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Info,
  Clock,
  Layers,
  Edit3,
  X
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { 
  DEFAULT_METRIC_CONFIG, 
  simulateOverallScore 
} from '../../lib/performanceEngine';
import { MetricCalculationConfig } from '../../types';
import { Tooltip } from '../common/Tooltip';

export const CalculationMetricsView: React.FC = () => {
  const { metricConfig, updateMetricConfig } = useData();
  const { addToast } = useToast();

  // Local state for editable configuration
  const [isEditing, setIsEditing] = useState(false);
  const [formConfig, setFormConfig] = useState<MetricCalculationConfig>(metricConfig);
  const [isSaving, setIsSaving] = useState(false);

  // Simulation Sandbox State
  const [simRegularHours, setSimRegularHours] = useState<number>(36.0);
  const [simBurnoutHours, setSimBurnoutHours] = useState<number>(4.0);
  const [simHolisticHours, setSimHolisticHours] = useState<number>(1.0);
  const [simTasksCompleted, setSimTasksCompleted] = useState<number>(0);
  const [simActiveProjects, setSimActiveProjects] = useState<number>(0);
  const [simProjectProgress, setSimProjectProgress] = useState<number>(80);

  // Run simulation calculation
  const simResult = simulateOverallScore({
    regularHours: simRegularHours,
    burnoutHours: simBurnoutHours,
    holisticHours: simHolisticHours,
    tasksCompleted: simTasksCompleted,
    activeProjects: simActiveProjects,
    avgProjectProgress: simProjectProgress,
    config: formConfig,
  });

  const handleConfigChange = (key: keyof MetricCalculationConfig, val: number) => {
    setFormConfig(prev => ({
      ...prev,
      [key]: isNaN(val) ? 0 : val
    }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateMetricConfig(formConfig);
      setIsEditing(false);
      addToast({
        id: `config-saved-${Date.now()}`,
        title: 'Metric Calculations Updated',
        message: 'The performance calculation formula and tier thresholds have been synchronized.',
        type: 'success',
        category: 'system',
        duration: 4000,
      });
    } catch (err) {
      console.error(err);
      addToast({
        id: `config-error-${Date.now()}`,
        title: 'Save Failed',
        message: 'Failed to update metric configuration.',
        type: 'error',
        category: 'system',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setFormConfig(DEFAULT_METRIC_CONFIG);
    addToast({
      id: `config-reset-${Date.now()}`,
      title: 'Defaults Restored',
      message: 'Reset calculation rates back to enterprise standard baseline.',
      type: 'info',
      category: 'system',
      duration: 3000,
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-sky-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Metric Calculations & Performance Engine
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Transparent mathematical scoring rules, performance tier classifications, and manager rate configuration
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setFormConfig(metricConfig);
              setIsEditing(!isEditing);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              isEditing
                ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                : 'bg-sky-600 text-white hover:bg-sky-700 shadow-sky-600/20'
            }`}
          >
            {isEditing ? (
              <>
                <X className="h-4 w-4" />
                <span>Close Editor</span>
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4" />
                <span>Edit Metric Parameters</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Configuration Drawer / Panel */}
      {isEditing && (
        <div className="rounded-2xl border-2 border-sky-300 bg-white p-6 shadow-lg shadow-sky-100 transition-all">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Configure Scoring Parameters & Multipliers
                </h2>
                <p className="text-xs text-slate-500">
                  Customize the bonus percentages, SLA hours, and achievement tier cutoff boundaries
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Defaults</span>
            </button>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Baseline Hours */}
              <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                  <Clock className="h-4 w-4 text-sky-600" />
                  <span>Standard SLA Baselines</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Weekly SLA Target (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="60"
                    value={formConfig.weeklyStandardHours}
                    onChange={(e) => handleConfigChange('weeklyStandardHours', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default: 36.0 hrs (6 days × 6 hrs)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Daily SLA Target (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    value={formConfig.dailyStandardHours}
                    onChange={(e) => handleConfigChange('dailyStandardHours', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default: 6.0 hrs / day</span>
                </div>
              </div>

              {/* Bonus Multipliers */}
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Flame className="h-4 w-4 text-amber-600" />
                  <span>Overtime & Mentorship Rates</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Burnout Overtime Rate (% / hr)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="15"
                    value={formConfig.burnoutHourRate}
                    onChange={(e) => handleConfigChange('burnoutHourRate', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">+3.0% added per extra hour beyond 36h</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Holistic Mentorship Rate (% / hr)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="15"
                    value={formConfig.holisticHourRate}
                    onChange={(e) => handleConfigChange('holisticHourRate', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">+3.5% added per hour of guidance</span>
                </div>
              </div>

              {/* Task & Project Bonuses */}
              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                  <FolderGit2 className="h-4 w-4 text-purple-600" />
                  <span>Tasks & Projects Bonuses</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Task Bonus (% / completed task)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={formConfig.taskBonusPerItem}
                    onChange={(e) => handleConfigChange('taskBonusPerItem', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">+3.0% per task (capped at {formConfig.maxTaskBonus}%)</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Project Undertaking Base Bonus (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="15"
                    value={formConfig.projectBaseBonus}
                    onChange={(e) => handleConfigChange('projectBaseBonus', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-purple-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">5.0% base + progress scale (capped at {formConfig.maxProjectBonus}%)</span>
                </div>
              </div>

              {/* Tier Thresholds */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <span>Performance Tier Cutoffs</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">
                      Gold MVP (≥ %)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="100"
                      max="150"
                      value={formConfig.goldThreshold}
                      onChange={(e) => handleConfigChange('goldThreshold', parseFloat(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">
                      Silver Star (≥ %)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="100"
                      max="140"
                      value={formConfig.silverThreshold}
                      onChange={(e) => handleConfigChange('silverThreshold', parseFloat(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">
                      Value-Add (&gt; %)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="90"
                      max="120"
                      value={formConfig.valueAddThreshold}
                      onChange={(e) => handleConfigChange('valueAddThreshold', parseFloat(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-1">
                      Core SLA (≥ %)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="70"
                      max="100"
                      value={formConfig.standardSlaThreshold}
                      onChange={(e) => handleConfigChange('standardSlaThreshold', parseFloat(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/20 hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving...' : 'Save Configuration & Apply'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Key Multipliers Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Core SLA */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Core SLA Delivery
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {metricConfig.weeklyStandardHours}h
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              = 100% Target SLA
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            6 days × {metricConfig.dailyStandardHours}h daily baseline logged via Daily Updates
          </p>
        </div>

        {/* Burnout Multiplier */}
        <div className="rounded-2xl border border-amber-200/80 bg-linear-to-br from-white to-amber-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Burnout / Overtime Bonus
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">
              +{metricConfig.burnoutHourRate}%
            </span>
            <span className="text-xs font-semibold text-slate-600">
              per extra hour
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Added for every hour worked beyond {metricConfig.weeklyStandardHours}h weekly / {metricConfig.dailyStandardHours}h daily
          </p>
        </div>

        {/* Holistic Multiplier */}
        <div className="rounded-2xl border border-purple-200/80 bg-linear-to-br from-white to-purple-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Holistic Guidance Bonus
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <HeartHandshake className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">
              +{metricConfig.holisticHourRate}%
            </span>
            <span className="text-xs font-semibold text-slate-600">
              per guidance hour
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Peer enablement, doubt clearing, student counseling & paper eval
          </p>
        </div>

        {/* Project & Task Multiplier */}
        <div className="rounded-2xl border border-indigo-200/80 bg-linear-to-br from-white to-indigo-50/30 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              Strategic Projects & Tasks
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <FolderGit2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">
              +{metricConfig.projectBaseBonus}% – +{metricConfig.maxProjectBonus}%
            </span>
            <span className="text-xs font-semibold text-slate-600">
              Progress scale
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            +{metricConfig.taskBonusPerItem}% per completed task, 0% penalty if 0 projects assigned
          </p>
        </div>
      </div>

      {/* 2-Column Section: Formula Math & Tier Categorization */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Mathematical Formula Details (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <Sparkles className="h-5 w-5 text-sky-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  The Master Performance Formula
                </h2>
                <p className="text-xs text-slate-500">
                  How the Overall Score is computed deterministically for each trainer
                </p>
              </div>
            </div>

            {/* Formula Equation Box */}
            <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-slate-900">
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-800 mb-1.5">
                Formula Representation
              </div>
              <div className="font-mono text-xs font-semibold leading-relaxed text-sky-950 sm:text-sm">
                Overall Score (%) = Base SLA Delivery (100% max)
                <br className="hidden sm:inline" /> + (Burnout Extra Hours × {metricConfig.burnoutHourRate}%)
                <br className="hidden sm:inline" /> + (Holistic Mentorship Hours × {metricConfig.holisticHourRate}%)
                <br className="hidden sm:inline" /> + Task Completion Bonus (up to {metricConfig.maxTaskBonus}%)
                <br className="hidden sm:inline" /> + Active Project Progress Bonus (up to {metricConfig.maxProjectBonus}%)
              </div>
              <div className="mt-2 text-[11px] font-medium text-sky-700">
                * Capped at a maximum ceiling of {metricConfig.maxOverallScore}%
              </div>
            </div>

            {/* Step-by-step Pillar Breakdown */}
            <div className="mt-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Calculation Breakdown by Component
              </h3>

              {/* Pillar 1: Base SLA */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 text-xs font-bold">
                  1
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      Base SLA Delivery Target (100.0%)
                    </h4>
                    <span className="rounded-sm bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
                      Standard Work
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    When a trainer logs the standard {metricConfig.weeklyStandardHours} hours per week ({metricConfig.dailyStandardHours} hours/day × 6 working days), their core SLA delivery evaluates to exactly <strong>100%</strong>. If less than {metricConfig.weeklyStandardHours}h is logged without taking leave, the score evaluates proportionally (e.g. 32.4h = 90%).
                  </p>
                </div>
              </div>

              {/* Pillar 2: Burnout Overtime */}
              <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs font-bold">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      Burnout / Overtime Hours Bonus (+{metricConfig.burnoutHourRate}% / hr)
                    </h4>
                    <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      High Impact
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Any hour logged beyond the daily {metricConfig.dailyStandardHours}.0h or weekly {metricConfig.weeklyStandardHours}.0h standard is classified as overtime/burnout. Each hour adds an extra <strong>+{metricConfig.burnoutHourRate}%</strong> directly to the overall score.
                  </p>
                  <div className="mt-2 text-[11px] font-medium text-amber-800 bg-white/80 rounded-md p-2 border border-amber-200">
                    Example: 4 hours burnout in a week = 4 × {metricConfig.burnoutHourRate}% = <strong>+12% bonus</strong>.
                  </div>
                </div>
              </div>

              {/* Pillar 3: Holistic & Guidance */}
              <div className="flex items-start gap-3 rounded-xl border border-purple-100 bg-purple-50/40 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-800 text-xs font-bold">
                  3
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      Holistic Mentorship & Peer Work (+{metricConfig.holisticHourRate}% / hr)
                    </h4>
                    <span className="rounded-sm bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                      Community
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Hours spent conducting student counseling, doubt-clearing sessions, peer trainer onboarding, or syllabus reviews add <strong>+{metricConfig.holisticHourRate}%</strong> per hour (up to a max cap of {metricConfig.maxHolisticBonus}%).
                  </p>
                  <div className="mt-2 text-[11px] font-medium text-purple-800 bg-white/80 rounded-md p-2 border border-purple-200">
                    Example: 1 hour holistic work = 1 × {metricConfig.holisticHourRate}% = <strong>+3.5% bonus</strong>.
                  </div>
                </div>
              </div>

              {/* Pillar 4: Strategic Projects & Tasks */}
              <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold">
                  4
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      Strategic Projects & Task Milestones
                    </h4>
                    <span className="rounded-sm bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
                      Milestones
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Undertaking strategic department projects adds <strong>+{metricConfig.projectBaseBonus}%</strong> base plus proportional completion progress (up to {metricConfig.maxProjectBonus}%). If a trainer has 0 assigned projects, bonus is 0% (maintaining base 100% SLA without penalty). Completed tasks contribute +{metricConfig.taskBonusPerItem}% each.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Performance Tier Categorization Table (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <Award className="h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Performance Tier Classifications
                </h2>
                <p className="text-xs text-slate-500">
                  How trainer scores map to recognition tiers
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {/* Tier 1: Gold MVP */}
              <div className="rounded-xl border border-amber-300 bg-linear-to-r from-amber-50 to-amber-100/40 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🌟</span>
                    <span className="text-xs font-bold text-amber-950">
                      Gold MVP Performer
                    </span>
                  </div>
                  <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">
                    ≥ {metricConfig.goldThreshold}%
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-amber-900/80">
                  Elite performers delivering top-tier overtime burnout hours (6+ hrs), leading strategic projects, and consistently driving peer mentorship.
                </p>
              </div>

              {/* Tier 2: Silver Star */}
              <div className="rounded-xl border border-purple-300 bg-linear-to-r from-purple-50 to-purple-100/40 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🟣</span>
                    <span className="text-xs font-bold text-purple-950">
                      Silver Star Performer
                    </span>
                  </div>
                  <span className="rounded-full bg-purple-200/80 px-2.5 py-0.5 text-xs font-extrabold text-purple-900">
                    {metricConfig.silverThreshold}% – {metricConfig.goldThreshold - 1}%
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-purple-900/80">
                  High contributors who exceed core SLA with 3–5 hours overtime burnout, strong holistic guidance, or successful task execution.
                </p>
              </div>

              {/* Tier 3: Value-Add Contributor */}
              <div className="rounded-xl border border-sky-300 bg-linear-to-r from-sky-50 to-sky-100/40 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔵</span>
                    <span className="text-xs font-bold text-sky-950">
                      Value-Add Contributor
                    </span>
                  </div>
                  <span className="rounded-full bg-sky-200/80 px-2.5 py-0.5 text-xs font-extrabold text-sky-900">
                    {metricConfig.valueAddThreshold}% – {metricConfig.silverThreshold - 1}%
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-sky-900/80">
                  Active contributors exceeding the standard 36.0h SLA with 1–2 hours extra burnout or dedicated peer counseling.
                </p>
              </div>

              {/* Tier 4: Core SLA Achiever */}
              <div className="rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-emerald-100/40 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🟢</span>
                    <span className="text-xs font-bold text-emerald-950">
                      Core SLA Met (100%)
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900">
                    {metricConfig.standardSlaThreshold}% – 100%
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-emerald-900/80">
                  Solid, dependable standard performance meeting the expected 36.0 hours/week SLA target without overtime.
                </p>
              </div>

              {/* Tier 5: Needs Attention */}
              <div className="rounded-xl border border-rose-200 bg-linear-to-r from-rose-50 to-rose-100/40 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <span className="text-xs font-bold text-rose-950">
                      Needs Attention / At Risk
                    </span>
                  </div>
                  <span className="rounded-full bg-rose-200/80 px-2.5 py-0.5 text-xs font-extrabold text-rose-900">
                    &lt; {metricConfig.standardSlaThreshold}%
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-rose-900/80">
                  Weekly delivery hours below target or delayed task deliverables requiring manager review and support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Case Studies / Verified Examples Grid */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
          <Layers className="h-5 w-5 text-indigo-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Verified Calculation Case Studies
            </h2>
            <p className="text-xs text-slate-500">
              Real-world scenario walkthroughs showing step-by-step scoring mechanics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Example 1 */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                  Case 1: Overtime & Guidance
                </span>
                <span className="text-xs font-bold text-purple-900">
                  Silver Star 🟣
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 mb-2">
                36h SLA + 4h Burnout + 1h Holistic
              </h3>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>• Base 36.0h Target:</span>
                  <span className="font-semibold text-slate-800">100.0%</span>
                </div>
                <div className="flex justify-between">
                  <span>• Burnout (4h × 3.0%):</span>
                  <span className="font-semibold text-amber-700">+12.0%</span>
                </div>
                <div className="flex justify-between">
                  <span>• Holistic (1h × 3.5%):</span>
                  <span className="font-semibold text-purple-700">+3.5%</span>
                </div>
                <div className="border-t border-purple-200/60 pt-1.5 flex justify-between font-bold text-purple-950">
                  <span>Total Calculated:</span>
                  <span className="text-sm">115.5% → 116%</span>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-white/80 p-2 text-[10px] text-purple-900 border border-purple-100">
              Categorized as <strong>Silver Star Performer</strong> (≥ 110%).
            </div>
          </div>

          {/* Example 2 */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                  Case 2: Overtime Alone
                </span>
                <span className="text-xs font-bold text-sky-900">
                  Value-Add 🔵
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 mb-2">
                36h SLA + 2h Burnout
              </h3>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>• Base 36.0h Target:</span>
                  <span className="font-semibold text-slate-800">100.0%</span>
                </div>
                <div className="flex justify-between">
                  <span>• Burnout (2h × 3.0%):</span>
                  <span className="font-semibold text-amber-700">+6.0%</span>
                </div>
                <div className="flex justify-between">
                  <span>• Tasks / Projects:</span>
                  <span className="font-semibold text-slate-500">+0.0%</span>
                </div>
                <div className="border-t border-sky-200/60 pt-1.5 flex justify-between font-bold text-sky-950">
                  <span>Total Calculated:</span>
                  <span className="text-sm">106%</span>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-white/80 p-2 text-[10px] text-sky-900 border border-sky-100">
              Categorized as <strong>Value-Add Contributor</strong> (101% – 109%).
            </div>
          </div>

          {/* Example 3 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Case 3: Strategic Projects Leader
                </span>
                <span className="text-xs font-bold text-amber-900">
                  Gold MVP 🌟
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 mb-2">
                36h SLA + 4h Burnout + 1 Project + 2 Tasks
              </h3>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>• Base 36.0h Target:</span>
                  <span className="font-semibold text-slate-800">100.0%</span>
                </div>
                <div className="flex justify-between">
                  <span>• Burnout (4h × 3.0%):</span>
                  <span className="font-semibold text-amber-700">+12.0%</span>
                </div>
                <div className="flex justify-between">
                  <span>• Project (80% prog):</span>
                  <span className="font-semibold text-indigo-700">+13.0%</span>
                </div>
                <div className="flex justify-between">
                  <span>• 2 Tasks Completed:</span>
                  <span className="font-semibold text-purple-700">+6.0%</span>
                </div>
                <div className="border-t border-amber-200/60 pt-1.5 flex justify-between font-bold text-amber-950">
                  <span>Total Calculated:</span>
                  <span className="text-sm">131%</span>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-white/80 p-2 text-[10px] text-amber-900 border border-amber-100">
              Categorized as <strong>Gold MVP Performer</strong> (≥ 120%).
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Sandbox */}
      <div className="rounded-2xl border border-sky-200 bg-linear-to-b from-white to-sky-50/20 p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Interactive Calculation Simulator Sandbox
              </h2>
              <p className="text-xs text-slate-500">
                Adjust sliders to test any weekly workload scenario in real-time
              </p>
            </div>
          </div>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
            Live Math Engine
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Controls (7 cols) */}
          <div className="space-y-5 lg:col-span-7">
            {/* Regular Hours Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Standard Delivery Hours (Weekly)</span>
                <span className="text-sky-700 font-bold">{simRegularHours} hrs {simRegularHours >= 36 ? '(100% Target Met)' : `(${Math.round((simRegularHours/36)*100)}% SLA)`}</span>
              </div>
              <input
                type="range"
                min="0"
                max="48"
                step="1"
                value={simRegularHours}
                onChange={(e) => setSimRegularHours(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0h</span>
                <span>36h (Standard SLA)</span>
                <span>48h</span>
              </div>
            </div>

            {/* Burnout Extra Hours */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Burnout / Extra Overtime Hours</span>
                <span className="text-amber-700 font-bold">{simBurnoutHours} hrs (+{(simBurnoutHours * metricConfig.burnoutHourRate).toFixed(1)}%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={simBurnoutHours}
                onChange={(e) => setSimBurnoutHours(parseFloat(e.target.value))}
                className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0h (No Overtime)</span>
                <span>4h (+12%)</span>
                <span>12h</span>
              </div>
            </div>

            {/* Holistic Hours */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Holistic Guidance / Mentorship Hours</span>
                <span className="text-purple-700 font-bold">{simHolisticHours} hrs (+{(simHolisticHours * metricConfig.holisticHourRate).toFixed(1)}%)</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={simHolisticHours}
                onChange={(e) => setSimHolisticHours(parseFloat(e.target.value))}
                className="w-full h-2 bg-purple-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0h</span>
                <span>1h (+3.5%)</span>
                <span>10h</span>
              </div>
            </div>

            {/* Tasks & Projects */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Completed Tasks ({simTasksCompleted})
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={simTasksCompleted}
                  onChange={(e) => setSimTasksCompleted(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">+{simTasksCompleted * metricConfig.taskBonusPerItem}% bonus</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Active Projects ({simActiveProjects})
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={simActiveProjects}
                  onChange={(e) => setSimActiveProjects(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">{simActiveProjects > 0 ? `+${simResult.projectBonus}% bonus` : '0% (No penalty)'}</span>
              </div>
            </div>
          </div>

          {/* Real-time Calculation Result Card (5 cols) */}
          <div className="rounded-xl border border-sky-200 bg-white p-5 shadow-xs flex flex-col justify-between lg:col-span-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Simulated Output
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-4xl font-black text-slate-900">
                    {simResult.overallScore}%
                  </span>
                  <span className="ml-2 text-xs font-semibold text-slate-500">
                    Overall Score
                  </span>
                </div>
                <div className={`rounded-xl border px-3 py-1 text-xs font-bold ${simResult.tierBadgeClass}`}>
                  {simResult.tierLabel}
                </div>
              </div>

              {/* Progress Breakdown Bar */}
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
                  <div 
                    style={{ width: `${Math.min(100, (simResult.baseDeliveryPct / simResult.overallScore) * 100)}%` }} 
                    className="bg-sky-500" 
                    title={`Base SLA: ${simResult.baseDeliveryPct}%`}
                  />
                  {simResult.burnoutBonus > 0 && (
                    <div 
                      style={{ width: `${(simResult.burnoutBonus / simResult.overallScore) * 100}%` }} 
                      className="bg-amber-500" 
                      title={`Burnout Overtime: +${simResult.burnoutBonus}%`}
                    />
                  )}
                  {simResult.holisticBonus > 0 && (
                    <div 
                      style={{ width: `${(simResult.holisticBonus / simResult.overallScore) * 100}%` }} 
                      className="bg-purple-500" 
                      title={`Holistic Mentorship: +${simResult.holisticBonus}%`}
                    />
                  )}
                  {simResult.taskBonus > 0 && (
                    <div 
                      style={{ width: `${(simResult.taskBonus / simResult.overallScore) * 100}%` }} 
                      className="bg-emerald-500" 
                      title={`Tasks: +${simResult.taskBonus}%`}
                    />
                  )}
                  {simResult.projectBonus > 0 && (
                    <div 
                      style={{ width: `${(simResult.projectBonus / simResult.overallScore) * 100}%` }} 
                      className="bg-indigo-500" 
                      title={`Projects: +${simResult.projectBonus}%`}
                    />
                  )}
                </div>

                {/* Legend Breakdown */}
                <div className="space-y-1 pt-2 text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
                      <span>Base SLA Target:</span>
                    </span>
                    <span className="font-semibold">{simResult.baseDeliveryPct}%</span>
                  </div>
                  {simResult.burnoutBonus > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>Burnout Bonus ({simBurnoutHours}h):</span>
                      </span>
                      <span className="font-semibold">+{simResult.burnoutBonus}%</span>
                    </div>
                  )}
                  {simResult.holisticBonus > 0 && (
                    <div className="flex justify-between text-purple-700">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        <span>Holistic Guidance ({simHolisticHours}h):</span>
                      </span>
                      <span className="font-semibold">+{simResult.holisticBonus}%</span>
                    </div>
                  )}
                  {simResult.taskBonus > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Tasks Completed ({simTasksCompleted}):</span>
                      </span>
                      <span className="font-semibold">+{simResult.taskBonus}%</span>
                    </div>
                  )}
                  {simResult.projectBonus > 0 && (
                    <div className="flex justify-between text-indigo-700">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        <span>Project Bonus ({simActiveProjects} proj):</span>
                      </span>
                      <span className="font-semibold">+{simResult.projectBonus}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Final Evaluated Score:</span>
                <span className="text-base text-sky-700">{simResult.overallScore}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
