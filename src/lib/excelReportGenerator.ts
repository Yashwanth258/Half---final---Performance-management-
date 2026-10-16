import * as XLSX from 'xlsx';
import { UserProfile, DailyUpdate, ClassItem } from '../types';

export interface InstructorReportDayRecord {
  dateStr: string;
  dayName: string;
  dayOfWeek: number;
  statusText: string;
  isSunday: boolean;
  isPreRegistration: boolean;
  isFuture: boolean;
  isMissedLog: boolean;
  isLeave: boolean;
  leaveType: string;
  leaveTypeLabel: string;
  leaveReason: string;
  hoursLogged: number;
  standardHours: number;
  overtimeHours: number;
  classesCount: number;
  practiceSessionsCount: number;
  totalSessions: number;
  additionalDuties: string;
  tasksWorkedOn: string;
  remarks: string;
}

export interface InstructorReportWeeklySummary {
  weekLabel: string;
  dateRange: string;
  requiredDays: number;
  loggedDays: number;
  totalHours: number;
  standardHours: number;
  overtimeHours: number;
  classesCount: number;
  practiceSessionsCount: number;
  totalLeaves: number;
  missedLogs: number;
  complianceRate: number;
  status: string;
}

export interface InstructorReportMonthlySummary {
  monthYear: string;
  workingDays: number;
  loggedDays: number;
  totalHours: number;
  classesCount: number;
  practiceSessionsCount: number;
  casualLeaves: number;
  sickLeaves: number;
  unpaidLeaves: number;
  totalLeaves: number;
  missedLogs: number;
  complianceRate: number;
}

export interface InstructorReportData {
  instructor: UserProfile;
  startDateStr: string;
  endDateStr: string;
  dailyRecords: InstructorReportDayRecord[];
  weeklySummaries: InstructorReportWeeklySummary[];
  monthlySummaries: InstructorReportMonthlySummary[];
  totals: {
    totalCalendarDays: number;
    totalWorkingDays: number;
    daysLoggedCount: number;
    complianceRate: number;
    totalWorkHours: number;
    totalStandardHours: number;
    totalOvertimeHours: number;
    totalClasses: number;
    totalPractice: number;
    totalSessions: number;
    casualLeavesCount: number;
    sickLeavesCount: number;
    unpaidLeavesCount: number;
    totalLeaveDays: number;
    missedLogsCount: number;
    missedHoursDeficit: number;
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Build detailed, verified reporting data for a single instructor across any date range.
 */
export function buildInstructorReportData(
  instructor: UserProfile,
  startDateStr: string,
  endDateStr: string,
  dailyUpdates: DailyUpdate[],
  classes: ClassItem[]
): InstructorReportData {
  const todayStr = new Date().toISOString().split('T')[0];
  const userRegDateStr = instructor.createdAt ? instructor.createdAt.split('T')[0] : '';

  // Generate list of all dates in the range
  const dates: string[] = [];
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  // Pre-filter instructor's daily updates to eliminate any chance of mismatched data
  const instructorUpdates = (dailyUpdates || []).filter(u => {
    if (u.userId && u.userId === instructor.uid) return true;
    if (instructor.employeeId && u.employeeId && u.employeeId.toUpperCase() === instructor.employeeId.toUpperCase()) return true;
    if (instructor.companyEmail && ((u as any).userEmail || (u as any).email || (u as any).companyEmail) && 
        ((u as any).userEmail || (u as any).email || (u as any).companyEmail).toLowerCase() === instructor.companyEmail.toLowerCase()) return true;
    if (instructor.fullName && u.employeeName && u.employeeName.trim().toLowerCase() === instructor.fullName.trim().toLowerCase()) return true;
    return false;
  });

  // Pre-filter instructor's classes
  const instructorClasses = (classes || []).filter(c => {
    if (c.userId && c.userId === instructor.uid) return true;
    if (instructor.employeeId && c.employeeId && c.employeeId.toUpperCase() === instructor.employeeId.toUpperCase()) return true;
    return false;
  });

  const dailyRecords: InstructorReportDayRecord[] = dates.map(dateStr => {
    const dObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = dObj.getDay(); // 0 = Sun
    const dayName = DAY_NAMES[dayOfWeek];
    const isSunday = dayOfWeek === 0;
    const isPastDay = dateStr < todayStr;
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const isPreReg = Boolean(userRegDateStr && dateStr < userRegDateStr);

    // Matching log for this date (take newest update if multiple exist to prevent duplicates)
    const matchingLogs = instructorUpdates.filter(u => (u.date || '').split('T')[0] === dateStr);
    const log = matchingLogs.length > 0 ? matchingLogs[matchingLogs.length - 1] : null;

    // Matching live classes
    const dayClasses = instructorClasses.filter(c => (c.date || '').split('T')[0] === dateStr && c.status !== 'Cancelled');

    const isMissedLog = isPastDay && !isSunday && !isPreReg && !log;
    const isLeave = Boolean(log?.isLeave && log?.leaveType !== 'NONE');
    const leaveType = isLeave ? (log?.leaveType || 'CASUAL_LEAVE') : 'NONE';
    const leaveReason = isLeave ? (log?.leaveReason || '') : '';

    const leaveTypeLabel = leaveType === 'CASUAL_LEAVE'
      ? 'Casual Leave (CL)'
      : leaveType === 'SICK_LEAVE'
      ? 'Sick Leave (SL)'
      : leaveType === 'UNPAID_LEAVE'
      ? 'Unpaid Leave (LOP)'
      : 'None';

    let hoursLogged = 0;
    let standardHours = 0;
    let overtimeHours = 0;
    let classesCount = 0;
    let practiceSessionsCount = 0;

    if (isMissedLog) {
      hoursLogged = 0;
      standardHours = 0;
      overtimeHours = 0;
    } else if (isLeave) {
      hoursLogged = leaveType === 'UNPAID_LEAVE' ? 0 : 6.0;
      standardHours = leaveType === 'UNPAID_LEAVE' ? 0 : 6.0;
      overtimeHours = 0;
      classesCount = 0;
      practiceSessionsCount = 0;
    } else if (log) {
      hoursLogged = Number(log.hoursLogged ?? log.calculatedTotalHours ?? 6.0);
      standardHours = Math.min(6.0, hoursLogged);
      overtimeHours = Math.max(0, Number((hoursLogged - 6.0).toFixed(2)));
      classesCount = log.classesCount !== undefined ? log.classesCount : dayClasses.length;
      practiceSessionsCount = log.practiceSessionsCount || 0;
    } else if (dayClasses.length > 0) {
      classesCount = dayClasses.length;
      hoursLogged = dayClasses.reduce((acc, c) => acc + (c.durationMinutes || 60) / 60, 0);
      standardHours = Math.min(6.0, hoursLogged);
      overtimeHours = Math.max(0, Number((hoursLogged - 6.0).toFixed(2)));
    }

    let statusText = 'Normal Workday';
    if (isMissedLog) {
      statusText = 'Missed Daily Log (6h Deficit)';
    } else if (isLeave) {
      statusText = `Taken Leave: ${leaveTypeLabel}`;
    } else if (log) {
      statusText = overtimeHours > 0 ? `Normal Workday (+${overtimeHours}h Overtime)` : 'Normal Workday (Standard 6h)';
    } else if (isSunday) {
      statusText = 'Sunday (Weekly Off)';
    } else if (isPreReg) {
      statusText = 'Pre-Account Registration';
    } else if (isFuture) {
      statusText = 'Upcoming Day';
    } else if (isToday) {
      statusText = 'Today (Pending Log)';
    } else {
      statusText = 'Non-Working Day';
    }

    const additionalDuties = isLeave 
      ? 'None (On Leave)' 
      : (log?.additionalResponsibilities || log?.additionalCategory || 'None');

    const tasksWorkedOn = isLeave 
      ? `[${leaveTypeLabel}] ${leaveReason || 'Authorized Leave'}` 
      : (log?.tasksWorkedOn || (classesCount > 0 ? `${classesCount} Classes conducted` : ''));

    const remarks = isLeave ? leaveReason : (log?.remarks || log?.extraWorkDetails || '');

    return {
      dateStr,
      dayName,
      dayOfWeek,
      statusText,
      isSunday,
      isPreRegistration: isPreReg,
      isFuture,
      isMissedLog,
      isLeave,
      leaveType,
      leaveTypeLabel,
      leaveReason,
      hoursLogged: Number(hoursLogged.toFixed(2)),
      standardHours: Number(standardHours.toFixed(2)),
      overtimeHours: Number(overtimeHours.toFixed(2)),
      classesCount,
      practiceSessionsCount,
      totalSessions: classesCount + practiceSessionsCount,
      additionalDuties,
      tasksWorkedOn,
      remarks,
    };
  });

  // Calculate totals
  const totalCalendarDays = dailyRecords.length;
  const workingDaysList = dailyRecords.filter(d => !d.isSunday && !d.isPreRegistration && !d.isFuture);
  const totalWorkingDays = workingDaysList.length;

  const daysLoggedList = dailyRecords.filter(d => !d.isLeave && !d.isMissedLog && !d.isSunday && !d.isPreRegistration && d.hoursLogged > 0);
  const daysLoggedCount = daysLoggedList.length;

  const casualLeaves = dailyRecords.filter(d => d.isLeave && d.leaveType === 'CASUAL_LEAVE');
  const sickLeaves = dailyRecords.filter(d => d.isLeave && d.leaveType === 'SICK_LEAVE');
  const unpaidLeaves = dailyRecords.filter(d => d.isLeave && d.leaveType === 'UNPAID_LEAVE');

  const casualLeavesCount = casualLeaves.length;
  const sickLeavesCount = sickLeaves.length;
  const unpaidLeavesCount = unpaidLeaves.length;
  const totalLeaveDays = casualLeavesCount + sickLeavesCount + unpaidLeavesCount;

  const missedLogsList = dailyRecords.filter(d => d.isMissedLog);
  const missedLogsCount = missedLogsList.length;
  const missedHoursDeficit = missedLogsCount * 6.0;

  const totalWorkHours = Number(dailyRecords.reduce((acc, d) => acc + d.hoursLogged, 0).toFixed(2));
  const totalStandardHours = Number(dailyRecords.reduce((acc, d) => acc + d.standardHours, 0).toFixed(2));
  const totalOvertimeHours = Number(dailyRecords.reduce((acc, d) => acc + d.overtimeHours, 0).toFixed(2));
  const totalClasses = dailyRecords.reduce((acc, d) => acc + d.classesCount, 0);
  const totalPractice = dailyRecords.reduce((acc, d) => acc + d.practiceSessionsCount, 0);
  const totalSessions = totalClasses + totalPractice;

  const complianceRate = totalWorkingDays > 0 
    ? Number(Math.min(100, Math.max(0, ((daysLoggedCount + totalLeaveDays) / totalWorkingDays) * 100)).toFixed(1))
    : 100;

  // Build weekly summaries
  const weeklyMap = new Map<string, InstructorReportDayRecord[]>();
  dailyRecords.forEach(d => {
    const dt = new Date(d.dateStr + 'T00:00:00');
    // Align to Monday of the week
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(dt.setDate(diff));
    const monStr = monday.toISOString().split('T')[0];
    if (!weeklyMap.has(monStr)) {
      weeklyMap.set(monStr, []);
    }
    weeklyMap.get(monStr)!.push(d);
  });

  const weeklySummaries: InstructorReportWeeklySummary[] = [];
  let wIndex = 1;
  weeklyMap.forEach((daysInWeek, monStr) => {
    const firstDay = daysInWeek[0].dateStr;
    const lastDay = daysInWeek[daysInWeek.length - 1].dateStr;
    const reqDays = daysInWeek.filter(d => !d.isSunday && !d.isPreRegistration && !d.isFuture).length;
    const logDays = daysInWeek.filter(d => !d.isLeave && !d.isMissedLog && !d.isSunday && !d.isPreRegistration && d.hoursLogged > 0).length;
    const wHours = Number(daysInWeek.reduce((acc, d) => acc + d.hoursLogged, 0).toFixed(1));
    const wStd = Math.min(36.0, wHours);
    const wOver = Math.max(0, Number((wHours - 36.0).toFixed(1)));
    const wClasses = daysInWeek.reduce((acc, d) => acc + d.classesCount, 0);
    const wPractice = daysInWeek.reduce((acc, d) => acc + d.practiceSessionsCount, 0);
    const wLeaves = daysInWeek.filter(d => d.isLeave).length;
    const wMissed = daysInWeek.filter(d => d.isMissedLog).length;
    const wRate = reqDays > 0 ? Number(((logDays + wLeaves) / reqDays * 100).toFixed(1)) : 100;

    let status = 'Balanced';
    if (wOver > 0) status = `Burnout Overtime (+${wOver}h)`;
    else if (wMissed > 0) status = `Deficit (${wMissed} Missed)`;
    else if (wLeaves > 0) status = `Leave Taken (${wLeaves}d)`;

    weeklySummaries.push({
      weekLabel: `Week ${wIndex}`,
      dateRange: `${firstDay} to ${lastDay}`,
      requiredDays: reqDays,
      loggedDays: logDays,
      totalHours: wHours,
      standardHours: wStd,
      overtimeHours: wOver,
      classesCount: wClasses,
      practiceSessionsCount: wPractice,
      totalLeaves: wLeaves,
      missedLogs: wMissed,
      complianceRate: wRate,
      status,
    });
    wIndex++;
  });

  // Build monthly summaries
  const monthlyMap = new Map<string, InstructorReportDayRecord[]>();
  dailyRecords.forEach(d => {
    const ym = d.dateStr.slice(0, 7); // YYYY-MM
    if (!monthlyMap.has(ym)) {
      monthlyMap.set(ym, []);
    }
    monthlyMap.get(ym)!.push(d);
  });

  const monthlySummaries: InstructorReportMonthlySummary[] = [];
  monthlyMap.forEach((daysInMonth, ym) => {
    const reqDays = daysInMonth.filter(d => !d.isSunday && !d.isPreRegistration && !d.isFuture).length;
    const logDays = daysInMonth.filter(d => !d.isLeave && !d.isMissedLog && !d.isSunday && !d.isPreRegistration && d.hoursLogged > 0).length;
    const mHours = Number(daysInMonth.reduce((acc, d) => acc + d.hoursLogged, 0).toFixed(1));
    const mClasses = daysInMonth.reduce((acc, d) => acc + d.classesCount, 0);
    const mPractice = daysInMonth.reduce((acc, d) => acc + d.practiceSessionsCount, 0);
    const cLeaves = daysInMonth.filter(d => d.isLeave && d.leaveType === 'CASUAL_LEAVE').length;
    const sLeaves = daysInMonth.filter(d => d.isLeave && d.leaveType === 'SICK_LEAVE').length;
    const uLeaves = daysInMonth.filter(d => d.isLeave && d.leaveType === 'UNPAID_LEAVE').length;
    const tLeaves = cLeaves + sLeaves + uLeaves;
    const mMissed = daysInMonth.filter(d => d.isMissedLog).length;
    const mRate = reqDays > 0 ? Number(((logDays + tLeaves) / reqDays * 100).toFixed(1)) : 100;

    monthlySummaries.push({
      monthYear: ym,
      workingDays: reqDays,
      loggedDays: logDays,
      totalHours: mHours,
      classesCount: mClasses,
      practiceSessionsCount: mPractice,
      casualLeaves: cLeaves,
      sickLeaves: sLeaves,
      unpaidLeaves: uLeaves,
      totalLeaves: tLeaves,
      missedLogs: mMissed,
      complianceRate: mRate,
    });
  });

  return {
    instructor,
    startDateStr,
    endDateStr,
    dailyRecords,
    weeklySummaries,
    monthlySummaries,
    totals: {
      totalCalendarDays,
      totalWorkingDays,
      daysLoggedCount,
      complianceRate,
      totalWorkHours,
      totalStandardHours,
      totalOvertimeHours,
      totalClasses,
      totalPractice,
      totalSessions,
      casualLeavesCount,
      sickLeavesCount,
      unpaidLeavesCount,
      totalLeaveDays,
      missedLogsCount,
      missedHoursDeficit,
    }
  };
}

/**
 * Generate and download an Individual Instructor Excel Report (.xlsx)
 */
export function exportIndividualInstructorExcel(
  reportData: InstructorReportData,
  managerProfile?: UserProfile | null
) {
  const { instructor, startDateStr, endDateStr, dailyRecords, weeklySummaries, monthlySummaries, totals } = reportData;
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Daily Work & Attendance Log
  const sheet1Data: (string | number)[][] = [
    ["NXTWAVE DISRUPTIVE TECHNOLOGIES - INSTRUCTOR PERFORMANCE & WORKLOAD REPORT"],
    ["Document Type:", "Individual Instructor Daily Work & Attendance Report", "Generated Date:", new Date().toISOString().split('T')[0]],
    ["Instructor Name:", instructor.fullName, "Employee ID:", instructor.employeeId || 'N/A'],
    ["Company Email:", instructor.companyEmail, "Designation / Subject:", `${instructor.designation || 'Instructor'} (${instructor.subject || 'Technical'})`],
    ["Evaluation Period:", `${startDateStr} to ${endDateStr}`, "Reporting Manager:", `${managerProfile?.fullName || 'Manager'} (${managerProfile?.employeeId || ''})`],
    [],
    ["EXECUTIVE PERFORMANCE & ATTENDANCE SUMMARY (KPIS)"],
    ["Total Calendar Days", totals.totalCalendarDays, "Required Working Days", totals.totalWorkingDays, "Days Logged", totals.daysLoggedCount],
    ["Submission Compliance Rate", `${totals.complianceRate}%`, "Total Work Hours Logged", `${totals.totalWorkHours} hrs`, "Standard Shift Hours (6h)", `${totals.totalStandardHours} hrs`],
    ["Burnout / Overtime Hours", `${totals.totalOvertimeHours} hrs`, "Classes Conducted", totals.totalClasses, "Practice Sessions", totals.totalPractice],
    ["Total Sessions Handled", totals.totalSessions, "Casual Leaves (CL)", totals.casualLeavesCount, "Sick Leaves (SL)", totals.sickLeavesCount],
    ["Unpaid Leaves (LOP)", totals.unpaidLeavesCount, "Total Leave Days Taken", totals.totalLeaveDays, "Missing Daily Logs Count", totals.missedLogsCount],
    ["Missing Work Hours Deficit", `${totals.missedHoursDeficit} hrs`, "Status Notice", totals.missedLogsCount > 0 ? "ATTENTION: Unsubmitted Worklogs Found" : "COMPLIANT: All Days Logged"],
    [],
    ["DAY-BY-DAY ATTENDANCE, WORKLOAD & CLASS SESSIONS LOG"],
    [
      "Date",
      "Day",
      "Attendance Status",
      "Hours Logged",
      "Standard (≤6h)",
      "Overtime (>6h)",
      "Classes Conducted",
      "Practice Sessions",
      "Total Sessions",
      "Additional Duties",
      "Leave Type",
      "Leave Reason",
      "Tasks & Topics Conducted",
      "Remarks / Notes"
    ],
  ];

  // Append day rows
  dailyRecords.forEach(d => {
    sheet1Data.push([
      d.dateStr,
      d.dayName,
      d.statusText,
      d.hoursLogged,
      d.standardHours,
      d.overtimeHours,
      d.classesCount,
      d.practiceSessionsCount,
      d.totalSessions,
      d.additionalDuties,
      d.leaveTypeLabel,
      d.leaveReason,
      d.tasksWorkedOn,
      d.remarks
    ]);
  });

  // Summary Row
  sheet1Data.push([
    "TOTALS / SUMMARY",
    "",
    `${totals.daysLoggedCount} Workdays Logged, ${totals.totalLeaveDays} Leaves, ${totals.missedLogsCount} Missed`,
    totals.totalWorkHours,
    totals.totalStandardHours,
    totals.totalOvertimeHours,
    totals.totalClasses,
    totals.totalPractice,
    totals.totalSessions,
    "",
    `${totals.totalLeaveDays} Leave Days`,
    "",
    "",
    `Compliance: ${totals.complianceRate}%`
  ]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 13 }, // Date
    { wch: 12 }, // Day
    { wch: 28 }, // Status
    { wch: 14 }, // Hours Logged
    { wch: 14 }, // Standard
    { wch: 14 }, // Overtime
    { wch: 18 }, // Classes
    { wch: 18 }, // Practice
    { wch: 15 }, // Total Sessions
    { wch: 25 }, // Additional Duties
    { wch: 18 }, // Leave Type
    { wch: 25 }, // Leave Reason
    { wch: 45 }, // Tasks
    { wch: 25 }, // Remarks
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Daily Work & Attendance");

  // 2. Sheet 2: Weekly & Monthly Summaries
  const sheet2Data: (string | number)[][] = [
    ["INSTRUCTOR WORKLOAD - WEEKLY & MONTHLY AGGREGATIONS"],
    ["Instructor:", instructor.fullName, "Employee ID:", instructor.employeeId || 'N/A', "Period:", `${startDateStr} to ${endDateStr}`],
    [],
    ["WEEKLY WORKLOAD & CAPACITY AGGREGATIONS (36.0h Standard / 6 Days Baseline)"],
    [
      "Week Label",
      "Date Range",
      "Required Workdays",
      "Logged Days",
      "Total Work Hours",
      "Standard Hours (≤36h)",
      "Burnout Overtime (>36h)",
      "Classes Conducted",
      "Practice Sessions",
      "Leaves Taken",
      "Missing Logs",
      "Compliance Rate %",
      "Weekly Capacity Status"
    ],
  ];

  weeklySummaries.forEach(w => {
    sheet2Data.push([
      w.weekLabel,
      w.dateRange,
      w.requiredDays,
      w.loggedDays,
      w.totalHours,
      w.standardHours,
      w.overtimeHours,
      w.classesCount,
      w.practiceSessionsCount,
      w.totalLeaves,
      w.missedLogs,
      `${w.complianceRate}%`,
      w.status
    ]);
  });

  sheet2Data.push([]);
  sheet2Data.push(["MONTHLY PERFORMANCE & ATTENDANCE SUMMARY"]);
  sheet2Data.push([
    "Month (YYYY-MM)",
    "Working Days",
    "Days Logged",
    "Total Hours Worked",
    "Classes Conducted",
    "Practice Sessions",
    "Casual Leaves (CL)",
    "Sick Leaves (SL)",
    "Unpaid Leaves (LOP)",
    "Total Leave Days",
    "Missing Daily Logs",
    "Compliance Rate %"
  ]);

  monthlySummaries.forEach(m => {
    sheet2Data.push([
      m.monthYear,
      m.workingDays,
      m.loggedDays,
      m.totalHours,
      m.classesCount,
      m.practiceSessionsCount,
      m.casualLeaves,
      m.sickLeaves,
      m.unpaidLeaves,
      m.totalLeaves,
      m.missedLogs,
      `${m.complianceRate}%`
    ]);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 14 },
    { wch: 25 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 15 },
    { wch: 18 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Weekly & Monthly Summaries");

  // 3. Sheet 3: Leave & Absence Audit Trail
  const sheet3Data: (string | number)[][] = [
    ["INSTRUCTOR LEAVE & ABSENCE AUDIT TRAIL"],
    ["Instructor:", instructor.fullName, "Employee ID:", instructor.employeeId || 'N/A', "Period:", `${startDateStr} to ${endDateStr}`],
    [],
    ["TAKEN LEAVE RECORDS"],
    ["Date", "Day", "Leave Type", "Shift Credit Accounted", "Reason for Leave", "Logged Tasks / Notes"],
  ];

  const leaveRecords = dailyRecords.filter(d => d.isLeave);
  if (leaveRecords.length === 0) {
    sheet3Data.push(["No leave records found in selected evaluation period.", "", "", "", "", ""]);
  } else {
    leaveRecords.forEach(l => {
      sheet3Data.push([
        l.dateStr,
        l.dayName,
        l.leaveTypeLabel,
        `${l.hoursLogged} hrs (${l.leaveType === 'UNPAID_LEAVE' ? 'Loss of Pay' : 'Shift Credited'})`,
        l.leaveReason || 'None Specified',
        l.tasksWorkedOn || ''
      ]);
    });
  }

  sheet3Data.push([]);
  sheet3Data.push(["MISSING DAILY LOGS (ACTION REQUIRED)"]);
  sheet3Data.push(["Date", "Day", "Deficit Hours", "Warning Status", "Audit Requirement"]);

  const missedRecords = dailyRecords.filter(d => d.isMissedLog);
  if (missedRecords.length === 0) {
    sheet3Data.push(["No missed logs! Instructor submitted work logs for all required working days.", "", "", "", ""]);
  } else {
    missedRecords.forEach(m => {
      sheet3Data.push([
        m.dateStr,
        m.dayName,
        "6.0 hrs Deficit",
        "Daily log not submitted",
        "Instructor missed required workday submission. Log must be submitted in Daily Work portal."
      ]);
    });
  }

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 24 },
    { wch: 30 },
    { wch: 45 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, "Leaves & Missed Logs");

  // Generate filename and trigger download
  const cleanName = (instructor.fullName || 'Instructor').replace(/[^a-zA-Z0-9]/g, '_');
  const empId = instructor.employeeId || 'EMP';
  const filename = `Instructor_Report_${empId}_${cleanName}_${startDateStr}_to_${endDateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Generate and download Full Individual Reports for ALL instructors managed by the logged-in manager.
 * Creates an executive master summary worksheet plus individual complete worksheets for every instructor.
 */
export function exportFullTeamIndividualReportsExcel(
  allManagedInstructors: UserProfile[],
  startDateStr: string,
  endDateStr: string,
  dailyUpdates: DailyUpdate[],
  classes: ClassItem[],
  managerProfile?: UserProfile | null
) {
  if (!allManagedInstructors || allManagedInstructors.length === 0) {
    throw new Error('No instructors found under your managerial management to export.');
  }

  const wb = XLSX.utils.book_new();

  // Process data for every instructor
  const allReports: InstructorReportData[] = allManagedInstructors.map(instructor => {
    return buildInstructorReportData(instructor, startDateStr, endDateStr, dailyUpdates, classes);
  });

  // 1. Sheet 1: Master Executive Summary of all Managed Instructors
  const masterSummaryRows: (string | number)[][] = [
    ["NXTWAVE DISRUPTIVE TECHNOLOGIES - TEAM INSTRUCTOR EXECUTIVE SUMMARY REPORT"],
    ["Reporting Manager:", `${managerProfile?.fullName || 'Manager'} (${managerProfile?.employeeId || ''})`, "Email:", managerProfile?.companyEmail || ''],
    ["Department / Org:", managerProfile?.department || 'Technical Talent Operations', "Generated Date:", new Date().toISOString().split('T')[0]],
    ["Evaluation Period:", `${startDateStr} to ${endDateStr}`, "Total Instructors Managed:", allReports.length],
    [],
    ["TEAM OVERALL ROLLUP KPIS"],
    [
      "Total Work Hours Across Team",
      `${allReports.reduce((acc, r) => acc + r.totals.totalWorkHours, 0).toFixed(1)} hrs`,
      "Total Classes Conducted",
      allReports.reduce((acc, r) => acc + r.totals.totalClasses, 0),
      "Total Practice Sessions",
      allReports.reduce((acc, r) => acc + r.totals.totalPractice, 0)
    ],
    [
      "Total Leave Days Taken",
      allReports.reduce((acc, r) => acc + r.totals.totalLeaveDays, 0),
      "Total Missing Logs Across Team",
      allReports.reduce((acc, r) => acc + r.totals.missedLogsCount, 0),
      "Total Hours Deficit (Missing)",
      `${allReports.reduce((acc, r) => acc + r.totals.missedHoursDeficit, 0).toFixed(1)} hrs`
    ],
    [],
    ["INSTRUCTOR BY INSTRUCTOR COMPARATIVE PERFORMANCE ROSTER"],
    [
      "Employee ID",
      "Instructor Name",
      "Designation",
      "Subject / Domain",
      "Campus / Location",
      "Required Workdays",
      "Days Logged",
      "Compliance Rate %",
      "Total Work Hours",
      "Standard Hours (6h)",
      "Overtime Hours",
      "Classes Conducted",
      "Practice Sessions",
      "Total Sessions",
      "Casual Leaves (CL)",
      "Sick Leaves (SL)",
      "Unpaid Leaves (LOP)",
      "Total Leave Days",
      "Missing Daily Logs",
      "Deficit Hours"
    ],
  ];

  allReports.forEach(r => {
    masterSummaryRows.push([
      r.instructor.employeeId || 'N/A',
      r.instructor.fullName || 'Unnamed',
      r.instructor.designation || 'Instructor',
      r.instructor.subject || 'Technical',
      r.instructor.location || 'Hyderabad Campus',
      r.totals.totalWorkingDays,
      r.totals.daysLoggedCount,
      `${r.totals.complianceRate}%`,
      r.totals.totalWorkHours,
      r.totals.totalStandardHours,
      r.totals.totalOvertimeHours,
      r.totals.totalClasses,
      r.totals.totalPractice,
      r.totals.totalSessions,
      r.totals.casualLeavesCount,
      r.totals.sickLeavesCount,
      r.totals.unpaidLeavesCount,
      r.totals.totalLeaveDays,
      r.totals.missedLogsCount,
      r.totals.missedHoursDeficit
    ]);
  });

  // Team Totals Row
  masterSummaryRows.push([
    "TEAM TOTALS / AVERAGES",
    `${allReports.length} Instructors Managed`,
    "",
    "",
    "",
    allReports.reduce((acc, r) => acc + r.totals.totalWorkingDays, 0),
    allReports.reduce((acc, r) => acc + r.totals.daysLoggedCount, 0),
    `${(allReports.reduce((acc, r) => acc + r.totals.complianceRate, 0) / (allReports.length || 1)).toFixed(1)}% Avg`,
    Number(allReports.reduce((acc, r) => acc + r.totals.totalWorkHours, 0).toFixed(1)),
    Number(allReports.reduce((acc, r) => acc + r.totals.totalStandardHours, 0).toFixed(1)),
    Number(allReports.reduce((acc, r) => acc + r.totals.totalOvertimeHours, 0).toFixed(1)),
    allReports.reduce((acc, r) => acc + r.totals.totalClasses, 0),
    allReports.reduce((acc, r) => acc + r.totals.totalPractice, 0),
    allReports.reduce((acc, r) => acc + r.totals.totalSessions, 0),
    allReports.reduce((acc, r) => acc + r.totals.casualLeavesCount, 0),
    allReports.reduce((acc, r) => acc + r.totals.sickLeavesCount, 0),
    allReports.reduce((acc, r) => acc + r.totals.unpaidLeavesCount, 0),
    allReports.reduce((acc, r) => acc + r.totals.totalLeaveDays, 0),
    allReports.reduce((acc, r) => acc + r.totals.missedLogsCount, 0),
    Number(allReports.reduce((acc, r) => acc + r.totals.missedHoursDeficit, 0).toFixed(1))
  ]);

  const wsMaster = XLSX.utils.aoa_to_sheet(masterSummaryRows);
  wsMaster['!cols'] = [
    { wch: 14 }, // Employee ID
    { wch: 22 }, // Instructor Name
    { wch: 18 }, // Designation
    { wch: 18 }, // Subject
    { wch: 20 }, // Location
    { wch: 18 }, // Required Workdays
    { wch: 14 }, // Days Logged
    { wch: 18 }, // Compliance Rate
    { wch: 16 }, // Total Work Hours
    { wch: 18 }, // Standard Hours
    { wch: 16 }, // Overtime Hours
    { wch: 18 }, // Classes
    { wch: 18 }, // Practice
    { wch: 15 }, // Total Sessions
    { wch: 18 }, // CL
    { wch: 18 }, // SL
    { wch: 18 }, // LOP
    { wch: 16 }, // Total Leaves
    { wch: 18 }, // Missing Daily Logs
    { wch: 15 }, // Deficit Hours
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, "Team Executive Summary");

  // 2. Individual Dedicated Worksheets for each instructor
  const usedSheetNames = new Set<string>(["Team Executive Summary"]);

  allReports.forEach((r, idx) => {
    const empId = r.instructor.employeeId || `EMP${idx + 1}`;
    const firstName = (r.instructor.fullName || 'Instructor').split(' ')[0];
    
    // Create clean 31-char max sheet name
    let sheetName = `${empId} - ${firstName}`.replace(/[\\/?*[\]:]/g, '').trim().slice(0, 31);
    if (usedSheetNames.has(sheetName)) {
      sheetName = `${empId.slice(0, 8)} - ${idx + 1}`.slice(0, 31);
    }
    usedSheetNames.add(sheetName);

    const sheetData: (string | number)[][] = [
      [`INSTRUCTOR DETAILED REPORT: ${r.instructor.fullName} (${empId})`],
      ["Email:", r.instructor.companyEmail, "Designation:", r.instructor.designation || 'Instructor'],
      ["Department / Subject:", r.instructor.subject || 'Technical Operations', "Period:", `${startDateStr} to ${endDateStr}`],
      [],
      ["INSTRUCTOR KPIS & SUMMARY"],
      ["Required Working Days", r.totals.totalWorkingDays, "Days Logged", r.totals.daysLoggedCount, "Compliance Rate", `${r.totals.complianceRate}%`],
      ["Total Hours Logged", `${r.totals.totalWorkHours} hrs`, "Standard Shift (6h)", `${r.totals.totalStandardHours} hrs`, "Overtime / Burnout", `${r.totals.totalOvertimeHours} hrs`],
      ["Classes Conducted", r.totals.totalClasses, "Practice Sessions", r.totals.totalPractice, "Total Sessions", r.totals.totalSessions],
      ["Casual Leaves (CL)", r.totals.casualLeavesCount, "Sick Leaves (SL)", r.totals.sickLeavesCount, "Unpaid Leaves (LOP)", r.totals.unpaidLeavesCount],
      ["Total Leave Days", r.totals.totalLeaveDays, "Missing Daily Logs", r.totals.missedLogsCount, "Deficit Hours", `${r.totals.missedHoursDeficit} hrs`],
      [],
      ["DAY-BY-DAY ATTENDANCE, WORKLOAD & CLASS SESSIONS"],
      [
        "Date",
        "Day",
        "Status",
        "Hours Logged",
        "Standard (6h)",
        "Overtime",
        "Classes",
        "Practice Sessions",
        "Total Sessions",
        "Additional Duties",
        "Leave Type",
        "Leave Reason",
        "Tasks & Topics Conducted",
        "Remarks / Notes"
      ],
    ];

    r.dailyRecords.forEach(d => {
      sheetData.push([
        d.dateStr,
        d.dayName,
        d.statusText,
        d.hoursLogged,
        d.standardHours,
        d.overtimeHours,
        d.classesCount,
        d.practiceSessionsCount,
        d.totalSessions,
        d.additionalDuties,
        d.leaveTypeLabel,
        d.leaveReason,
        d.tasksWorkedOn,
        d.remarks
      ]);
    });

    sheetData.push([
      "INSTRUCTOR TOTALS",
      "",
      `${r.totals.daysLoggedCount} Logged, ${r.totals.totalLeaveDays} Leaves, ${r.totals.missedLogsCount} Missed`,
      r.totals.totalWorkHours,
      r.totals.totalStandardHours,
      r.totals.totalOvertimeHours,
      r.totals.totalClasses,
      r.totals.totalPractice,
      r.totals.totalSessions,
      "",
      `${r.totals.totalLeaveDays} Leaves`,
      "",
      "",
      `Compliance: ${r.totals.complianceRate}%`
    ]);

    // Append Weekly Breakdown on the same sheet below daily logs
    sheetData.push([]);
    sheetData.push(["WEEKLY WORKLOAD BREAKDOWN"]);
    sheetData.push([
      "Week Label",
      "Date Range",
      "Required Workdays",
      "Logged Days",
      "Total Work Hours",
      "Standard (≤36h)",
      "Overtime (>36h)",
      "Classes",
      "Practice Sessions",
      "Leaves",
      "Missing Logs",
      "Compliance %",
      "Weekly Status"
    ]);

    r.weeklySummaries.forEach(w => {
      sheetData.push([
        w.weekLabel,
        w.dateRange,
        w.requiredDays,
        w.loggedDays,
        w.totalHours,
        w.standardHours,
        w.overtimeHours,
        w.classesCount,
        w.practiceSessionsCount,
        w.totalLeaves,
        w.missedLogs,
        `${w.complianceRate}%`,
        w.status
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 13 },
      { wch: 12 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 22 },
      { wch: 18 },
      { wch: 25 },
      { wch: 45 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const filename = `Full_Team_Instructor_Reports_${startDateStr}_to_${endDateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
}
