import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  User, 
  Clock, 
  BookOpen, 
  Palmtree, 
  ShieldCheck, 
  Flame, 
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { 
  buildInstructorReportData, 
  exportIndividualInstructorExcel, 
  exportFullTeamIndividualReportsExcel,
  InstructorReportData 
} from '../../lib/excelReportGenerator';

type DatePreset = 'this_month' | 'last_month' | 'this_week' | 'last_week' | 'last_30_days' | 'last_90_days' | 'ytd' | 'custom';

export const ReportsView: React.FC = () => {
  const { userProfile, isManager } = useAuth();
  const { 
    allTrainers = [], 
    classes = [], 
    dailyUpdates = [],
    selectedTraineeId,
    setSelectedTraineeId
  } = useData();
  const { addToast } = useToast();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Active Export Mode Tab: 'individual' | 'full_team'
  const [activeTab, setActiveTab] = useState<'individual' | 'full_team'>('individual');

  // Selected Instructor ID for Individual Report
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>(() => {
    if (selectedTraineeId && allTrainers.some(t => t.uid === selectedTraineeId)) {
      return selectedTraineeId;
    }
    return allTrainers[0]?.uid || '';
  });

  // Date Filter State
  const [preset, setPreset] = useState<DatePreset>('this_month');

  // Compute preset dates
  const calculatePresetDates = (p: DatePreset): { start: string; end: string } => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (p === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: fmt(start), end: fmt(end) };
    }
    if (p === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: fmt(start), end: fmt(end) };
    }
    if (p === 'this_week') {
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      const sat = new Date(mon);
      sat.setDate(mon.getDate() + 5);
      return { start: fmt(mon), end: fmt(sat) };
    }
    if (p === 'last_week') {
      const day = now.getDay();
      const diffToMon = day === 0 ? -13 : -6 - day;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      const sat = new Date(mon);
      sat.setDate(mon.getDate() + 5);
      return { start: fmt(mon), end: fmt(sat) };
    }
    if (p === 'last_30_days') {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { start: fmt(start), end: fmt(now) };
    }
    if (p === 'last_90_days') {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      return { start: fmt(start), end: fmt(now) };
    }
    if (p === 'ytd') {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: fmt(start), end: fmt(now) };
    }
    // Default current month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  };

  const initialDates = useMemo(() => calculatePresetDates('this_month'), []);
  const [startDateStr, setStartDateStr] = useState<string>(initialDates.start);
  const [endDateStr, setEndDateStr] = useState<string>(initialDates.end);

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      const { start, end } = calculatePresetDates(newPreset);
      setStartDateStr(start);
      setEndDateStr(end);
    }
  };

  // Keep selected instructor synchronized if allTrainers changes
  const activeInstructor = useMemo(() => {
    return allTrainers.find(t => t.uid === selectedInstructorId) || allTrainers[0] || null;
  }, [allTrainers, selectedInstructorId]);

  // Compute active instructor's real report data
  const individualReportData: InstructorReportData | null = useMemo(() => {
    if (!activeInstructor) return null;
    return buildInstructorReportData(activeInstructor, startDateStr, endDateStr, dailyUpdates, classes);
  }, [activeInstructor, startDateStr, endDateStr, dailyUpdates, classes]);

  // Compute team rollups across all managed instructors
  const teamRollups = useMemo(() => {
    if (!allTrainers || allTrainers.length === 0) return null;
    const reports = allTrainers.map(t => 
      buildInstructorReportData(t, startDateStr, endDateStr, dailyUpdates, classes)
    );
    return {
      totalInstructors: allTrainers.length,
      totalHours: Number(reports.reduce((acc, r) => acc + r.totals.totalWorkHours, 0).toFixed(1)),
      totalClasses: reports.reduce((acc, r) => acc + r.totals.totalClasses, 0),
      totalPractice: reports.reduce((acc, r) => acc + r.totals.totalPractice, 0),
      totalLeaves: reports.reduce((acc, r) => acc + r.totals.totalLeaveDays, 0),
      totalMissedLogs: reports.reduce((acc, r) => acc + r.totals.missedLogsCount, 0),
      totalDeficitHours: Number(reports.reduce((acc, r) => acc + r.totals.missedHoursDeficit, 0).toFixed(1)),
      reports
    };
  }, [allTrainers, startDateStr, endDateStr, dailyUpdates, classes]);

  // Export Individual Report Handler
  const [isExportingIndividual, setIsExportingIndividual] = useState(false);
  const handleExportIndividual = () => {
    if (!individualReportData || !activeInstructor) {
      addToast({
        title: 'No Instructor Selected',
        message: 'Please select an instructor to generate their Excel report.',
        type: 'error',
        duration: 4000
      });
      return;
    }
    if (startDateStr > endDateStr) {
      addToast({
        title: 'Invalid Date Range',
        message: 'Start date cannot be later than end date.',
        type: 'error',
        duration: 4000
      });
      return;
    }

    try {
      setIsExportingIndividual(true);
      exportIndividualInstructorExcel(individualReportData, userProfile);
      addToast({
        title: 'Individual Report Generated',
        message: `Successfully downloaded complete Excel workbook for ${activeInstructor.fullName} (${startDateStr} to ${endDateStr}).`,
        type: 'success',
        duration: 5000
      });
    } catch (err: any) {
      console.error('Failed to export individual report:', err);
      addToast({
        title: 'Export Failed',
        message: err.message || 'Unable to generate Excel file.',
        type: 'error',
        duration: 5000
      });
    } finally {
      setIsExportingIndividual(false);
    }
  };

  // Export Full Team Reports Handler
  const [isExportingTeam, setIsExportingTeam] = useState(false);
  const handleExportFullTeam = () => {
    if (!allTrainers || allTrainers.length === 0) {
      addToast({
        title: 'No Instructors Managed',
        message: 'No instructors found under your managerial management.',
        type: 'warning',
        duration: 4000
      });
      return;
    }
    if (startDateStr > endDateStr) {
      addToast({
        title: 'Invalid Date Range',
        message: 'Start date cannot be later than end date.',
        type: 'error',
        duration: 4000
      });
      return;
    }

    try {
      setIsExportingTeam(true);
      exportFullTeamIndividualReportsExcel(allTrainers, startDateStr, endDateStr, dailyUpdates, classes, userProfile);
      addToast({
        title: 'Full Team Reports Generated',
        message: `Successfully generated multi-sheet Excel workbook with individual reports for all ${allTrainers.length} managed instructors.`,
        type: 'success',
        duration: 5000
      });
    } catch (err: any) {
      console.error('Failed to export full team reports:', err);
      addToast({
        title: 'Export Failed',
        message: err.message || 'Unable to generate full team Excel file.',
        type: 'error',
        duration: 5000
      });
    } finally {
      setIsExportingTeam(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Reports & Excel Export Hub
            </h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 border border-emerald-200">
              Excel (.xlsx) Engine
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Export comprehensive individual and team-wide instructor daily logs, attendance, workload, leave records, and missing log audits in formatted Excel spreadsheets.
          </p>
        </div>

        {/* Primary Action Button for Full Team */}
        <button
          type="button"
          onClick={handleExportFullTeam}
          disabled={isExportingTeam || allTrainers.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export multi-sheet Excel workbook for all instructors"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>{isExportingTeam ? 'Generating Full Team Excel...' : 'Export All Instructors (.xlsx)'}</span>
        </button>
      </div>

      {/* Date Filter & Period Scope Controls (Requirement 4) */}
      <div className="rounded-2xl border border-sky-200 bg-linear-to-br from-white to-sky-50/40 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-sky-100 pb-3.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Export Date Range &amp; Period Filter
            </h3>
          </div>

          {/* Quick Period Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_week', label: 'This Week' },
              { id: 'last_week', label: 'Last Week' },
              { id: 'last_30_days', label: 'Last 30 Days' },
              { id: 'last_90_days', label: 'Last 90 Days' },
              { id: 'ytd', label: 'Year to Date' },
              { id: 'custom', label: 'Custom Range' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id as DatePreset)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  preset === p.id
                    ? 'bg-sky-600 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Date & End Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div>
            <label className="text-2xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => {
                setStartDateStr(e.target.value);
                setPreset('custom');
              }}
              max={endDateStr}
              className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-2xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDateStr}
              min={startDateStr}
              onChange={(e) => {
                setEndDateStr(e.target.value);
                setPreset('custom');
              }}
              className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="text-2xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Active Scope
            </label>
            <div className="rounded-xl bg-white border border-sky-200 p-2 text-xs text-sky-950 font-bold flex items-center justify-between">
              <span className="truncate">{startDateStr} to {endDateStr}</span>
              <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md shrink-0">
                {individualReportData?.totals.totalCalendarDays || 0} days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs between Export Options (Requirement 2) */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'individual'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Option 1: Individual Instructor Report</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('full_team')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'full_team'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Option 2: Full Individual Reports (All Managed Instructors)</span>
          <span className="rounded-full bg-emerald-100 text-emerald-800 text-2xs px-1.5 py-0.2 font-extrabold">
            {allTrainers.length}
          </span>
        </button>
      </div>

      {/* OPTION 1: INDIVIDUAL INSTRUCTOR REPORT */}
      {activeTab === 'individual' && (
        <div className="space-y-5">
          {/* Instructor Selector Card */}
          <div className="rounded-2xl border border-sky-100 bg-white p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                <User className="h-4 w-4 text-sky-600" />
                <span>Select Instructor to Export:</span>
              </label>
              <select
                id="instructor-select-dropdown"
                value={selectedInstructorId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedInstructorId(newId);
                  setSelectedTraineeId(newId);
                }}
                className="w-full sm:max-w-md rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden cursor-pointer"
              >
                {allTrainers.map(t => (
                  <option key={t.uid} value={t.uid}>
                    {t.fullName} ({t.employeeId || 'ID Pending'}) &bull; {t.designation || 'Instructor'} &bull; {t.subject || 'Technical'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportIndividual}
                disabled={isExportingIndividual || !activeInstructor}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 text-xs font-bold shadow-xs shadow-sky-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>{isExportingIndividual ? 'Preparing Excel...' : 'Download Individual Excel Report (.xlsx)'}</span>
              </button>
            </div>
          </div>

          {/* Quick KPI Summary Cards for Selected Instructor (Requirement 3 & 5) */}
          {individualReportData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Workdays Logged
                </span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  {individualReportData.totals.daysLoggedCount} / {individualReportData.totals.totalWorkingDays}
                </span>
                <span className="text-2xs text-emerald-700 font-semibold block">
                  {individualReportData.totals.complianceRate}% compliance
                </span>
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                  Total Work Hours
                </span>
                <span className="text-lg font-black text-sky-950 mt-0.5 block">
                  {individualReportData.totals.totalWorkHours}h
                </span>
                <span className="text-2xs text-sky-700 font-semibold block">
                  {individualReportData.totals.totalStandardHours}h shift &bull; {individualReportData.totals.totalOvertimeHours}h OT
                </span>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                  Classes Conducted
                </span>
                <span className="text-lg font-black text-indigo-950 mt-0.5 block">
                  {individualReportData.totals.totalClasses}
                </span>
                <span className="text-2xs text-indigo-700 font-semibold block">
                  +{individualReportData.totals.totalPractice} practice sessions
                </span>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                  Taken Leaves
                </span>
                <span className="text-lg font-black text-purple-950 mt-0.5 block">
                  {individualReportData.totals.totalLeaveDays} days
                </span>
                <span className="text-2xs text-purple-700 font-semibold block">
                  {individualReportData.totals.casualLeavesCount} CL &bull; {individualReportData.totals.sickLeavesCount} SL &bull; {individualReportData.totals.unpaidLeavesCount} LOP
                </span>
              </div>

              <div className={`rounded-xl border p-3 shadow-2xs ${
                individualReportData.totals.missedLogsCount > 0 
                  ? 'border-rose-300 bg-rose-50/80 ring-1 ring-rose-200' 
                  : 'border-slate-200 bg-white'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  individualReportData.totals.missedLogsCount > 0 ? 'text-rose-800' : 'text-slate-500'
                }`}>
                  Missing Daily Logs
                </span>
                <span className={`text-lg font-black mt-0.5 block ${
                  individualReportData.totals.missedLogsCount > 0 ? 'text-rose-700 animate-pulse' : 'text-slate-900'
                }`}>
                  {individualReportData.totals.missedLogsCount} days
                </span>
                <span className={`text-2xs font-semibold block ${
                  individualReportData.totals.missedLogsCount > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
                }`}>
                  {individualReportData.totals.missedLogsCount > 0 
                    ? `-${individualReportData.totals.missedHoursDeficit}h deficit` 
                    : 'All required logs filled'}
                </span>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Total Sessions
                </span>
                <span className="text-lg font-black text-emerald-950 mt-0.5 block">
                  {individualReportData.totals.totalSessions}
                </span>
                <span className="text-2xs text-emerald-700 font-semibold block">
                  Classes + practice
                </span>
              </div>
            </div>
          )}

          {/* Day-by-Day Table Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-sky-600" />
                  <span>Report Data Preview: {activeInstructor?.fullName} ({startDateStr} to {endDateStr})</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Review verified database records that will be written into the downloadable Excel workbook.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportIndividual}
                disabled={isExportingIndividual || !activeInstructor}
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export This Table</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-700 sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Day</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Hours</th>
                    <th className="px-3 py-2.5">Classes</th>
                    <th className="px-3 py-2.5">Practice</th>
                    <th className="px-3 py-2.5">Leave Type</th>
                    <th className="px-3 py-2.5">Tasks / Work Conducted</th>
                    <th className="px-3 py-2.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {individualReportData?.dailyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-500">
                        No records found for the selected date range.
                      </td>
                    </tr>
                  ) : (
                    individualReportData?.dailyRecords.map(d => (
                      <tr 
                        key={d.dateStr}
                        className={`transition-colors ${
                          d.isMissedLog 
                            ? 'bg-rose-50/70 font-semibold' 
                            : d.isLeave 
                            ? 'bg-purple-50/50' 
                            : d.overtimeHours > 0 
                            ? 'bg-amber-50/30' 
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{d.dateStr}</td>
                        <td className="px-3 py-2 text-slate-600">{d.dayName}</td>
                        <td className="px-3 py-2">
                          {d.isMissedLog ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                              <AlertTriangle className="h-3 w-3" />
                              Daily log not submitted (6h deficit)
                            </span>
                          ) : d.isLeave ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                              <Palmtree className="h-3 w-3 text-purple-600" />
                              {d.leaveTypeLabel}
                            </span>
                          ) : d.hoursLogged > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              Logged Workday
                            </span>
                          ) : (
                            <span className="text-slate-400 text-2xs italic">{d.statusText}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">
                          {d.isMissedLog ? (
                            <span className="text-rose-700">0.0h (-6h)</span>
                          ) : d.isLeave ? (
                            <span className="text-purple-900">{d.hoursLogged}h</span>
                          ) : (
                            <span>{d.hoursLogged}h</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-800 font-semibold">{d.classesCount}</td>
                        <td className="px-3 py-2 text-slate-800">{d.practiceSessionsCount}</td>
                        <td className="px-3 py-2 text-purple-900 font-medium">{d.isLeave ? d.leaveTypeLabel : '—'}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={d.tasksWorkedOn}>
                          {d.tasksWorkedOn || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-[11px] max-w-xs truncate" title={d.remarks}>
                          {d.remarks || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary Row */}
            {individualReportData && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-4 flex-wrap font-semibold">
                  <span>Total Work Hours: <strong className="text-slate-900">{individualReportData.totals.totalWorkHours} hrs</strong></span>
                  <span>Total Classes: <strong className="text-slate-900">{individualReportData.totals.totalClasses}</strong></span>
                  <span>Practice Sessions: <strong className="text-slate-900">{individualReportData.totals.totalPractice}</strong></span>
                  <span>Leaves: <strong className="text-purple-900">{individualReportData.totals.totalLeaveDays} days</strong></span>
                  <span className={individualReportData.totals.missedLogsCount > 0 ? 'text-rose-700 font-bold' : ''}>
                    Missing Logs: <strong>{individualReportData.totals.missedLogsCount} days</strong>
                  </span>
                </div>
                <span className="text-2xs text-slate-500 font-medium">
                  {individualReportData.dailyRecords.length} days in selected date range
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OPTION 2: FULL INDIVIDUAL REPORTS (ALL MANAGED INSTRUCTORS) */}
      {activeTab === 'full_team' && (
        <div className="space-y-5">
          {/* Executive Overview Banner */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-emerald-950">
                  Full Individual Reports Workbook (.xlsx)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                Generates a multi-sheet Excel workbook containing a master <strong>Executive Team Summary</strong> worksheet, plus <strong>separate, full day-by-day worksheets for each of the {allTrainers.length} instructors</strong> managed by you. Includes daily logs, sessions, workloads, weekly/monthly summaries, leave dates, and missed logs.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportFullTeam}
              disabled={isExportingTeam || allTrainers.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 text-xs font-bold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isExportingTeam ? 'Generating Full Team Workbook...' : 'Download Full Individual Reports (.xlsx)'}</span>
            </button>
          </div>

          {/* Team Aggregation Metrics Rollup */}
          {teamRollups && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Instructors Managed
                </span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  {teamRollups.totalInstructors}
                </span>
                <span className="text-2xs text-slate-500 font-semibold block">
                  Assigned direct reports
                </span>
              </div>

              <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                  Team Hours Worked
                </span>
                <span className="text-lg font-black text-sky-950 mt-0.5 block">
                  {teamRollups.totalHours} hrs
                </span>
                <span className="text-2xs text-sky-700 font-semibold block">
                  Across all instructors
                </span>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                  Total Classes
                </span>
                <span className="text-lg font-black text-indigo-950 mt-0.5 block">
                  {teamRollups.totalClasses}
                </span>
                <span className="text-2xs text-indigo-700 font-semibold block">
                  +{teamRollups.totalPractice} practice sessions
                </span>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                  Team Leaves Taken
                </span>
                <span className="text-lg font-black text-purple-950 mt-0.5 block">
                  {teamRollups.totalLeaves} days
                </span>
                <span className="text-2xs text-purple-700 font-semibold block">
                  CL, SL &amp; LOP accounted
                </span>
              </div>

              <div className={`rounded-xl border p-3 shadow-2xs ${
                teamRollups.totalMissedLogs > 0 ? 'border-rose-300 bg-rose-50/80 ring-1 ring-rose-200' : 'border-slate-200 bg-white'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  teamRollups.totalMissedLogs > 0 ? 'text-rose-800' : 'text-slate-500'
                }`}>
                  Total Missing Logs
                </span>
                <span className={`text-lg font-black mt-0.5 block ${
                  teamRollups.totalMissedLogs > 0 ? 'text-rose-700' : 'text-slate-900'
                }`}>
                  {teamRollups.totalMissedLogs}
                </span>
                <span className={`text-2xs font-semibold block ${
                  teamRollups.totalMissedLogs > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
                }`}>
                  {teamRollups.totalMissedLogs > 0 ? `-${teamRollups.totalDeficitHours}h total deficit` : 'Zero missing logs'}
                </span>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Export Worksheets
                </span>
                <span className="text-lg font-black text-emerald-950 mt-0.5 block">
                  {teamRollups.totalInstructors + 1} sheets
                </span>
                <span className="text-2xs text-emerald-700 font-semibold block">
                  Summary + 1 per instructor
                </span>
              </div>
            </div>
          )}

          {/* Roster of Managed Instructors Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span>Managed Instructors Roster ({startDateStr} to {endDateStr})</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Every instructor listed below will receive an individual, complete worksheet in the downloaded Excel workbook.
                </p>
              </div>

              <span className="text-2xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                {allTrainers.length} Active Direct Reports
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Employee ID</th>
                    <th className="px-3 py-2.5">Instructor Name</th>
                    <th className="px-3 py-2.5">Designation</th>
                    <th className="px-3 py-2.5">Domain</th>
                    <th className="px-3 py-2.5">Workdays Logged</th>
                    <th className="px-3 py-2.5">Compliance %</th>
                    <th className="px-3 py-2.5">Total Hours</th>
                    <th className="px-3 py-2.5">Classes</th>
                    <th className="px-3 py-2.5">Leaves</th>
                    <th className="px-3 py-2.5">Missing Logs</th>
                    <th className="px-3 py-2.5 text-right">Individual Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamRollups?.reports.map(r => (
                    <tr key={r.instructor.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-sky-700">{r.instructor.employeeId || 'N/A'}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{r.instructor.fullName}</td>
                      <td className="px-3 py-2 text-slate-600">{r.instructor.designation || 'Instructor'}</td>
                      <td className="px-3 py-2 text-slate-600">{r.instructor.subject || 'Technical'}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {r.totals.daysLoggedCount} / {r.totals.totalWorkingDays}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          r.totals.complianceRate >= 95 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : r.totals.complianceRate >= 80 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {r.totals.complianceRate}%
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900">{r.totals.totalWorkHours}h</td>
                      <td className="px-3 py-2 text-indigo-900 font-semibold">{r.totals.totalClasses}</td>
                      <td className="px-3 py-2 text-purple-900 font-semibold">{r.totals.totalLeaveDays}d</td>
                      <td className="px-3 py-2">
                        {r.totals.missedLogsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-300">
                            <AlertTriangle className="h-3 w-3" />
                            {r.totals.missedLogsCount} missing
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-2xs flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Compliant
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInstructorId(r.instructor.uid);
                            setSelectedTraineeId(r.instructor.uid);
                            setActiveTab('individual');
                          }}
                          className="inline-flex items-center gap-1 text-2xs font-bold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                        >
                          <span>View Detail</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
