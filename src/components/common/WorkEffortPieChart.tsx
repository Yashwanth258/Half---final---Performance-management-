import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  Sector
} from 'recharts';
import { 
  Clock, 
  Zap, 
  Layers, 
  Info,
  Calendar,
  HeartHandshake,
  BookOpen,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  PieChart as PieChartIcon,
  Table as TableIcon,
  Sparkles,
  BarChart3,
  Sliders
} from 'lucide-react';
import { 
  WorkEffortBreakdown, 
  WorkEffortSlice,
  WorkEffortTimeframe,
  WorkEffortMode,
  calculateWorkEffortBreakdown
} from '../../lib/performanceEngine';
import { DailyUpdate, HolisticContributionRecord } from '../../types';

interface WorkEffortPieChartProps {
  dailyUpdates?: DailyUpdate[];
  holisticContributions?: HolisticContributionRecord[];
  breakdown?: WorkEffortBreakdown;
  employeeName?: string;
  title?: string;
  subtitle?: string;
  defaultTimeframe?: WorkEffortTimeframe;
  defaultMode?: WorkEffortMode;
}

// Active hover shape renderer for clean interactive feel
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="transition-all duration-300 filter drop-shadow-md"
      />
    </g>
  );
};

export const WorkEffortPieChart: React.FC<WorkEffortPieChartProps> = ({
  dailyUpdates = [],
  holisticContributions = [],
  breakdown: initialBreakdown,
  employeeName,
  title = 'Work & Extra Effort Distribution',
  subtitle = 'Breakdown of core class delivery, overtime, and additional duties',
  defaultTimeframe = 'day',
  defaultMode = 'all',
}) => {
  const [timeframe, setTimeframe] = useState<WorkEffortTimeframe>(defaultTimeframe);
  const [activeMode, setActiveMode] = useState<WorkEffortMode>(defaultMode);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [viewFormat, setViewFormat] = useState<'chart' | 'table'>('chart');

  // Recalculate breakdown dynamically whenever timeframe changes or inputs change
  const currentBreakdown = useMemo(() => {
    if (dailyUpdates.length > 0 || holisticContributions.length > 0) {
      return calculateWorkEffortBreakdown(dailyUpdates, holisticContributions, timeframe);
    }
    if (initialBreakdown) {
      return initialBreakdown;
    }
    return calculateWorkEffortBreakdown([], [], timeframe);
  }, [dailyUpdates, holisticContributions, timeframe, initialBreakdown]);

  // Determine current active slices based on clicked mode
  const currentSlices = useMemo(() => {
    switch (activeMode) {
      case 'all':
        return currentBreakdown.allSlices;
      case 'extraOnly':
        return currentBreakdown.extraOnlySlices;
      case 'additionalDuties':
        return currentBreakdown.additionalDutiesSlices;
      case 'peerEnablement':
        return currentBreakdown.extraOnlySlices;
      default:
        return currentBreakdown.allSlices;
    }
  }, [activeMode, currentBreakdown]);

  // Mode specific titles and descriptions
  const modeMetadata = useMemo(() => {
    switch (activeMode) {
      case 'all':
        return {
          title: 'Total Work & Delivery Split',
          badge: 'Overall Workload',
          badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
          accentColor: '#38bdf8',
          centerLabel: timeframe === 'day' ? 'Daily Total' : timeframe === 'week' ? 'Weekly Total' : timeframe === 'month' ? 'Monthly Total' : 'Total Logged',
          centerValue: `${currentBreakdown.totalWorkloadHours}h`,
          centerSub: `${currentBreakdown.extraEffortPercentage}% Extra/Additional`,
          description: 'Comprehensive view of regular class delivery, overtime hours, and additional duties.',
        };
      case 'extraOnly':
        return {
          title: 'Extra Work & Overtime Distribution',
          badge: 'Beyond Standard Shift',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          accentColor: '#fbbf24',
          centerLabel: 'Extra Work Total',
          centerValue: `${currentBreakdown.totalExtraHours}h`,
          centerSub: `${currentBreakdown.extraEffortPercentage}% of Total Hours`,
          description: 'Isolated distribution of all extra effort contributed beyond standard 6-hour daily shifts.',
        };
      case 'additionalDuties':
        return {
          title: 'Additional Duties Breakdown',
          badge: 'Duties & Invigilation',
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          accentColor: '#818cf8',
          centerLabel: 'Duties Total',
          centerValue: `${Number((currentBreakdown.paperEvaluationHours + currentBreakdown.inServiceHours + (currentBreakdown.invigilationHours || 0)).toFixed(1))}h`,
          centerSub: 'Assessment, Invigilation & Training',
          description: 'Exam invigilation & proctoring, test paper evaluations, assessment grading, and in-service workshops.',
        };
      case 'peerEnablement':
        return {
          title: 'Peer Enablement & Guidance Effort',
          badge: 'Mentorship & Support',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          accentColor: '#fb7185',
          centerLabel: 'Peer Total',
          centerValue: `${currentBreakdown.holisticHours}h`,
          centerSub: 'Holistic Impact',
          description: 'Emotional counseling, peer doubt clearing, administrative distribution, and community support.',
        };
    }
  }, [activeMode, currentBreakdown, timeframe]);

  const timeframeLabel = useMemo(() => {
    switch (timeframe) {
      case 'day':
        return `Per Day Average (${currentBreakdown.distinctDaysCount} active days recorded)`;
      case 'week':
        return `Per Week (Standard 6-Day Work Rate)`;
      case 'month':
        return `Per Month (Monthly 24-Day Benchmark)`;
      case 'all':
        return `All-Time Cumulative Logs`;
    }
  }, [timeframe, currentBreakdown.distinctDaysCount]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: WorkEffortSlice = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3.5 text-xs text-slate-800 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 dark:text-white">
          <div className="flex items-center gap-2 mb-1.5">
            <span 
              className="h-3 w-3 rounded-full shadow-2xs" 
              style={{ backgroundColor: data.color }} 
            />
            <span className="font-bold text-slate-900 dark:text-white text-xs">{data.name}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-extrabold text-slate-900 dark:text-sky-300">
              {data.hours} hrs
            </span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {data.percentage}%
            </span>
          </div>
          <p className="text-slate-500 text-[11px] mt-1.5 max-w-[240px] leading-relaxed dark:text-slate-400">
            {data.description}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header with Title and Timeframe Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-200/70 shadow-2xs dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-400">
            <PieChartIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              {employeeName && (
                <span className="inline-flex items-center rounded-md bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 text-[11px] font-bold dark:bg-sky-950/50 dark:border-sky-800 dark:text-sky-300">
                  {employeeName}
                </span>
              )}
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {timeframe === 'day' ? 'Daily Average' : timeframe === 'week' ? 'Weekly Basis' : timeframe === 'month' ? 'Monthly Basis' : 'All-Time'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls: Format Toggle + Calculation Basis Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs dark:border-slate-800 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewFormat('chart')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-all ${
                viewFormat === 'chart'
                  ? 'bg-white text-sky-700 shadow-xs font-bold dark:bg-slate-700 dark:text-sky-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <PieChartIcon className="h-3.5 w-3.5" />
              Chart
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('table')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-all ${
                viewFormat === 'table'
                  ? 'bg-white text-sky-700 shadow-xs font-bold dark:bg-slate-700 dark:text-sky-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Data
            </button>
          </div>

          {/* Timeframe Basis Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs dark:border-slate-800 dark:bg-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5">Basis:</span>
            {[
              { id: 'day', label: 'Day (Avg)' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
              { id: 'all', label: 'All-Time' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeframe(t.id as WorkEffortTimeframe)}
                className={`rounded-lg px-2 py-1 font-semibold transition-all ${
                  timeframe === t.id
                    ? 'bg-white text-sky-700 shadow-xs font-bold dark:bg-slate-700 dark:text-sky-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Core vs. Additional & Extra Work Effort Ratio Bar */}
      <div className="my-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 text-xs">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Core Shift vs. Extra & Additional Work Distribution
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
              Core Shift: <strong>{currentBreakdown.regularDeliveryHours}h ({currentBreakdown.regularWorkPercentage}%)</strong>
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              Extra & Additional: <strong>{currentBreakdown.totalExtraHours}h ({currentBreakdown.extraEffortPercentage}%)</strong>
            </span>
          </div>
        </div>

        {/* Dual Color Split Progress Bar with light clean colors */}
        <div className="h-3 w-full bg-slate-200/80 rounded-full overflow-hidden flex shadow-inner dark:bg-slate-700">
          <div 
            style={{ width: `${Math.min(100, Math.max(0, currentBreakdown.regularWorkPercentage))}%` }} 
            className="h-full bg-gradient-to-r from-sky-300 to-sky-400 transition-all duration-700" 
            title={`Core Delivery: ${currentBreakdown.regularWorkPercentage}%`}
          />
          <div 
            style={{ width: `${Math.min(100, Math.max(0, currentBreakdown.extraEffortPercentage))}%` }} 
            className="h-full bg-gradient-to-r from-amber-300 via-indigo-300 to-rose-300 transition-all duration-700" 
            title={`Extra & Additional Work: ${currentBreakdown.extraEffortPercentage}%`}
          />
        </div>
      </div>

      {/* 3 Interactive Clicking Mode Cards with Light Soft Palettes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {/* Card 1: Total Work Split */}
        <button
          type="button"
          onClick={() => setActiveMode('all')}
          className={`rounded-2xl border p-3.5 text-left transition-all relative overflow-hidden group ${
            activeMode === 'all'
              ? 'border-sky-400 bg-sky-50/70 ring-2 ring-sky-300/40 shadow-xs dark:bg-sky-950/40 dark:border-sky-600'
              : 'border-slate-200/80 bg-white hover:border-sky-200 hover:bg-sky-50/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block dark:text-sky-300">
              1. Total Workload
            </span>
            <Briefcase className={`h-4 w-4 ${activeMode === 'all' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
          </div>
          <span className="text-xl font-black text-slate-900 mt-1 block dark:text-white">
            {currentBreakdown.totalWorkloadHours} hrs
          </span>
          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 block mt-0.5 truncate">
            Full Workload & Delivery
          </span>
        </button>

        {/* Card 2: Extra & Overtime Only */}
        <button
          type="button"
          onClick={() => setActiveMode('extraOnly')}
          className={`rounded-2xl border p-3.5 text-left transition-all relative overflow-hidden group ${
            activeMode === 'extraOnly'
              ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-300/40 shadow-xs dark:bg-amber-950/40 dark:border-amber-600'
              : 'border-slate-200/80 bg-white hover:border-amber-200 hover:bg-amber-50/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block dark:text-amber-300">
              2. Extra & Overtime
            </span>
            <Zap className={`h-4 w-4 ${activeMode === 'extraOnly' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
          </div>
          <span className="text-xl font-black text-amber-950 mt-1 block dark:text-amber-200">
            {currentBreakdown.totalExtraHours} hrs
          </span>
          <span className="text-[10px] font-medium text-amber-800/80 dark:text-amber-300 block mt-0.5 truncate">
            {currentBreakdown.extraEffortPercentage}% of Total Work
          </span>
        </button>

        {/* Card 3: Additional Duties */}
        <button
          type="button"
          onClick={() => setActiveMode('additionalDuties')}
          className={`rounded-2xl border p-3.5 text-left transition-all relative overflow-hidden group ${
            activeMode === 'additionalDuties'
              ? 'border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-300/40 shadow-xs dark:bg-indigo-950/40 dark:border-indigo-600'
              : 'border-slate-200/80 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block dark:text-indigo-300">
              3. Additional Duties
            </span>
            <BookOpen className={`h-4 w-4 ${activeMode === 'additionalDuties' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
          </div>
          <span className="text-xl font-black text-indigo-950 mt-1 block dark:text-indigo-200">
            {Number((currentBreakdown.paperEvaluationHours + currentBreakdown.inServiceHours + (currentBreakdown.invigilationHours || 0)).toFixed(1))} hrs
          </span>
          <span className="text-[10px] font-medium text-indigo-800/80 dark:text-indigo-300 block mt-0.5 truncate">
            Invigilation, Eval & Upskilling
          </span>
        </button>
      </div>

      {/* Mode Sub-Banner with Light Background */}
      <div className="flex items-center justify-between bg-slate-50/90 rounded-xl px-4 py-2.5 text-xs border border-slate-200/70 mb-5 dark:bg-slate-800/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span 
            className="h-2.5 w-2.5 rounded-full" 
            style={{ backgroundColor: modeMetadata.accentColor }} 
          />
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Active Breakdown: {modeMetadata.title}
          </span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
            {modeMetadata.description}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
          Basis: <strong className="text-slate-900 dark:text-white uppercase">{timeframe}</strong>
        </span>
      </div>

      {viewFormat === 'chart' ? (
        /* Main Visual: Donut Chart + Interactive Segment Breakdown */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Pie Graph with Centered Metric Badge */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-2">
            <div className="h-68 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={currentSlices}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="percentage"
                    nameKey="name"
                    activeIndex={activeIndex !== null ? activeIndex : undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                    animationDuration={600}
                  >
                    {currentSlices.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="#ffffff" 
                        strokeWidth={2.5} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Donut Value with light card styling */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <div className="rounded-full bg-white/95 dark:bg-slate-900/95 shadow-sm border border-slate-100 dark:border-slate-800 px-4 py-2.5 flex flex-col items-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {modeMetadata.centerLabel}
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {modeMetadata.centerValue}
                  </span>
                  <span className="text-[10px] text-sky-600 font-bold dark:text-sky-400">
                    {modeMetadata.centerSub}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 text-center font-medium mt-1 dark:text-slate-500">
              Hover over any slice for details • Click mode tabs to change view
            </p>
          </div>

          {/* Right Details List with Soft-Toned Progress Bars */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                {modeMetadata.title} ({currentSlices.length} segments)
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Total: <strong className="text-slate-800 dark:text-slate-200">{currentSlices.reduce((acc, s) => acc + s.hours, 0).toFixed(1)} hrs</strong>
              </span>
            </div>

            <div className="space-y-2 text-xs max-h-72 overflow-y-auto pr-1">
              {currentSlices.map((slice, idx) => (
                <div 
                  key={idx}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`rounded-xl border p-3 transition-all cursor-pointer ${
                    activeIndex === idx
                      ? 'border-sky-300 bg-sky-50/60 shadow-2xs dark:border-sky-700 dark:bg-sky-950/40'
                      : 'border-slate-100 bg-slate-50/60 hover:bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span 
                        className="h-3.5 w-3.5 rounded-md shrink-0 shadow-2xs"
                        style={{ backgroundColor: slice.color }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {slice.name}
                          </span>
                          {slice.isExtra && activeMode === 'all' && (
                            <span className="rounded bg-amber-100/80 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 shrink-0 dark:bg-amber-950 dark:text-amber-300">
                              Extra
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {slice.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <span className="font-black text-slate-900 dark:text-white block text-sm">
                        {slice.hours} hrs
                      </span>
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 block">
                        {slice.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Soft Light Progress Bar */}
                  <div className="mt-2 h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden dark:bg-slate-700">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${Math.min(100, Math.max(0, slice.percentage))}%`,
                        backgroundColor: slice.color 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 mt-2 text-xs text-slate-600 flex items-start gap-2.5 dark:border-sky-950 dark:bg-sky-950/30 dark:text-slate-300">
              <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5 dark:text-sky-400" />
              <p className="text-[11px] leading-relaxed">
                <strong>Calculation Footprint:</strong> {timeframeLabel}. Click on any of the cards above to inspect <em>Total Work</em>, <em>Extra & Overtime</em>, or <em>Additional Duties</em>.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Tabular Data View */
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 font-bold uppercase tracking-wider text-[10px] text-slate-500 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Contribution Segment</th>
                <th className="px-4 py-3">Category Type</th>
                <th className="px-4 py-3 text-right">Hours ({timeframe.toUpperCase()})</th>
                <th className="px-4 py-3 text-right">Proportion (%)</th>
                <th className="px-4 py-3">Functional Role & Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentSlices.map((slice, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span className="font-bold text-slate-900 dark:text-white">{slice.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      slice.isExtra ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                    }`}>
                      {slice.isExtra ? 'Extra / Additional Work' : 'Core Regular Work'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-white">
                    {slice.hours} hrs
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-sky-600 dark:text-sky-400">
                    {slice.percentage}%
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px]">
                    {slice.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
