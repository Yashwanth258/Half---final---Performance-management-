import React, { useState, useMemo, useEffect } from 'react';
import { 
  Flame, 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  BookOpen, 
  FileText, 
  Layers, 
  Eye, 
  X,
  CalendarDays,
  CalendarRange,
  Check,
  Sparkles,
  UserCheck,
  Info,
  PieChart as PieIcon,
  HeartHandshake,
  GraduationCap,
  Palmtree,
  AlertTriangle,
  HeartPulse,
  UserX,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { UserProfile, DailyUpdate } from '../../types';
import { TrainerSearchAutocomplete } from './TrainerSearchAutocomplete';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { PermissionGuard } from '../common/PermissionGuard';

interface TrainerBurnoutWeeklyViewProps {
  trainers: UserProfile[];
  dailyUpdates: DailyUpdate[];
  selectedTrainerId?: string;
  onSelectTrainer?: (trainerId: string) => void;
}

export interface DayLogData {
  dayLabel: string;
  dayIndex: number;
  dateStr: string;
  formattedDate: string;
  hoursLogged: number;
  standardHours: number; // 6.0 standard
  burnoutHours: number; // Math.max(0, hoursLogged - 6.0)
  underHours: number; // Math.max(0, 6.0 - hoursLogged)
  leaveHours: number;
  missedHours: number;
  displayTotalHours: number;
  isMissedLog: boolean;
  isLeave: boolean;
  leaveType?: string;
  leaveReason?: string;
  statusType: 'overtime' | 'light_day' | 'standard' | 'not_started' | 'no_log' | 'missed_log' | 'leave';
  statusLabel: string;
  statusNote: string;
  extraWorkReason: string;
  extraWorkDetails: string;
  classesCount: number;
  dayClasses: any[];
  classDurationMinutes: number;
  totalClassesDurationMinutes: number;
  practiceSessionsCount: number;
  practiceDurationMinutes: number;
  totalPracticeDurationMinutes: number;
  tasksWorkedOn: string;
  paperEvaluationHours: number;
  inServiceHours: number;
  invigilationHours: number;
  invigilationDetails?: string;
  remarks: string;
  update?: DailyUpdate | null;
}

export interface WeekData {
  weekKey: string;
  weekNumber: number;
  weekLabel: string;
  dateRangeLabel: string;
  totalHours: number;
  standardWeeklyBaseline: number; // 36.0h (6 days * 6h)
  standardHoursCompleted: number; // Math.min(totalHours, 36.0)
  netBurnoutHours: number; // Math.max(0, totalHours - 36.0)
  availableCapacity: number; // Math.max(0, 36.0 - totalHours)
  rawExtraHours: number; // sum of daily > 6h
  cancelledHours: number; // overtime cancelled by under-6h days
  overtimeDaysCount: number;
  isPreJoining: boolean;
  days: DayLogData[];
  pieData: Array<{ name: string; value: number; color: string; percentStr?: string }>;
}

export interface MonthData {
  monthIndex: number;
  monthName: string;
  monthShort: string;
  year: number;
  totalHours: number;
  standardMonthlyBaseline: number; // 144.0h
  netBurnoutHours: number;
  overtimeDaysCount: number;
  isPreJoining: boolean;
  hasLogs: boolean;
  weeks: WeekData[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORTS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const TrainerBurnoutWeeklyView: React.FC<TrainerBurnoutWeeklyViewProps> = ({
  trainers,
  dailyUpdates,
  selectedTrainerId: externalSelectedTrainerId,
  onSelectTrainer: externalOnSelectTrainer,
}) => {
  const { userProfile } = useAuth();
  const { holisticContributions = [], classes = [] } = useData();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const availableYears = [2026, 2025, 2024];
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(7); // August default
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0); // Week 1
  const [inspectingDay, setInspectingDay] = useState<DayLogData | null>(null);
  const [viewMode, setViewMode] = useState<'weekly' | 'annual'>('weekly');
  const [chartViewTab, setChartViewTab] = useState<'burnout' | 'peerEnablement'>('burnout');

  // Only use mapped trainers passed to this view
  const defaultTrainers: UserProfile[] = useMemo(() => {
    return trainers || [];
  }, [trainers]);

  const [internalSelectedTrainerId, setInternalSelectedTrainerId] = useState<string>(
    externalSelectedTrainerId || defaultTrainers[0]?.uid || ''
  );

  useEffect(() => {
    if (defaultTrainers.length > 0) {
      if (!internalSelectedTrainerId || !defaultTrainers.some(t => t.uid === internalSelectedTrainerId)) {
        setInternalSelectedTrainerId(defaultTrainers[0].uid);
      }
    }
  }, [defaultTrainers, internalSelectedTrainerId]);

  const activeTrainerId = externalSelectedTrainerId || internalSelectedTrainerId;

  const handleSelectTrainer = (id: string) => {
    setInternalSelectedTrainerId(id);
    if (externalOnSelectTrainer) {
      externalOnSelectTrainer(id);
    }
  };

  const currentTrainer = useMemo(() => {
    return defaultTrainers.find(t => t.uid === activeTrainerId) || defaultTrainers[0] || null;
  }, [defaultTrainers, activeTrainerId]);

  // Synchronize initial month when switching trainer to their joining month or current month
  useEffect(() => {
    if (currentTrainer) {
      let targetMonth = 7; // Default August
      if (currentTrainer.createdAt) {
        const parsed = new Date(currentTrainer.createdAt);
        if (!isNaN(parsed.getTime())) {
          targetMonth = parsed.getMonth();
        }
      }
      setSelectedMonthIndex(targetMonth);
      setSelectedWeekIndex(0);
    }
  }, [currentTrainer?.uid, currentTrainer?.createdAt]);

  // Real data generator strictly anchored on user creation/registration date, real calendar arithmetic, and actual work logs
  const annualMonthsData: MonthData[] = useMemo(() => {
    if (!currentTrainer) return [];

    const trainerUpdates = (dailyUpdates || []).filter(u => {
      if (u.userId && u.userId === currentTrainer.uid) return true;
      if (currentTrainer.employeeId && u.employeeId && u.employeeId.toUpperCase() === currentTrainer.employeeId.toUpperCase()) return true;
      if (currentTrainer.companyEmail && ((u as any).userEmail || (u as any).email) && ((u as any).userEmail || (u as any).email).toLowerCase() === currentTrainer.companyEmail.toLowerCase()) return true;
      if (currentTrainer.fullName && u.employeeName && u.employeeName.trim().toLowerCase() === currentTrainer.fullName.trim().toLowerCase()) return true;
      return false;
    });

    // Determine trainee registration date
    let joinYear = 2026;
    let joinMonth = 7; // August
    let joinDay = 1;
    let joinDateFormatted = 'August 2026';
    let joinIsoDateOnly = '2026-08-01';

    if (currentTrainer.createdAt) {
      const parsed = new Date(currentTrainer.createdAt);
      if (!isNaN(parsed.getTime())) {
        joinYear = parsed.getFullYear();
        joinMonth = parsed.getMonth();
        joinDay = parsed.getDate();
        joinIsoDateOnly = currentTrainer.createdAt.split('T')[0] || `${joinYear}-${String(joinMonth + 1).padStart(2, '0')}-${String(joinDay).padStart(2, '0')}`;
        joinDateFormatted = parsed.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    }

    const months: MonthData[] = [];

    for (let m = 0; m < 12; m++) {
      const monthName = MONTH_NAMES[m];
      const monthShort = MONTH_SHORTS[m];
      
      const isPreJoiningMonth = (selectedYear < joinYear) || (selectedYear === joinYear && m < joinMonth);
      const firstOfMonth = new Date(selectedYear, m, 1);
      const lastOfMonth = new Date(selectedYear, m + 1, 0);

      // Find the Monday of the week containing the 1st of the month
      const firstDayOfWeek = firstOfMonth.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const diffToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
      const startMonday = new Date(firstOfMonth);
      startMonday.setDate(firstOfMonth.getDate() + diffToMonday);

      const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const DAY_SHORTS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      const weeks: WeekData[] = [];
      let monthTotalHours = 0;
      let monthOvertimeDays = 0;
      let currentMonday = new Date(startMonday);
      let weekIndex = 0;

      while (currentMonday <= lastOfMonth || (currentMonday.getMonth() === m)) {
        const weekNumber = weekIndex + 1;
        const weekLabel = `Week ${weekNumber}`;
        const days: DayLogData[] = [];

        let weekRawExtra = 0;
        let weekLoggedDays = 0;

        // 6 working days: Monday (Day 1) to Saturday (Day 6)
        for (let offset = 0; offset < 6; offset++) {
          const dateObj = new Date(currentMonday);
          dateObj.setDate(currentMonday.getDate() + offset);
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          const dayNum = dateObj.getDate();
          const dayName = DAY_NAMES[offset];
          const dayShort = DAY_SHORTS[offset];
          const formattedDate = `${dayName}, ${MONTH_SHORTS[dateObj.getMonth()]} ${dayNum}, ${yyyy}`;
          const dayLabel = `${dayShort} (${MONTH_SHORTS[dateObj.getMonth()]} ${dayNum})`;

          const isPreJoiningDay = isPreJoiningMonth || (selectedYear === joinYear && m === joinMonth && dateStr < joinIsoDateOnly);
          const match = trainerUpdates.find(u => (u.date || '').split('T')[0] === dateStr);
          const dayClasses = (classes || []).filter(c => 
            (c.userId === currentTrainer?.uid || (currentTrainer?.employeeId && c.employeeId === currentTrainer.employeeId)) && 
            (c.date || '').split('T')[0] === dateStr && 
            c.status !== 'Cancelled'
          );

          const isPastDay = dateStr < todayStr;
          const isAfterJoin = !currentTrainer?.createdAt || dateStr >= joinIsoDateOnly;
          const isMissedLog = isPastDay && isAfterJoin && !match && !isPreJoiningDay;

          if (isPreJoiningDay && !match) {
            days.push({
              dayLabel,
              dayIndex: offset + 1,
              dateStr,
              formattedDate,
              hoursLogged: 0,
              standardHours: 6.0,
              burnoutHours: 0,
              underHours: 0,
              leaveHours: 0,
              missedHours: 0,
              displayTotalHours: 0,
              isMissedLog: false,
              isLeave: false,
              statusType: 'not_started',
              statusLabel: 'Pre-joining',
              statusNote: `Account created on ${joinDateFormatted}. No records prior to joining date.`,
              extraWorkReason: 'None',
              extraWorkDetails: '',
              classesCount: 0,
              dayClasses: [],
              classDurationMinutes: 0,
              totalClassesDurationMinutes: 0,
              practiceSessionsCount: 0,
              practiceDurationMinutes: 0,
              totalPracticeDurationMinutes: 0,
              tasksWorkedOn: '',
              paperEvaluationHours: 0,
              inServiceHours: 0,
              invigilationHours: 0,
              remarks: '',
              update: null
            });
            continue;
          }

          const isLeave = !!match?.isLeave;
          const leaveType = match?.leaveType || 'NONE';
          const leaveReason = match?.leaveReason || '';
          const invigilationHours = match?.invigilationHours || 0;
          const invigilationDetails = match?.invigilationDetails || '';

          let hoursLogged = 0;
          let extraWorkReason = 'None';
          let extraWorkDetails = '';
          let classesCount = match?.classesCount !== undefined ? match.classesCount : dayClasses.length;
          let classDurationMinutes = match?.classDurationMinutes || 60;
          let practiceSessionsCount = match?.practiceSessionsCount ?? 0;
          let practiceDurationMinutes = match?.practiceDurationMinutes || 60;
          let tasksWorkedOn = match?.tasksWorkedOn || (match as any)?.workSummary || '';
          let paperEvaluationHours = match?.paperEvaluationHours || 0;
          let inServiceHours = match?.inServiceHours || 0;
          let remarks = match?.remarks || '';

          if (match) {
            hoursLogged = Number(match.hoursLogged ?? match.calculatedTotalHours ?? (isLeave ? (leaveType === 'UNPAID_LEAVE' ? 0 : 6) : 0));
            extraWorkReason = match.extraWorkReason || (hoursLogged > 6.0 ? 'Overtime' : 'None');
            extraWorkDetails = match.extraWorkDetails || '';
            weekLoggedDays++;
          }

          let standardHours = 0;
          let burnoutHours = 0;
          let leaveHours = 0;
          let missedHours = 0;

          let statusType: DayLogData['statusType'] = 'no_log';
          let statusLabel = 'No Log';
          let statusNote = 'No work log submitted for this day';

          if (isMissedLog) {
            // User forgot to fill the log and opens next day - show full 6 hrs in red bar graph!
            missedHours = 6.0;
            statusType = 'missed_log';
            statusLabel = 'Missed Log (6.0h Deficit)';
            statusNote = 'Instructor missed submitting daily work log for this workday. 6.0h deficit.';
          } else if (isLeave) {
            leaveHours = 6.0;
            statusType = 'leave';
            statusLabel = leaveType === 'CASUAL_LEAVE' 
              ? 'Casual Leave (CL)' 
              : leaveType === 'SICK_LEAVE' 
              ? 'Sick Leave (SL)' 
              : 'Unpaid Leave (LOP)';
            statusNote = leaveReason ? `Taken Leave: ${leaveReason}` : 'Taken Leave';
          } else if (hoursLogged > 6.0) {
            standardHours = 6.0;
            burnoutHours = Math.max(0, Number((hoursLogged - 6.0).toFixed(1)));
            weekRawExtra += burnoutHours;
            monthOvertimeDays++;
            statusType = 'overtime';
            statusLabel = `+${burnoutHours}h Overtime`;
            if (extraWorkDetails && extraWorkReason && extraWorkReason !== 'None') {
              statusNote = `${extraWorkReason}: ${extraWorkDetails}`;
            } else if (extraWorkDetails) {
              statusNote = extraWorkDetails;
            } else if (extraWorkReason && extraWorkReason !== 'None') {
              statusNote = `${extraWorkReason} (+${burnoutHours}h overtime)`;
            } else if (remarks) {
              statusNote = `${remarks} (+${burnoutHours}h overtime)`;
            } else {
              statusNote = `Extended schedule (+${burnoutHours}h overtime)`;
            }
          } else if (hoursLogged > 0 && hoursLogged < 6.0) {
            standardHours = hoursLogged;
            const underHoursVal = Math.max(0, Number((6.0 - hoursLogged).toFixed(1)));
            statusType = 'light_day';
            statusLabel = `-${underHoursVal}h Light Day`;
            statusNote = extraWorkDetails || remarks || `Light day (-${underHoursVal}h balances overtime)`;
          } else if (hoursLogged === 6.0) {
            standardHours = 6.0;
            statusType = 'standard';
            statusLabel = 'Standard 6.0h';
            statusNote = remarks || extraWorkDetails || 'Standard 6.0h completed';
          } else {
            statusType = 'no_log';
            statusLabel = 'Pending';
            statusNote = 'No work log submitted for this day';
          }

          const underHours = (hoursLogged > 0 && hoursLogged < 6.0 && !isLeave && !isMissedLog)
            ? Math.max(0, Number((6.0 - hoursLogged).toFixed(1)))
            : 0;

          const displayTotalHours = isMissedLog ? 6.0 : (isLeave ? leaveHours : hoursLogged);

          days.push({
            dayLabel,
            dayIndex: offset + 1,
            dateStr,
            formattedDate,
            hoursLogged: Number(hoursLogged.toFixed(1)),
            standardHours,
            burnoutHours,
            underHours,
            leaveHours,
            missedHours,
            displayTotalHours,
            isMissedLog,
            isLeave,
            leaveType,
            leaveReason,
            statusType,
            statusLabel,
            statusNote,
            extraWorkReason,
            extraWorkDetails,
            classesCount,
            dayClasses,
            classDurationMinutes,
            totalClassesDurationMinutes: classesCount * classDurationMinutes,
            practiceSessionsCount,
            practiceDurationMinutes,
            totalPracticeDurationMinutes: practiceSessionsCount * practiceDurationMinutes,
            tasksWorkedOn,
            paperEvaluationHours,
            inServiceHours,
            invigilationHours,
            invigilationDetails,
            remarks,
            update: match || null
          });
        }

        const firstDay = days[0];
        const lastDay = days[5];
        const firstDate = new Date(firstDay.dateStr);
        const lastDate = new Date(lastDay.dateStr);
        const dateRangeLabel = `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

        const weekTotalHours = Number(days.reduce((sum, d) => sum + d.hoursLogged, 0).toFixed(1));
        const standardWeeklyBaseline = 36.0; // Fixed 6 days * 6h = 36.0 hours target
        const standardHoursCompleted = Math.min(weekTotalHours, standardWeeklyBaseline);
        const netBurnoutHours = Math.max(0, Number((weekTotalHours - standardWeeklyBaseline).toFixed(1)));
        const availableCapacity = Math.max(0, Number((standardWeeklyBaseline - weekTotalHours).toFixed(1)));
        const cancelledHours = Number((weekRawExtra - netBurnoutHours).toFixed(1));
        const overtimeDaysCount = days.filter(d => d.hoursLogged > 6.0).length;

        monthTotalHours += weekTotalHours;

        // Pie chart breakdown: Normal standard work (36.0h max) vs Burnout overtime vs Remaining capacity
        const pieData = weekTotalHours === 0 ? [
          { name: 'Remaining Target Capacity', value: 36.0, color: '#f1f5f9', percentStr: '100%' }
        ] : [
          { 
            name: 'Normal Standard Work', 
            value: standardHoursCompleted, 
            color: '#38bdf8',
            percentStr: `${Math.round((standardHoursCompleted / (weekTotalHours || 36.0)) * 100)}%`
          },
          ...(netBurnoutHours > 0 ? [{ 
            name: 'Burnout Overtime', 
            value: netBurnoutHours, 
            color: '#fbbf24',
            percentStr: `${Math.round((netBurnoutHours / weekTotalHours) * 100)}%`
          }] : []),
          ...(availableCapacity > 0 ? [{ 
            name: 'Remaining Capacity', 
            value: availableCapacity, 
            color: '#e2e8f0',
            percentStr: `${Math.round((availableCapacity / standardWeeklyBaseline) * 100)}%`
          }] : [])
        ];

        weeks.push({
          weekKey: `w-${weekIndex + 1}`,
          weekNumber,
          weekLabel,
          dateRangeLabel,
          totalHours: weekTotalHours,
          standardWeeklyBaseline,
          standardHoursCompleted,
          netBurnoutHours,
          availableCapacity,
          rawExtraHours: Number(weekRawExtra.toFixed(1)),
          cancelledHours,
          overtimeDaysCount,
          isPreJoining: isPreJoiningMonth,
          days,
          pieData
        });

        // Advance to next Monday
        currentMonday = new Date(currentMonday);
        currentMonday.setDate(currentMonday.getDate() + 7);
        weekIndex++;
      }

      const standardMonthlyBaseline = 144.0;
      const monthNetBurnout = Math.max(0, Number((monthTotalHours - standardMonthlyBaseline).toFixed(1)));
      const hasLogs = monthTotalHours > 0;

      months.push({
        monthIndex: m,
        monthName,
        monthShort,
        year: selectedYear,
        totalHours: Number(monthTotalHours.toFixed(1)),
        standardMonthlyBaseline,
        netBurnoutHours: monthNetBurnout,
        overtimeDaysCount: monthOvertimeDays,
        isPreJoining: isPreJoiningMonth,
        hasLogs,
        weeks
      });
    }

    return months;
  }, [currentTrainer, dailyUpdates, selectedYear, classes, todayStr]);

  const activeMonth = annualMonthsData[selectedMonthIndex] || annualMonthsData[7] || annualMonthsData[0];
  const safeWeekIndex = Math.min(selectedWeekIndex, Math.max(0, (activeMonth?.weeks.length || 1) - 1));
  const activeWeek: WeekData = activeMonth?.weeks[safeWeekIndex] || activeMonth?.weeks[0] || {
    weekKey: 'w-1',
    weekNumber: 1,
    weekLabel: 'Week 1',
    dateRangeLabel: 'Aug 1 - Aug 6',
    totalHours: 0,
    standardWeeklyBaseline: 36.0,
    standardHoursCompleted: 0,
    netBurnoutHours: 0,
    availableCapacity: 36.0,
    rawExtraHours: 0,
    cancelledHours: 0,
    overtimeDaysCount: 0,
    isPreJoining: false,
    days: [],
    pieData: [{ name: 'Remaining Target Capacity', value: 36.0, color: '#e2e8f0', percentStr: '100%' }]
  };

  // Clean Day-wise chart data with rich telemetry for mouse hover
  const dayWiseChartData = useMemo(() => {
    if (!activeWeek) return [];
    return activeWeek.days.map(d => ({
      name: `Day ${d.dayIndex}`,
      fullLabel: `${d.dayLabel} • ${d.formattedDate}`,
      dateStr: d.dateStr,
      standardHours: d.standardHours,
      burnoutHours: d.burnoutHours,
      leaveHours: d.leaveHours,
      missedHours: d.missedHours,
      totalHours: d.displayTotalHours,
      hoursLogged: d.hoursLogged,
      underHours: d.underHours,
      isMissedLog: d.isMissedLog,
      isLeave: d.isLeave,
      leaveType: d.leaveType,
      leaveReason: d.leaveReason,
      statusType: d.statusType,
      statusLabel: d.statusLabel,
      statusNote: d.statusNote,
      reason: d.extraWorkReason,
      extraWorkDetails: d.extraWorkDetails,
      classesCount: d.classesCount,
      dayClasses: d.dayClasses,
      practiceSessionsCount: d.practiceSessionsCount,
      invigilationHours: d.invigilationHours,
      invigilationDetails: d.invigilationDetails,
      paperEvaluationHours: d.paperEvaluationHours,
      inServiceHours: d.inServiceHours,
      tasksWorkedOn: d.tasksWorkedOn,
      remarks: d.remarks
    }));
  }, [activeWeek]);

  // Annual chart data
  const annualBarChartData = useMemo(() => {
    return annualMonthsData.map(m => ({
      name: m.monthShort,
      monthName: m.monthName,
      monthIndex: m.monthIndex,
      totalHours: m.totalHours,
      standardHours: Math.min(144, m.totalHours),
      netBurnout: m.netBurnoutHours,
      isPreJoining: m.isPreJoining,
      isSelected: m.monthIndex === selectedMonthIndex,
    }));
  }, [annualMonthsData, selectedMonthIndex]);

  // Determine current trainer join date text
  const currentTrainerJoinText = useMemo(() => {
    if (!currentTrainer?.createdAt) return 'August 2026';
    const parsed = new Date(currentTrainer.createdAt);
    return !isNaN(parsed.getTime()) 
      ? parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'August 2026';
  }, [currentTrainer?.createdAt]);

  // Peer Enablement & Holistic Mentorship Data for Selected Trainer
  const trainerHolisticList = useMemo(() => {
    if (!currentTrainer) return [];
    return (holisticContributions || []).filter(h => {
      if (h.userId && h.userId === currentTrainer.uid) return true;
      if (currentTrainer.employeeId && h.employeeId && h.employeeId.toUpperCase() === currentTrainer.employeeId.toUpperCase()) return true;
      if (currentTrainer.companyEmail && ((h as any).userEmail || (h as any).email) && ((h as any).userEmail || (h as any).email).toLowerCase() === currentTrainer.companyEmail.toLowerCase()) return true;
      if (currentTrainer.fullName && h.employeeName && h.employeeName.trim().toLowerCase() === currentTrainer.fullName.trim().toLowerCase()) return true;
      return false;
    });
  }, [holisticContributions, currentTrainer]);

  const trainerHolisticTotalHours = useMemo(() => {
    const totalMins = trainerHolisticList.reduce((acc, curr) => acc + (Number(curr.durationMinutes) || 0), 0);
    return Number((totalMins / 60).toFixed(1));
  }, [trainerHolisticList]);

  const peerEnablementPieData = useMemo(() => {
    if (trainerHolisticList.length === 0) {
      return [
        { name: 'No Peer Work Logged', value: 1, hours: 0, color: '#e2e8f0', percentStr: '0.0h (0%)' }
      ];
    }
    const categoryHours: Record<string, number> = {};
    let totalMins = 0;
    trainerHolisticList.forEach(item => {
      const mins = Number(item.durationMinutes) || 30;
      const cat = item.category || 'General Guidance';
      categoryHours[cat] = (categoryHours[cat] || 0) + (mins / 60);
      totalMins += mins;
    });
    const totalHrs = totalMins / 60;
    const categoryColors: Record<string, string> = {
      'Emotional & Wellbeing Guidance': '#fb7185',
      'Peer Collaboration & Doubt Clearing': '#38bdf8',
      'Administrative & Distribution Support': '#fb923c',
      'Community & Context Collaboration': '#818cf8',
      'Lab & Practical Support': '#34d399',
      'Lab & Practical Assistance': '#34d399',
      'Trainee Motivation & Career Mentorship': '#c084fc',
      'Syllabus Enrichment & Code Reviews': '#22d3ee',
    };
    const defaultColors = ['#fb7185', '#38bdf8', '#fbbf24', '#818cf8', '#34d399', '#c084fc', '#22d3ee', '#f472b6'];
    let colorIdx = 0;
    return Object.entries(categoryHours).map(([catName, hrs]) => {
      const roundedHrs = Number(hrs.toFixed(1));
      const pct = totalHrs > 0 ? Math.round((roundedHrs / totalHrs) * 100) : 0;
      const color = categoryColors[catName] || defaultColors[colorIdx++ % defaultColors.length];
      return {
        name: catName,
        value: roundedHrs,
        hours: roundedHrs,
        color,
        percentStr: `${roundedHrs}h (${pct}%)`
      };
    });
  }, [trainerHolisticList]);

  if (defaultTrainers.length === 0) {
    return (
      <div className="rounded-2xl border border-sky-100 bg-white p-12 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-3">
          <UserCheck className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">No Mapped Trainees Available</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Burnout risk and workload logs will automatically be tracked once trainees register or assign you as their reporting manager.
        </p>
      </div>
    );
  }

  return (
    <PermissionGuard
      trainer={currentTrainer}
      manager={userProfile}
      fallbackTrainer={defaultTrainers[0]}
      onSelectFallbackTrainer={handleSelectTrainer}
    >
      <div id="trainer-burnout-weekly-view-simple" className="space-y-6">
        {/* 1. Header & Trainer Selection */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 font-extrabold text-lg border border-sky-200">
              {currentTrainer?.fullName?.slice(0, 2).toUpperCase() || 'TR'}
            </div>

            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xs font-extrabold uppercase tracking-wider text-sky-600">Instructor</span>
                <span className="rounded-md bg-sky-50 px-2 py-0.5 text-2xs font-extrabold text-sky-700 border border-sky-200">
                  {currentTrainer?.employeeId}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-700">
                  {currentTrainer?.department}
                </span>
                <span className="text-xs text-slate-500 hidden md:inline truncate">
                  • {currentTrainer?.designation}
                </span>
              </div>

              {/* Search Combobox */}
              <div className="max-w-md">
                <TrainerSearchAutocomplete
                  trainers={defaultTrainers}
                  selectedTrainerId={activeTrainerId}
                  onSelectTrainer={handleSelectTrainer}
                  placeholder="Search instructor by name or ID..."
                />
              </div>
            </div>
          </div>

          {/* Year and Mode Toggle */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <Calendar className="h-4 w-4 text-sky-600 ml-1" />
              <label htmlFor="year-select" className="text-xs font-bold text-slate-600">Year:</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-800"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('weekly')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  viewMode === 'weekly' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekly View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('annual')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  viewMode === 'annual' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                12-Month Trends
              </button>
            </div>
          </div>
        </div>

        {/* Simple Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Daily Standard</span>
            <span className="text-base font-extrabold text-slate-900">6.0 hrs / day</span>
            <span className="text-2xs text-slate-500 block">6 work days / week</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Weekly Standard</span>
            <span className="text-base font-extrabold text-slate-900">{activeWeek.standardWeeklyBaseline} hrs / week</span>
            <span className="text-2xs text-slate-500 block">{activeWeek.days.length} Days &times; 6.0h Baseline</span>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center">
            <span className="text-2xs font-bold text-sky-700 uppercase tracking-wider block">{activeWeek.weekLabel} Worked</span>
            <span className="text-base font-extrabold text-sky-950">{activeWeek.totalHours} hrs</span>
            <span className="text-2xs text-sky-700 block">Target: {activeWeek.standardWeeklyBaseline} hrs</span>
          </div>

          <div className={`rounded-xl border p-3 text-center ${
            activeWeek.netBurnoutHours > 0 
              ? 'border-amber-300 bg-amber-50 text-amber-900' 
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}>
            <span className="text-2xs font-bold uppercase tracking-wider block">Weekly Burnout</span>
            <span className="text-base font-extrabold">
              {activeWeek.netBurnoutHours > 0 ? `+${activeWeek.netBurnoutHours} hrs` : '0.0 hrs (Balanced)'}
            </span>
            <span className="text-2xs opacity-80 block">
              {activeWeek.netBurnoutHours > 0 ? `${activeWeek.overtimeDaysCount} Overtime Days` : 'All Overtime Balanced'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Month Selector Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <CalendarRange className="h-4 w-4 text-sky-600" />
            Select Month ({selectedYear}):
          </span>
          <div className="flex items-center gap-2">
            {activeMonth.isPreJoining && (
              <span className="rounded-md bg-slate-100 text-slate-600 text-2xs px-2 py-0.5 font-bold">
                Pre-Joining Month
              </span>
            )}
            <span className="text-xs font-extrabold text-sky-700">
              {activeMonth.monthName} {selectedYear}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {annualMonthsData.map((m) => {
            const isSelected = m.monthIndex === selectedMonthIndex;
            if (m.isPreJoining) {
              return (
                <button
                  key={m.monthShort}
                  type="button"
                  onClick={() => {
                    setSelectedMonthIndex(m.monthIndex);
                    setSelectedWeekIndex(0);
                  }}
                  className={`py-2 px-1 rounded-xl text-center transition-all border text-xs cursor-pointer ${
                    isSelected
                      ? 'bg-slate-700 border-slate-700 text-white font-extrabold shadow-xs'
                      : 'bg-slate-50/50 border-slate-200/60 text-slate-400 hover:bg-slate-100/60'
                  }`}
                  title={`${m.monthName} is prior to account registration (${currentTrainerJoinText})`}
                >
                  <span className="block font-medium">{m.monthShort}</span>
                  <span className={`text-2xs block mt-0.5 ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                    Pre-join
                  </span>
                </button>
              );
            }

            return (
              <button
                key={m.monthShort}
                type="button"
                onClick={() => {
                  setSelectedMonthIndex(m.monthIndex);
                  setSelectedWeekIndex(0);
                }}
                className={`py-2 px-1 rounded-xl text-center transition-all border text-xs cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 border-sky-600 text-white font-extrabold shadow-xs'
                    : m.netBurnoutHours > 0
                    ? 'bg-amber-50 border-amber-200 text-slate-800 hover:bg-amber-100'
                    : m.totalHours > 0
                    ? 'bg-sky-50/60 border-sky-200 text-slate-800 hover:bg-sky-100/60'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="block font-bold">{m.monthShort}</span>
                <span className={`text-2xs block mt-0.5 ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                  {m.totalHours}h
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pre-Joining Notice Banner if Selected Month is prior to registration */}
      {activeMonth.isPreJoining && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 flex items-center gap-3 text-xs text-slate-600">
          <Info className="h-5 w-5 text-slate-400 shrink-0" />
          <div>
            <strong className="text-slate-800 font-bold">Pre-Joining Period:</strong>{' '}
            <span className="text-slate-700 font-semibold">{currentTrainer?.fullName}</span> created an account on{' '}
            <strong className="text-slate-800">{currentTrainerJoinText}</strong>. No historical work logs or workload records exist prior to the registration date.
          </div>
        </div>
      )}

      {/* 3. Annual 12-Month Chart View (if toggled) */}
      {viewMode === 'annual' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky-600" />
                12-Month Work Hours ({selectedYear})
              </h3>
              <p className="text-xs text-slate-500">
                Standard monthly target is 144 hours. Pre-joining months show 0.0 hrs.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-sky-600" />
                <span className="text-slate-600">Standard Hours</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-amber-500" />
                <span className="text-slate-600">Burnout Overtime</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualBarChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="h" />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md text-xs space-y-1">
                          <div className="font-bold text-slate-900">{data.monthName} {selectedYear}</div>
                          {data.isPreJoining ? (
                            <div className="text-slate-500 italic">Pre-joining period (Account joined: {currentTrainerJoinText})</div>
                          ) : (
                            <>
                              <div className="text-slate-600">Total Worked: <strong>{data.totalHours} hrs</strong></div>
                              {data.netBurnout > 0 ? (
                                <div className="text-amber-700 font-bold">Burnout Overtime: +{data.netBurnout} hrs</div>
                              ) : (
                                <div className="text-emerald-600 font-bold">0.0 hrs (Balanced)</div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine 
                  y={144} 
                  stroke="#e11d48" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: '144h Target', 
                    fill: '#e11d48', 
                    fontSize: 11, 
                    fontWeight: 'bold',
                    position: 'top',
                    dy: -6
                  }} 
                />
                <Bar dataKey="standardHours" stackId="a" fill="#0284c7" radius={[0, 0, 4, 4]} />
                <Bar 
                  dataKey="netBurnout" 
                  stackId="a" 
                  fill="#f59e0b" 
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    setSelectedMonthIndex(data.monthIndex);
                    setViewMode('weekly');
                  }}
                >
                  {annualBarChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isSelected ? '#e11d48' : entry.netBurnout > 0 ? '#f59e0b' : entry.isPreJoining ? '#cbd5e1' : '#0284c7'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Week Tabs for Selected Month */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-sky-600" />
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            {activeMonth.monthName} {selectedYear} &bull; <span className="text-sky-600">{currentTrainer?.fullName}</span>
          </h2>
        </div>

        {/* Week buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {activeMonth.weeks.map((w, idx) => (
            <button
              key={w.weekKey}
              type="button"
              onClick={() => setSelectedWeekIndex(idx)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedWeekIndex === idx
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>{w.weekLabel}</span>
              {w.netBurnoutHours > 0 ? (
                <span className={`rounded-full px-1.5 py-0.2 text-2xs font-extrabold ${
                  selectedWeekIndex === idx ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800'
                }`}>
                  +{w.netBurnoutHours}h
                </span>
              ) : (
                <span className={`text-2xs ${selectedWeekIndex === idx ? 'text-sky-100' : 'text-slate-400'}`}>
                  {w.totalHours}h
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Visual Day-Wise Chart and Weekly Burnout Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Day-Wise Bar Chart (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sky-600" />
                  <span>Daily Workload ({activeWeek.weekLabel}: {activeWeek.dateRangeLabel})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Standard work time is <strong>6.0 hours/day</strong>. Mon–Sat standard schedule.
                </p>
              </div>

              <div className="flex items-center gap-2.5 text-2xs flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-xs bg-sky-600" />
                  <span className="text-slate-600 font-medium">Standard (≤6h)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
                  <span className="text-slate-600 font-medium">Overtime (&gt;6h)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-xs bg-purple-500" />
                  <span className="text-slate-600 font-medium">Leave (6h)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
                  <span className="text-slate-600 font-medium">Missed Log (6h Red)</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayWiseChartData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit="h" domain={[0, (dataMax: number) => Math.max(8, Math.ceil(dataMax + 1))]} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const isMissed = d.isMissedLog;
                        const isLeave = d.isLeave;
                        const leaveTitle = d.leaveType === 'CASUAL_LEAVE' 
                          ? 'Casual Leave (CL)' 
                          : d.leaveType === 'SICK_LEAVE' 
                          ? 'Sick Leave (SL)' 
                          : d.leaveType === 'UNPAID_LEAVE' 
                          ? 'Unpaid Leave (LOP)' 
                          : 'Taken Leave';

                        return (
                          <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-3.5 shadow-xl text-xs space-y-2 max-w-xs z-50 animate-in fade-in zoom-in-95">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div>
                                <div className="font-extrabold text-slate-900 text-sm">{d.fullLabel}</div>
                                <div className="text-[10px] text-slate-500 font-medium">{d.dateStr}</div>
                              </div>
                              {isMissed ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 border border-rose-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                                  Missed Log
                                </span>
                              ) : isLeave ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-700 border border-purple-300">
                                  <Palmtree className="h-3 w-3" />
                                  {leaveTitle}
                                </span>
                              ) : d.hoursLogged > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-300">
                                  <CheckCircle2 className="h-3 w-3 text-sky-600" />
                                  {d.hoursLogged}h Logged
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                  Pending
                                </span>
                              )}
                            </div>

                            {/* Classes Taken Telemetry */}
                            <div className="rounded-xl bg-slate-50 p-2.5 space-y-1.5 border border-slate-100">
                              <div className="flex items-center justify-between text-slate-800">
                                <span className="font-bold flex items-center gap-1.5 text-xs text-sky-900">
                                  <GraduationCap className="h-4 w-4 text-sky-600" />
                                  Classes Taken:
                                </span>
                                <span className={`font-black text-xs px-2 py-0.5 rounded-md ${
                                  d.classesCount > 0 ? 'bg-sky-100 text-sky-900' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {d.classesCount} {d.classesCount === 1 ? 'Class' : 'Classes'}
                                </span>
                              </div>

                              {/* Scheduled Class Items List if available */}
                              {d.dayClasses && d.dayClasses.length > 0 ? (
                                <div className="space-y-1 pt-1 border-t border-slate-200/70">
                                  {d.dayClasses.slice(0, 3).map((cls: any, cIdx: number) => (
                                    <div key={cls.id || cIdx} className="text-[11px] text-slate-700 flex items-start gap-1">
                                      <span className="text-sky-600 font-bold">•</span>
                                      <div className="truncate">
                                        <strong className="text-slate-900">{cls.className}</strong>
                                        {cls.batch ? ` (${cls.batch})` : ''}
                                        {cls.startTime ? ` • ${cls.startTime}` : ''}
                                      </div>
                                    </div>
                                  ))}
                                  {d.dayClasses.length > 3 && (
                                    <div className="text-[10px] text-slate-500 font-medium italic pl-2">
                                      +{d.dayClasses.length - 3} more class sessions
                                    </div>
                                  )}
                                </div>
                              ) : isLeave ? (
                                <p className="text-[11px] text-purple-700 italic">
                                  0 classes scheduled (On Leave)
                                </p>
                              ) : isMissed ? (
                                <p className="text-[11px] text-rose-600 font-semibold italic">
                                  No log submitted &bull; 6h shift unaccounted
                                </p>
                              ) : (
                                <p className="text-[11px] text-slate-500 italic">
                                  {d.classesCount > 0 ? `${d.classesCount} class sessions delivered` : 'No lecture classes scheduled'}
                                </p>
                              )}

                              {d.practiceSessionsCount > 0 && (
                                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                                  <span>Practice & Labs:</span>
                                  <strong className="text-slate-800">{d.practiceSessionsCount} sessions</strong>
                                </div>
                              )}
                            </div>

                            {/* Additional Responsibilities (Invigilation, Evaluations) */}
                            {(d.invigilationHours > 0 || d.paperEvaluationHours > 0 || d.inServiceHours > 0) && (
                              <div className="rounded-xl bg-indigo-50/60 p-2 text-[11px] space-y-1 border border-indigo-100">
                                <div className="font-bold text-indigo-900 flex items-center gap-1">
                                  <FileCheck2 className="h-3.5 w-3.5 text-indigo-600" />
                                  Additional Duties:
                                </div>
                                {d.invigilationHours > 0 && (
                                  <div className="text-rose-700 font-semibold flex items-center justify-between">
                                    <span>Exam Invigilation:</span>
                                    <strong>{d.invigilationHours} hrs{d.invigilationDetails ? ` (${d.invigilationDetails})` : ''}</strong>
                                  </div>
                                )}
                                {d.paperEvaluationHours > 0 && (
                                  <div className="text-indigo-800 flex items-center justify-between">
                                    <span>Paper Evaluation:</span>
                                    <strong>{d.paperEvaluationHours} hrs</strong>
                                  </div>
                                )}
                                {d.inServiceHours > 0 && (
                                  <div className="text-teal-800 flex items-center justify-between">
                                    <span>In-Service Training:</span>
                                    <strong>{d.inServiceHours} hrs</strong>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Leave Reason Note */}
                            {isLeave && d.leaveReason && (
                              <div className="rounded-xl bg-purple-50 p-2 text-[11px] text-purple-900 border border-purple-200">
                                <span className="font-bold">Leave Reason: </span>
                                <span>{d.leaveReason}</span>
                              </div>
                            )}

                            {/* Missed Log Warning Callout */}
                            {isMissed && (
                              <div className="rounded-xl bg-rose-50 p-2.5 text-[11px] text-rose-900 border border-rose-200 space-y-1">
                                <div className="font-bold flex items-center gap-1 text-rose-800">
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                  Missed Work Log (6.0h Deficit)
                                </div>
                                <p className="text-[10px] text-rose-700 leading-tight">
                                  Instructor did not submit daily work log for this workday.
                                </p>
                              </div>
                            )}

                            {/* Workload Hours Totals */}
                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-600">Standard Shift:</span>
                              <span className="text-slate-900">{isMissed ? '0.0h' : isLeave ? `${d.leaveHours}h (Leave)` : `${d.standardHours}h`}</span>
                            </div>
                            {d.burnoutHours > 0 && (
                              <div className="flex items-center justify-between text-xs font-bold text-amber-700">
                                <span>Overtime:</span>
                                <span>+{d.burnoutHours} hrs</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs font-black text-sky-800 pt-1 border-t border-slate-100">
                              <span>Total Time Accounted:</span>
                              <span className={isMissed ? 'text-rose-600' : isLeave ? 'text-purple-700' : 'text-sky-700'}>
                                {d.totalHours} hrs {isMissed ? '(Deficit)' : isLeave ? '(Leave)' : ''}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine 
                    y={6} 
                    stroke="#0284c7" 
                    strokeDasharray="4 4" 
                    strokeWidth={1.5}
                    label={{ 
                      value: '6h Daily Standard', 
                      fill: '#0284c7', 
                      fontSize: 10, 
                      position: 'insideTopRight' 
                    }} 
                  />
                  <Bar 
                    dataKey="standardHours" 
                    name="Standard Work (≤6h)" 
                    fill="#0284c7" 
                    stackId="a" 
                    radius={[0, 0, 0, 0]} 
                  />
                  <Bar 
                    dataKey="burnoutHours" 
                    name="Burnout Overtime (>6h)" 
                    fill="#f59e0b" 
                    stackId="a" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="leaveHours" 
                    name="Taken Leave (6h)" 
                    fill="#8b5cf6" 
                    stackId="a" 
                    radius={[4, 4, 0, 0]} 
                  />
                  <Bar 
                    dataKey="missedHours" 
                    name="Missed Log (6h Red)" 
                    fill="#ef4444" 
                    stackId="a" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span><strong className="text-slate-800">{activeWeek.totalHours} hrs</strong> worked</span>
            <span>Target: <strong className="text-slate-800">{activeWeek.standardWeeklyBaseline} hrs</strong> (6 Workdays)</span>
            <span className={activeWeek.netBurnoutHours > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
              {activeWeek.netBurnoutHours > 0 ? `Burnout: +${activeWeek.netBurnoutHours}h` : 'Balanced (0h Burnout)'}
            </span>
          </div>
        </div>

        {/* Right: Weekly Capacity & Burnout / Peer Enablement Distribution Pie Chart (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <PieIcon className="h-3.5 w-3.5 text-sky-600" />
                <span>Weekly Capacity Allocation (36h SLA)</span>
              </span>

              <span className={`text-2xs font-bold px-2 py-0.5 rounded-md ${
                activeWeek.netBurnoutHours > 0 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {activeWeek.netBurnoutHours > 0 ? 'Burnout Risk' : 'Healthy Load'}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-2">
              Weekly target: <strong>36.0 hrs</strong> (6 days &times; 6.0 hrs/day).
            </p>

            <div className="h-48 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeWeek.pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {activeWeek.pieData.map((entry, index) => (
                      <Cell key={`cell-cap-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: number) => [`${val} hrs`, '']}
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Center Metric */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-black text-slate-900">{activeWeek.totalHours}h</span>
                <span className="text-[10px] text-slate-500">/ {activeWeek.standardWeeklyBaseline}h</span>
              </div>
            </div>

            {/* Slices Legend */}
            <div className="space-y-1 text-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-600 shrink-0" />
                  <span>Standard Work Met:</span>
                </span>
                <strong className="text-slate-900 text-xs">{activeWeek.standardHoursCompleted} hrs</strong>
              </div>
              {activeWeek.netBurnoutHours > 0 && (
                <div className="flex items-center justify-between text-amber-700 font-bold text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Burnout Overtime:</span>
                  </span>
                  <span>+{activeWeek.netBurnoutHours} hrs</span>
                </div>
              )}
              {activeWeek.availableCapacity > 0 && (
                <div className="flex items-center justify-between text-slate-500 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300 shrink-0" />
                    <span>Remaining Capacity:</span>
                  </span>
                  <span>{activeWeek.availableCapacity} hrs</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
            <span>6 Working Days (Mon–Sat)</span>
            <span className="text-emerald-700 font-medium">Sunday: Off (0h)</span>
          </div>
        </div>
      </div>

      {/* 6. Simple Clean Table (Removed accumulated logged, accumulated standard, daily variance) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-600" />
              Daily Work & Burnout Log ({activeWeek.weekLabel} &bull; {activeMonth.monthName} {selectedYear})
            </h3>
            <p className="text-xs text-slate-500">
              Each day has a 6-hour standard work time. See how much was worked and the burnout status.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
            Week Total: <strong>{activeWeek.totalHours} hrs</strong> (Standard: {activeWeek.standardWeeklyBaseline}h)
          </span>
        </div>

        {/* Clean, Simple Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-700 font-bold uppercase tracking-wider text-2xs">
                <th className="py-3 px-3">Day & Date</th>
                <th className="py-3 px-3">Standard Time</th>
                <th className="py-3 px-3">Hours Worked</th>
                <th className="py-3 px-3">Burnout / Overtime</th>
                <th className="py-3 px-3">Status & Notes</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeWeek.days.map((day) => {
                const isPreJoin = day.statusType === 'not_started';
                const isMissed = day.isMissedLog;
                const isLeave = day.isLeave;
                const isNoLog = day.statusType === 'no_log';
                const isOvertime = day.statusType === 'overtime';
                const isLightDay = day.statusType === 'light_day';

                return (
                  <tr 
                    key={day.dayLabel} 
                    className={`transition-colors ${
                      isMissed
                        ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-500'
                        : isLeave
                        ? 'bg-purple-50/30 hover:bg-purple-50/60 border-l-4 border-l-purple-500'
                        : isOvertime
                        ? 'bg-amber-50/30 hover:bg-amber-50/60'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Day & Date */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{day.dayLabel}</span>
                        {isMissed && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white px-1.5 py-0.2 rounded-full">
                            Missed
                          </span>
                        )}
                        {isLeave && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white px-1.5 py-0.2 rounded-full">
                            Leave
                          </span>
                        )}
                      </div>
                      <div className="text-2xs text-slate-400">{day.formattedDate.split(',')[1]}</div>
                    </td>

                    {/* Standard Time */}
                    <td className="py-3 px-3 font-semibold text-slate-600">
                      6.0 hrs
                    </td>

                    {/* Hours Worked */}
                    <td className="py-3 px-3">
                      {isMissed ? (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-400 text-sm">0.0 hrs</span>
                          <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-300">
                            6h Deficit
                          </span>
                        </div>
                      ) : isLeave ? (
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-purple-900 text-sm">{day.hoursLogged} hrs</span>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md border border-purple-200">
                            {day.leaveType === 'UNPAID_LEAVE' ? 'LOP' : 'Shift Credited'}
                          </span>
                        </div>
                      ) : isPreJoin || isNoLog ? (
                        <span className="font-medium text-slate-400 text-sm">
                          0.0 hrs
                        </span>
                      ) : (
                        <span className="font-extrabold text-slate-900 text-sm">
                          {day.hoursLogged} hrs
                        </span>
                      )}
                    </td>

                    {/* Burnout / Overtime */}
                    <td className="py-3 px-3">
                      {isMissed ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-800 border border-rose-300">
                          <AlertTriangle className="h-3 w-3 text-rose-600" />
                          Missed Log
                        </span>
                      ) : isLeave ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 border border-purple-300">
                          <Palmtree className="h-3 w-3 text-purple-600" />
                          {day.leaveType === 'CASUAL_LEAVE' ? 'Casual Leave' : day.leaveType === 'SICK_LEAVE' ? 'Sick Leave' : 'Unpaid Leave'}
                        </span>
                      ) : isPreJoin ? (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-500">
                          Pre-joining
                        </span>
                      ) : isNoLog ? (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-500">
                          No Log
                        </span>
                      ) : isOvertime ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-extrabold text-amber-800">
                          <Flame className="h-3 w-3 fill-amber-500 text-amber-600" />
                          +{day.burnoutHours} hrs
                        </span>
                      ) : isLightDay ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          <Check className="h-3 w-3 text-emerald-600" />
                          -{day.underHours} hrs (Offset)
                        </span>
                      ) : (
                        <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                          0.0 hrs
                        </span>
                      )}
                    </td>

                    {/* Status & Notes */}
                    <td className="py-3 px-3 text-slate-700 max-w-sm">
                      {isMissed ? (
                        <div className="space-y-1">
                          <p className="text-xs text-rose-800 font-semibold leading-snug flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            <span>Instructor did not submit daily work log yesterday. 6.0h shift deficit.</span>
                          </p>
                        </div>
                      ) : isLeave ? (
                        <div className="space-y-1">
                          <p className="text-xs text-purple-900 font-semibold leading-snug">
                            {day.leaveReason ? `Reason: ${day.leaveReason}` : 'Leave day taken.'}
                          </p>
                          <span className="inline-flex items-center gap-1 text-2xs font-bold text-purple-800 bg-purple-100/90 px-2 py-0.5 rounded-md border border-purple-200">
                            {day.leaveType === 'UNPAID_LEAVE' ? 'Loss of Pay (0h)' : '6.0h Shift Accounted'}
                          </span>
                        </div>
                      ) : isPreJoin ? (
                        <div className="text-slate-400 text-xs italic">
                          Prior to account registration on {currentTrainerJoinText}
                        </div>
                      ) : isNoLog ? (
                        <div className="text-slate-400 text-xs italic">
                          No work log submitted for this day
                        </div>
                      ) : isOvertime ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-amber-950 text-xs leading-snug">
                            {day.extraWorkDetails ? (
                              <span>
                                {day.extraWorkReason && day.extraWorkReason !== 'None' && (
                                  <span className="font-bold text-amber-900">{day.extraWorkReason}: </span>
                                )}
                                {day.extraWorkDetails}
                              </span>
                            ) : (
                              <span>{day.statusNote}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-2xs font-extrabold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                              +{day.burnoutHours}h Overtime
                            </span>
                            {day.invigilationHours > 0 && (
                              <span className="inline-flex items-center gap-1 text-2xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                Exam Invigilation: {day.invigilationHours}h
                              </span>
                            )}
                          </div>
                        </div>
                      ) : isLightDay ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-emerald-950 text-xs leading-snug">
                            {day.extraWorkDetails || day.remarks || 'Light day'}
                          </div>
                          <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                            -{day.underHours}h Balances Overtime
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-slate-600 text-xs leading-snug">
                            {day.remarks || day.extraWorkDetails || 'Standard 6.0h completed'}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-2xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              Standard load
                            </span>
                            {day.invigilationHours > 0 && (
                              <span className="inline-flex items-center gap-1 text-2xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                Exam Invigilation: {day.invigilationHours}h
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectingDay(day)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Day Details Modal */}
      {inspectingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {inspectingDay.dayLabel} Details &bull; {inspectingDay.formattedDate}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trainer: <strong className="text-slate-800">{currentTrainer?.fullName}</strong> ({currentTrainer?.employeeId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingDay(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Summary stat row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-2xs text-slate-400 font-bold uppercase block">Standard</span>
                  <span className="text-sm font-extrabold text-slate-800">6.0 hrs</span>
                </div>
                <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200">
                  <span className="text-2xs text-sky-700 font-bold uppercase block">Worked</span>
                  <span className="text-sm font-extrabold text-sky-950">{inspectingDay.hoursLogged} hrs</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  inspectingDay.hoursLogged > 6.0 
                    ? 'bg-amber-50 border-amber-200 text-amber-900' 
                    : inspectingDay.hoursLogged > 0 && inspectingDay.hoursLogged < 6.0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <span className="text-2xs opacity-75 font-bold uppercase block">Burnout / Variance</span>
                  <span className="text-sm font-extrabold">
                    {inspectingDay.hoursLogged > 6.0 
                      ? `+${inspectingDay.burnoutHours} hrs` 
                      : inspectingDay.hoursLogged > 0 && inspectingDay.hoursLogged < 6.0 
                      ? `-${inspectingDay.underHours} hrs` 
                      : '0.0 hrs'}
                  </span>
                </div>
              </div>

              {/* Status & Notes Entered by Trainer */}
              <div>
                <span className="text-2xs font-bold text-slate-500 uppercase block mb-1">
                  Status & Notes (Entered by Trainer)
                </span>
                <div className={`rounded-xl p-3 border ${
                  inspectingDay.isMissedLog
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : inspectingDay.isLeave
                    ? 'bg-purple-50 border-purple-300 text-purple-950'
                    : inspectingDay.statusType === 'not_started' || inspectingDay.statusType === 'no_log'
                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                    : inspectingDay.hoursLogged > 6.0
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : inspectingDay.hoursLogged < 6.0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  {inspectingDay.isMissedLog ? (
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-900">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        <span>Missed Daily Work Log (6.0h Workday Deficit)</span>
                      </div>
                      <p className="text-xs text-rose-800 leading-relaxed font-medium">
                        Instructor did not submit a daily work log for this past workday. 6.0-hour standard baseline remains unaccounted.
                      </p>
                    </div>
                  ) : inspectingDay.isLeave ? (
                    <div className="space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-purple-900">
                        <Palmtree className="h-4 w-4 text-purple-600" />
                        <span>
                          {inspectingDay.leaveType === 'CASUAL_LEAVE' 
                            ? 'Casual Leave (CL)' 
                            : inspectingDay.leaveType === 'SICK_LEAVE' 
                            ? 'Sick Leave (SL)' 
                            : 'Unpaid Leave (LOP)'}
                        </span>
                      </div>
                      <p className="text-xs text-purple-950 leading-relaxed font-medium">
                        <strong>Reason:</strong> {inspectingDay.leaveReason || 'Taken Leave'}
                      </p>
                      <span className="inline-block text-[10px] font-bold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-md">
                        {inspectingDay.leaveType === 'UNPAID_LEAVE' ? 'Loss of Pay (0.0h)' : '6.0h Shift Accounted'}
                      </span>
                    </div>
                  ) : inspectingDay.statusType === 'not_started' ? (
                    <div className="space-y-1">
                      <div className="font-bold text-slate-700">Pre-Joining Period</div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Trainee created an account on {currentTrainerJoinText}. No work log records exist prior to the registration date.
                      </p>
                    </div>
                  ) : inspectingDay.statusType === 'no_log' ? (
                    <div className="space-y-1">
                      <div className="font-bold text-slate-700">No Log Submitted</div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Trainee did not submit a daily work log for this date.
                      </p>
                    </div>
                  ) : inspectingDay.hoursLogged > 6.0 ? (
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <Flame className="h-3.5 w-3.5 text-amber-600" />
                        <span>Why Worked Extra ({inspectingDay.extraWorkReason !== 'None' ? inspectingDay.extraWorkReason : 'Overtime'} &bull; +{inspectingDay.burnoutHours}h):</span>
                      </div>
                      <p className="text-xs leading-relaxed text-amber-950 font-medium pl-5 whitespace-pre-wrap">
                        {inspectingDay.extraWorkDetails || inspectingDay.statusNote}
                      </p>
                    </div>
                  ) : inspectingDay.hoursLogged < 6.0 ? (
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Light Day (-{inspectingDay.underHours}h balances overtime):</span>
                      </div>
                      <p className="text-xs leading-relaxed text-emerald-950 font-medium pl-5 whitespace-pre-wrap">
                        {inspectingDay.extraWorkDetails || inspectingDay.remarks || inspectingDay.statusNote}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-bold text-slate-700">Standard 6.0h Daily Work Time</div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {inspectingDay.remarks || inspectingDay.extraWorkDetails || 'Standard daily load completed with no overtime justification required.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Class & Practice counts + Scheduled class list */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
                    <span className="text-2xs font-bold text-slate-500 uppercase block">Classes Handled</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {inspectingDay.classesCount} Classes ({inspectingDay.totalClassesDurationMinutes} mins)
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
                    <span className="text-2xs font-bold text-slate-500 uppercase block">Practice Sessions</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {inspectingDay.practiceSessionsCount} Sessions ({inspectingDay.totalPracticeDurationMinutes} mins)
                    </span>
                  </div>
                </div>

                {inspectingDay.dayClasses && inspectingDay.dayClasses.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/30 space-y-1">
                    <span className="text-2xs font-bold text-slate-500 uppercase block">Scheduled Class Sessions</span>
                    <div className="space-y-1 pt-0.5">
                      {inspectingDay.dayClasses.map((cls: any, idx: number) => (
                        <div key={cls.id || idx} className="text-xs text-slate-700 flex items-center justify-between">
                          <span className="font-medium">
                            <strong className="text-slate-900">{cls.className}</strong> {cls.batch ? `(${cls.batch})` : ''}
                          </span>
                          <span className="text-slate-500 text-2xs">{cls.startTime || 'Standard'} ({cls.durationMinutes || 60}m)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Responsibilities (Invigilation, Evaluation, In-service) */}
              {(inspectingDay.invigilationHours > 0 || inspectingDay.paperEvaluationHours > 0 || inspectingDay.inServiceHours > 0) && (
                <div className="rounded-xl border border-indigo-200 p-3 bg-indigo-50/50 space-y-1.5">
                  <span className="text-2xs font-bold text-indigo-900 uppercase block flex items-center gap-1">
                    <FileCheck2 className="h-3.5 w-3.5 text-indigo-600" />
                    Additional Responsibilities
                  </span>
                  {inspectingDay.invigilationHours > 0 && (
                    <div className="flex items-center justify-between text-xs text-rose-800 font-semibold">
                      <span>Exam Invigilation:</span>
                      <span>{inspectingDay.invigilationHours} hrs {inspectingDay.invigilationDetails ? `(${inspectingDay.invigilationDetails})` : ''}</span>
                    </div>
                  )}
                  {inspectingDay.paperEvaluationHours > 0 && (
                    <div className="flex items-center justify-between text-xs text-indigo-900">
                      <span>Paper Evaluation:</span>
                      <strong>{inspectingDay.paperEvaluationHours} hrs</strong>
                    </div>
                  )}
                  {inspectingDay.inServiceHours > 0 && (
                    <div className="flex items-center justify-between text-xs text-teal-900">
                      <span>In-Service Training:</span>
                      <strong>{inspectingDay.inServiceHours} hrs</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Tasks */}
              <div>
                <span className="text-2xs font-bold text-slate-500 uppercase block mb-1">Tasks Worked On</span>
                <p className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-700 whitespace-pre-wrap">
                  {inspectingDay.tasksWorkedOn || (inspectingDay.isMissedLog ? 'No log submitted' : inspectingDay.statusType === 'not_started' || inspectingDay.statusType === 'no_log' ? 'No tasks logged' : 'Standard course delivery, lab sessions, and student mentoring.')}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingDay(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </PermissionGuard>
  );
};
