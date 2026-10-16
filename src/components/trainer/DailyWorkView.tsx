import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Calendar, 
  Clock, 
  Search, 
  Eye,
  BookOpen,
  GraduationCap,
  Calculator,
  CheckCircle2,
  FileCheck2,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Info,
  HelpCircle,
  BarChart3,
  Pencil,
  Edit3,
  CheckCircle,
  AlertCircle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  PieChart as PieIcon,
  Sun,
  Coffee,
  Palmtree,
  HeartPulse,
  UserX
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  ReferenceLine
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { DailyUpdate } from '../../types';
import { Modal } from '../common/Modal';

// Available duration presets for class / practice sessions in minutes (Standard 1 class = 1 hour / 60 mins)
const DURATION_OPTIONS = [
  { value: 60, label: '1 hour / 60 mins (Standard 1 hr)' },
  { value: 15, label: '15 mins (0.25 hrs)' },
  { value: 30, label: '30 mins (0.50 hrs)' },
  { value: 45, label: '45 mins (0.75 hrs)' },
  { value: 50, label: '50 mins (0.83 hrs)' },
  { value: 75, label: '1h 15m / 75 mins' },
  { value: 90, label: '1h 30m / 90 mins' },
  { value: 120, label: '2 hours / 120 mins' },
  { value: 150, label: '2h 30m / 150 mins' },
  { value: 180, label: '3 hours / 180 mins' },
  { value: 210, label: '3h 30m / 210 mins' },
  { value: 240, label: '4 hours / 240 mins' },
];

// Reasons for extra hours worked / burnout cause dropdown
const EXTRA_WORK_REASONS = [
  { value: 'Paper Evaluation', label: 'Paper Evaluation (Grading exams, tests & coding rubrics)' },
  { value: 'Exam Invigilation', label: 'Exam Invigilation & Proctoring Duty' },
  { value: 'Extended Class Sessions', label: 'Extended Class Sessions (Topic overtime / deep dive)' },
  { value: 'Practice / Lab Assistance', label: 'Practice & Hands-on Lab Assistance' },
  { value: 'In-service Training', label: 'In-service Training & Faculty Upskilling' },
  { value: 'Special Remedial Batch', label: 'Special Remedial Batch Coaching' },
  { value: 'Doubt Clearing & Mentoring', label: '1-on-1 Doubt Clearing & Trainee Mentoring' },
  { value: 'Curriculum & Lab Prep', label: 'Curriculum Prep & Lab Environment Setup' },
  { value: 'Other Academic Tasks', label: 'Other Academic Duties / Special Projects' },
];

// Reusable hourly dropdown presets (1 to 24 hours with half-hour options up to 12 max policy)
const HOURS_DROPDOWN_OPTIONS = [
  { value: 0.5, label: '0.5 Hour (30 mins)' },
  { value: 1.0, label: '1 Hour' },
  { value: 1.5, label: '1.5 Hours' },
  { value: 2.0, label: '2 Hours' },
  { value: 2.5, label: '2.5 Hours' },
  { value: 3.0, label: '3 Hours' },
  { value: 3.5, label: '3.5 Hours' },
  { value: 4.0, label: '4 Hours' },
  { value: 4.5, label: '4.5 Hours' },
  { value: 5.0, label: '5 Hours' },
  { value: 5.5, label: '5.5 Hours' },
  { value: 6.0, label: '6 Hours' },
  { value: 7.0, label: '7 Hours' },
  { value: 8.0, label: '8 Hours' },
  { value: 9.0, label: '9 Hours' },
  { value: 10.0, label: '10 Hours' },
  { value: 11.0, label: '11 Hours' },
  { value: 12.0, label: '12 Hours (Daily Max Policy)' },
  { value: 13.0, label: '13 Hours' },
  { value: 14.0, label: '14 Hours' },
  { value: 15.0, label: '15 Hours' },
  { value: 16.0, label: '16 Hours' },
  { value: 17.0, label: '17 Hours' },
  { value: 18.0, label: '18 Hours' },
  { value: 19.0, label: '19 Hours' },
  { value: 20.0, label: '20 Hours' },
  { value: 21.0, label: '21 Hours' },
  { value: 22.0, label: '22 Hours' },
  { value: 23.0, label: '23 Hours' },
  { value: 24.0, label: '24 Hours' },
];

export const DailyWorkView: React.FC = () => {
  const { userProfile } = useAuth();
  const { dailyUpdates = [], classes = [], addDailyUpdate, updateDailyUpdate } = useData();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [selectedDetailUpdate, setSelectedDetailUpdate] = useState<DailyUpdate | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateString(), []);

  // Standard benchmark working hours per day & per week (6 days * 6 hours = 36 hours)
  const STANDARD_WORK_HOURS_PER_DAY = 6;
  const MAX_WORK_HOURS_PER_DAY = 12; // Maximum allowable working hours per day
  const STANDARD_WORK_HOURS_PER_WEEK = 36;

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const MONTH_SHORTS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // User's registration date string (YYYY-MM-DD)
  const userRegDateStr = useMemo(() => {
    return userProfile?.createdAt ? userProfile.createdAt.split('T')[0] : '';
  }, [userProfile?.createdAt]);

  // Calendar year and month state - defaults dynamically to user's registration date (or today)
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (userProfile?.createdAt) {
      const reg = new Date(userProfile.createdAt);
      if (!isNaN(reg.getTime())) return reg.getFullYear();
    }
    return new Date().getFullYear();
  });
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(() => {
    if (userProfile?.createdAt) {
      const reg = new Date(userProfile.createdAt);
      if (!isNaN(reg.getTime())) return reg.getMonth();
    }
    return new Date().getMonth();
  });
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(0);
  const [targetWeekOnMonthChange, setTargetWeekOnMonthChange] = useState<'first' | 'last' | null>(null);
  const [calendarDisplayMode, setCalendarDisplayMode] = useState<'calendar' | 'weekly'>('calendar');

  // Allowed date window: strictly up to 7 days in the past (grace window), capped by registration date
  const minAllowedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const min7DaysAgo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (userRegDateStr && userRegDateStr > min7DaysAgo) {
      return userRegDateStr;
    }
    return min7DaysAgo;
  }, [userRegDateStr]);

  // Helper to compute total hours from any set of inputs (strictly capped at 12 hours max)
  const computeTotalHours = (
    cCount: number,
    cDuration: number,
    pCount: number,
    pDuration: number,
    cat: string,
    paperHrs: number,
    inServHrs: number,
    invigHrs: number = 0,
    isLeaveVal: boolean = false,
    leaveTypeVal: string = 'NONE'
  ) => {
    if (isLeaveVal) {
      return leaveTypeVal === 'UNPAID_LEAVE' ? 0 : STANDARD_WORK_HOURS_PER_DAY;
    }
    const cMins = Number(cCount) * Number(cDuration);
    const pMins = Number(pCount) * Number(pDuration);
    const teachHrs = (cMins + pMins) / 60;
    const pEval = (cat === 'Paper Evaluation' || cat === 'Both' || cat === 'All Duties') ? (Number(paperHrs) || 0) : 0;
    const inServ = (cat === 'In-service' || cat === 'Both' || cat === 'All Duties') ? (Number(inServHrs) || 0) : 0;
    const invig = (cat === 'Invigilation' || cat === 'All Duties') ? (Number(invigHrs) || 0) : 0;
    const total = teachHrs + pEval + inServ + invig;
    // Strict restriction: maximum working hours per day is 12 hours
    const capped = Math.min(MAX_WORK_HOURS_PER_DAY, Math.max(0, total));
    return Number(capped.toFixed(2));
  };

  const getInitialFormData = (dateStr: string = todayStr) => ({
    date: dateStr,
    classesCount: 1, // Default 1 class (1 hr)
    classDurationMinutes: 60, // Standard 1 hour per class
    practiceSessionsCount: 1, // Default 1 practice session (1 hr)
    practiceDurationMinutes: 60, // Standard 1 hour per practice session
    tasksWorkedOn: '',
    additionalCategory: 'None' as 'None' | 'Paper Evaluation' | 'In-service' | 'Invigilation' | 'Both' | 'All Duties',
    paperEvaluationHours: 1.0,
    inServiceHours: 1.0,
    invigilationHours: 2.0,
    invigilationDetails: '',
    isLeave: false,
    leaveType: 'NONE' as 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'UNPAID_LEAVE' | 'NONE',
    leaveReason: '',
    hoursLogged: 2, // Auto calculated (1 class * 1 hr + 1 practice * 1 hr = 2 hrs)
    extraWorkReason: 'Paper Evaluation',
    extraWorkDetails: '',
    remarks: '',
  });

  // Form State - Standard: 1 class = 1 hr (60 min), 1 practice session = 1 hr (60 min)
  const [formData, setFormData] = useState(getInitialFormData(todayStr));

  const [saving, setSaving] = useState(false);

  // Auto-updating state handlers for smooth UX
  // Helper to remove leave note prefix if converting back to workday
  const cleanTasksForWorkday = (tasks: string) => {
    if (!tasks) return '';
    if (tasks.startsWith('[Casual Leave]') || tasks.startsWith('[Sick Leave]') || tasks.startsWith('[Unpaid Leave]') || tasks.startsWith('[None]')) {
      return '';
    }
    return tasks;
  };

  // Auto-updating state handlers for smooth UX - interaction with session/workload controls switches from leave to normal working day
  const updateClassesCount = (newCount: number) => {
    setFormData(prev => {
      const calculated = computeTotalHours(
        newCount,
        prev.classDurationMinutes || 60,
        prev.practiceSessionsCount,
        prev.practiceDurationMinutes || 60,
        prev.additionalCategory,
        prev.paperEvaluationHours,
        prev.inServiceHours,
        prev.invigilationHours,
        false, // Clicking session things automatically disables leave!
        'NONE'
      );
      return {
        ...prev,
        isLeave: false,
        leaveType: 'NONE',
        leaveReason: '',
        tasksWorkedOn: cleanTasksForWorkday(prev.tasksWorkedOn),
        classesCount: newCount,
        hoursLogged: calculated
      };
    });
  };

  const updatePracticeCount = (newCount: number) => {
    setFormData(prev => {
      const calculated = computeTotalHours(
        prev.classesCount,
        prev.classDurationMinutes || 60,
        newCount,
        prev.practiceDurationMinutes || 60,
        prev.additionalCategory,
        prev.paperEvaluationHours,
        prev.inServiceHours,
        prev.invigilationHours,
        false, // Clicking session things automatically disables leave!
        'NONE'
      );
      return {
        ...prev,
        isLeave: false,
        leaveType: 'NONE',
        leaveReason: '',
        tasksWorkedOn: cleanTasksForWorkday(prev.tasksWorkedOn),
        practiceSessionsCount: newCount,
        hoursLogged: calculated
      };
    });
  };

  const updateClassDuration = (newDuration: number) => {
    setFormData(prev => {
      const calculated = computeTotalHours(
        prev.classesCount,
        newDuration,
        prev.practiceSessionsCount,
        prev.practiceDurationMinutes || 60,
        prev.additionalCategory,
        prev.paperEvaluationHours,
        prev.inServiceHours,
        prev.invigilationHours,
        false,
        'NONE'
      );
      return {
        ...prev,
        isLeave: false,
        leaveType: 'NONE',
        leaveReason: '',
        tasksWorkedOn: cleanTasksForWorkday(prev.tasksWorkedOn),
        classDurationMinutes: newDuration,
        hoursLogged: calculated
      };
    });
  };

  const updatePracticeDuration = (newDuration: number) => {
    setFormData(prev => {
      const calculated = computeTotalHours(
        prev.classesCount,
        prev.classDurationMinutes || 60,
        prev.practiceSessionsCount,
        newDuration,
        prev.additionalCategory,
        prev.paperEvaluationHours,
        prev.inServiceHours,
        prev.invigilationHours,
        false,
        'NONE'
      );
      return {
        ...prev,
        isLeave: false,
        leaveType: 'NONE',
        leaveReason: '',
        tasksWorkedOn: cleanTasksForWorkday(prev.tasksWorkedOn),
        practiceDurationMinutes: newDuration,
        hoursLogged: calculated
      };
    });
  };

  const updateAdditionalCategory = (newCat: 'None' | 'Paper Evaluation' | 'In-service' | 'Invigilation' | 'Both' | 'All Duties') => {
    setFormData(prev => {
      const calculated = computeTotalHours(
        prev.classesCount,
        prev.classDurationMinutes || 60,
        prev.practiceSessionsCount,
        prev.practiceDurationMinutes || 60,
        newCat,
        prev.paperEvaluationHours,
        prev.inServiceHours,
        prev.invigilationHours,
        false,
        'NONE'
      );
      return {
        ...prev,
        isLeave: false,
        leaveType: 'NONE',
        leaveReason: '',
        tasksWorkedOn: cleanTasksForWorkday(prev.tasksWorkedOn),
        additionalCategory: newCat,
        hoursLogged: calculated
      };
    });
  };

  const updatePaperEvalHours = (newHours: number) => {
    setFormData(prev => {
      const calculated = computeTotalHours(
        prev.classesCount,
        prev.classDurationMinutes || 60,
        prev.practiceSessionsCount,
        prev.practiceDurationMinutes || 60,
        prev.additionalCategory,
        newHours,
        prev.inServiceHours,
        prev.invigilationHours,
        false,
        'NONE'
      );
      return {
        ...prev,
        isLeave: false,
        leaveType: 'NONE',
        leaveReason: '',
        tasksWorkedOn: cleanTasksForWorkday(prev.tasksWorkedOn),
        paperEvaluationHours: newHours,
        hoursLogged: calculated
      };
    });
  };

  const updateInServiceHours = (newHours: number) => {
    setFormData(prev => {
      const calculated = computeTotalHours(
        prev.classesCount,
        prev.classDurationMinutes || 60,
        prev.practiceSessionsCount,
        prev.practiceDurationMinutes || 60,
        prev.additionalCategory,
        prev.paperEvaluationHours,
        newHours,
        prev.invigilationHours,
        false,
        'NONE'
      );
      return {
        ...prev,
        isLeave: false,
        leaveType: 'NONE',
        leaveReason: '',
        tasksWorkedOn: cleanTasksForWorkday(prev.tasksWorkedOn),
        inServiceHours: newHours,
        hoursLogged: calculated
      };
    });
  };

  const updateInvigilationHours = (newHours: number) => {
    setFormData(prev => {
      const calculated = computeTotalHours(
        prev.classesCount,
        prev.classDurationMinutes || 60,
        prev.practiceSessionsCount,
        prev.practiceDurationMinutes || 60,
        prev.additionalCategory,
        prev.paperEvaluationHours,
        prev.inServiceHours,
        newHours,
        false,
        'NONE'
      );
      return {
        ...prev,
        isLeave: false,
        leaveType: 'NONE',
        leaveReason: '',
        tasksWorkedOn: cleanTasksForWorkday(prev.tasksWorkedOn),
        invigilationHours: newHours,
        hoursLogged: calculated
      };
    });
  };

  // One tap select, one more tap unselect:
  const toggleLeaveType = (selectedType: 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'UNPAID_LEAVE') => {
    setFormData(prev => {
      // If already on this leave, second tap UNSELECTS it!
      if (prev.isLeave && prev.leaveType === selectedType) {
        const defaultClasses = prev.classesCount > 0 ? prev.classesCount : 1;
        const defaultPractice = prev.practiceSessionsCount > 0 ? prev.practiceSessionsCount : 1;
        const calculated = computeTotalHours(
          defaultClasses,
          prev.classDurationMinutes || 60,
          defaultPractice,
          prev.practiceDurationMinutes || 60,
          prev.additionalCategory,
          prev.paperEvaluationHours,
          prev.inServiceHours,
          prev.invigilationHours,
          false,
          'NONE'
        );
        return {
          ...prev,
          isLeave: false,
          leaveType: 'NONE',
          leaveReason: '',
          tasksWorkedOn: cleanTasksForWorkday(prev.tasksWorkedOn),
          classesCount: defaultClasses,
          practiceSessionsCount: defaultPractice,
          hoursLogged: calculated
        };
      } else {
        // Turn ON this leave type: clear outdated session workload
        const calculated = selectedType === 'UNPAID_LEAVE' ? 0 : STANDARD_WORK_HOURS_PER_DAY;
        return {
          ...prev,
          isLeave: true,
          leaveType: selectedType,
          hoursLogged: calculated
        };
      }
    });
  };

  const updateLeaveMode = (isLeave: boolean, leaveType: 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'UNPAID_LEAVE' | 'NONE' = 'CASUAL_LEAVE') => {
    setFormData(prev => {
      if (!isLeave) {
        const defaultClasses = prev.classesCount > 0 ? prev.classesCount : 1;
        const defaultPractice = prev.practiceSessionsCount > 0 ? prev.practiceSessionsCount : 1;
        const calculated = computeTotalHours(
          defaultClasses,
          prev.classDurationMinutes || 60,
          defaultPractice,
          prev.practiceDurationMinutes || 60,
          prev.additionalCategory,
          prev.paperEvaluationHours,
          prev.inServiceHours,
          prev.invigilationHours,
          false,
          'NONE'
        );
        return {
          ...prev,
          isLeave: false,
          leaveType: 'NONE',
          leaveReason: '',
          tasksWorkedOn: cleanTasksForWorkday(prev.tasksWorkedOn),
          classesCount: defaultClasses,
          practiceSessionsCount: defaultPractice,
          hoursLogged: calculated
        };
      } else {
        const calculated = leaveType === 'UNPAID_LEAVE' ? 0 : STANDARD_WORK_HOURS_PER_DAY;
        return {
          ...prev,
          isLeave: true,
          leaveType: leaveType !== 'NONE' ? leaveType : 'CASUAL_LEAVE',
          hoursLogged: calculated
        };
      }
    });
  };

  // Dynamic calculations for the form
  const totalClassesMinutes = Number(formData.classesCount) * Number(formData.classDurationMinutes);
  const totalPracticeMinutes = Number(formData.practiceSessionsCount) * Number(formData.practiceDurationMinutes);
  const totalTeachingMinutes = totalClassesMinutes + totalPracticeMinutes;
  const totalTeachingHoursDecimal = totalTeachingMinutes / 60;

  const paperEvalHrs = (formData.additionalCategory === 'Paper Evaluation' || formData.additionalCategory === 'Both' || formData.additionalCategory === 'All Duties')
    ? (Number(formData.paperEvaluationHours) || 0)
    : 0;

  const inServiceHrs = (formData.additionalCategory === 'In-service' || formData.additionalCategory === 'Both' || formData.additionalCategory === 'All Duties')
    ? (Number(formData.inServiceHours) || 0)
    : 0;

  const invigilationHrs = (formData.additionalCategory === 'Invigilation' || formData.additionalCategory === 'All Duties')
    ? (Number(formData.invigilationHours) || 0)
    : 0;

  const totalAdditionalHours = paperEvalHrs + inServiceHrs + invigilationHrs;
  const rawWorkHoursToday = formData.isLeave 
    ? (formData.leaveType === 'UNPAID_LEAVE' ? 0 : STANDARD_WORK_HOURS_PER_DAY)
    : (totalTeachingHoursDecimal + totalAdditionalHours);
  const totalWorkHoursToday = Number(Math.min(MAX_WORK_HOURS_PER_DAY, Math.max(0, rawWorkHoursToday)).toFixed(2));
  
  // Standard vs Extra hours calculation (Max 6 hours/day standard)
  const extraHoursCalculated = Number(Math.max(0, totalWorkHoursToday - STANDARD_WORK_HOURS_PER_DAY).toFixed(2));
  const isOvertimeBurnoutRisk = totalWorkHoursToday > STANDARD_WORK_HOURS_PER_DAY;

  // Determine Burnout Risk Level
  const getBurnoutRiskLevel = (hours: number): 'Normal' | 'Moderate' | 'High' => {
    if (hours <= STANDARD_WORK_HOURS_PER_DAY) return 'Normal';
    if (hours <= 8.0) return 'Moderate';
    return 'High';
  };

  // Sync total calculated hours to total hours logged
  const handleSyncCalculatedHours = () => {
    setFormData(prev => ({
      ...prev,
      hoursLogged: totalWorkHoursToday
    }));
  };

  const myUpdates = useMemo(() => {
    if (!userProfile) return [];
    return (dailyUpdates || []).filter(u => {
      if (u.userId && u.userId === userProfile.uid) return true;
      if (userProfile.employeeId && u.employeeId && u.employeeId.toUpperCase() === userProfile.employeeId.toUpperCase()) return true;
      if (userProfile.companyEmail && ((u as any).userEmail || (u as any).email || (u as any).companyEmail) && ((u as any).userEmail || (u as any).email || (u as any).companyEmail).toLowerCase() === userProfile.companyEmail.toLowerCase()) return true;
      if (userProfile.fullName && u.employeeName && u.employeeName.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase()) return true;
      return false;
    });
  }, [dailyUpdates, userProfile]);

  // Today's update for active trainee
  const todayUpdate = useMemo(() => {
    return myUpdates.find(u => (u.date || '').split('T')[0] === todayStr) || null;
  }, [myUpdates, todayStr]);

  // Detect duplicate conflict if user changes date in modal to another date with an existing log
  const duplicateConflict = useMemo(() => {
    if (!formData.date) return null;
    const targetDate = formData.date.split('T')[0];
    return myUpdates.find(u => (u.date || '').split('T')[0] === targetDate && u.id !== editingUpdateId) || null;
  }, [formData.date, myUpdates, editingUpdateId]);

  // Open modal in Edit Mode for a specific update
  const openEditModal = (update: DailyUpdate) => {
    setEditingUpdateId(update.id);
    const isLeave = !!update.isLeave && update.leaveType !== 'NONE';
    const leaveType = isLeave ? (update.leaveType || 'NONE') : 'NONE';
    const leaveReason = isLeave ? (update.leaveReason || '') : '';

    const savedClasses = update.classesCount !== undefined ? update.classesCount : (parseInt(update.classesHandled) || 0);
    // If it was a leave day, savedClasses was saved as 0. Give a default of 1 so if converted to a working day, instructor has working day controls ready
    const cCount = isLeave ? (savedClasses > 0 ? savedClasses : 1) : savedClasses;

    const savedPractice = update.practiceSessionsCount !== undefined ? update.practiceSessionsCount : (parseInt(update.projectUpdates || '') || 0);
    const pCount = isLeave ? (savedPractice > 0 ? savedPractice : 1) : savedPractice;

    const cDuration = update.classDurationMinutes || 60;
    const pDuration = update.practiceDurationMinutes || 60;
    
    let addCat: 'None' | 'Paper Evaluation' | 'In-service' | 'Invigilation' | 'Both' | 'All Duties' = 'None';
    if (update.additionalCategory && update.additionalCategory !== 'None') {
      addCat = update.additionalCategory as any;
    } else if (update.invigilationHours && (update.paperEvaluationHours || update.inServiceHours)) {
      addCat = 'All Duties';
    } else if (update.invigilationHours) {
      addCat = 'Invigilation';
    } else if (update.paperEvaluationHours && update.inServiceHours) {
      addCat = 'Both';
    } else if (update.paperEvaluationHours) {
      addCat = 'Paper Evaluation';
    } else if (update.inServiceHours) {
      addCat = 'In-service';
    }

    // If it was a leave, tasksWorkedOn might be "[Sick Leave] ..."; clean it up for workday editing
    let initialTasks = update.tasksWorkedOn || '';
    if (isLeave && initialTasks.startsWith('[')) {
      initialTasks = '';
    }

    const calculatedHrs = computeTotalHours(
      cCount,
      cDuration,
      pCount,
      pDuration,
      addCat,
      update.paperEvaluationHours || 1.0,
      update.inServiceHours || 1.0,
      update.invigilationHours || 2.0,
      isLeave,
      leaveType
    );

    setFormData({
      date: (update.date || '').split('T')[0],
      classesCount: cCount,
      classDurationMinutes: cDuration,
      practiceSessionsCount: pCount,
      practiceDurationMinutes: pDuration,
      tasksWorkedOn: initialTasks,
      additionalCategory: addCat,
      paperEvaluationHours: update.paperEvaluationHours || 1.0,
      inServiceHours: update.inServiceHours || 1.0,
      invigilationHours: update.invigilationHours || 2.0,
      invigilationDetails: update.invigilationDetails || '',
      isLeave,
      leaveType,
      leaveReason,
      hoursLogged: update.hoursLogged !== undefined ? update.hoursLogged : calculatedHrs,
      extraWorkReason: update.extraWorkReason || 'Paper Evaluation',
      extraWorkDetails: update.extraWorkDetails || update.remarks || '',
      remarks: update.remarks || '',
    });

    setSelectedDetailUpdate(null);
    setIsModalOpen(true);
  };

  // Check for pre-filled date navigation from dashboard
  useEffect(() => {
    try {
      const prefill = localStorage.getItem('nxtwave_prefill_work_date');
      if (prefill) {
        localStorage.removeItem('nxtwave_prefill_work_date');
        const existing = myUpdates.find(u => (u.date || '').split('T')[0] === prefill);
        if (existing) {
          openEditModal(existing);
        } else {
          setEditingUpdateId(null);
          setFormData(getInitialFormData(prefill));
          setIsModalOpen(true);
        }
      }
    } catch {}
  }, [myUpdates]);

  // Missing Previous Days calculation (up to 7 days access window)
  // Strictly only prompt for days on or after user registration date
  const missedPreviousDays = useMemo(() => {
    const list: Array<{ label: string; dateStr: string; dayName: string; daysRemaining: number }> = [];
    const now = new Date();
    const userRegDateStr = userProfile?.createdAt ? userProfile.createdAt.split('T')[0] : '';

    // Full 7 days grace window
    for (let offset = 1; offset <= 7; offset++) {
      const d = new Date(now);
      d.setDate(now.getDate() - offset);
      if (d.getDay() === 0) continue; // Skip Sunday

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // If date is before the user created their account, skip
      if (userRegDateStr && dateStr < userRegDateStr) {
        continue;
      }

      const hasLog = myUpdates.some(u => (u.date || '').split('T')[0] === dateStr);
      if (!hasLog) {
        const daysRemaining = 7 - offset;
        const label = offset === 1 
          ? 'Yesterday' 
          : offset === 2 
          ? '2 Days Ago' 
          : `${offset} Days Ago`;
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        list.push({ label, dateStr, dayName, daysRemaining });
      }
    }
    return list;
  }, [myUpdates, userProfile?.createdAt]);

  const openModalForDate = (dateStr: string) => {
    if (userRegDateStr && dateStr < userRegDateStr) {
      addToast({
        title: 'Pre-Registration Date',
        message: `Attendance can only be logged from your account creation date (${userRegDateStr}) onwards.`,
        type: 'warning',
        duration: 4000
      });
      return;
    }
    if (dateStr > todayStr) {
      addToast({
        title: 'Future Date',
        message: 'You cannot log attendance or work hours for future dates.',
        type: 'warning',
        duration: 4000
      });
      return;
    }
    const todayDate = new Date(todayStr + 'T00:00:00');
    const targetDate = new Date(dateStr + 'T00:00:00');
    const diffMs = todayDate.getTime() - targetDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
      addToast({
        title: '7-Day Grace Window Expired',
        message: `Attendance for ${dateStr} is older than 7 days. Logs can only be filled within the 7-day grace period.`,
        type: 'warning',
        duration: 5000
      });
      return;
    }
    const existing = myUpdates.find(u => (u.date || '').split('T')[0] === dateStr);
    if (existing) {
      openEditModal(existing);
    } else {
      setEditingUpdateId(null);
      setFormData(getInitialFormData(dateStr));
      setIsModalOpen(true);
    }
  };

  // Open modal for new log or redirect to edit if today is already logged
  const openNewModal = () => {
    if (userRegDateStr && todayStr < userRegDateStr) {
      addToast({
        title: 'Account Not Created Yet',
        message: `Attendance can only be logged from your account registration date (${userRegDateStr}) onwards.`,
        type: 'warning',
        duration: 4000
      });
      return;
    }
    if (todayUpdate) {
      addToast({
        title: "Today's Log Already Submitted",
        message: "You have already submitted your work log for today. Opening edit mode so you can update your log directly without re-entering from scratch.",
        type: 'info',
        duration: 4000
      });
      openEditModal(todayUpdate);
      return;
    }
    setEditingUpdateId(null);
    setFormData(getInitialFormData(todayStr));
    setIsModalOpen(true);
  };

  // Open modal for a specific past date
  const openNewModalForPastDate = () => {
    setEditingUpdateId(null);
    setFormData(getInitialFormData(userRegDateStr || todayStr));
    setIsModalOpen(true);
  };

  // Structured Calendar Weeks for Selected Month & Year (strictly Monday to Saturday 6-day work weeks, Sunday is Holiday)
  const monthWeeksData = useMemo(() => {
    const firstOfMonth = new Date(selectedYear, selectedMonthIndex, 1);
    const lastOfMonth = new Date(selectedYear, selectedMonthIndex + 1, 0);

    // Find the Monday of the week that contains the 1st of the month
    const firstDayOfWeek = firstOfMonth.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const diffToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    const startMonday = new Date(firstOfMonth);
    startMonday.setDate(firstOfMonth.getDate() + diffToMonday);

    const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const DAY_SHORTS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const weeks: Array<{
      weekIndex: number;
      weekNumber: number;
      weekLabel: string;
      dateRangeLabel: string;
      workingDaysCount: number;
      standardWeeklyBaseline: number;
      weekTotalHours: number;
      standardHoursCompleted: number;
      netBurnoutHours: number;
      availableCapacity: number;
      overtimeDaysCount: number;
      days: Array<{
        dayNum: number;
        dateStr: string;
        dayName: string;
        dayShort: string;
        dayOfWeek: number;
        dayOrderName: string;
        diffDays?: number;
        remainingGraceDays?: number;
        isWithinGrace?: boolean;
        standardHours: number;
        burnoutHours: number;
        leaveHours: number;
        missedHours: number;
        hoursLogged: number;
        displayTotalHours: number;
        extraHours: number;
        isOvertime: boolean;
        hasLog: boolean;
        isMissedLog: boolean;
        isLeave: boolean;
        leaveType: string;
        leaveReason: string;
        classesCount: number;
        dayClasses: any[];
        practiceSessionsCount: number;
        invigilationHours: number;
        invigilationDetails: string;
        paperEvaluationHours: number;
        inServiceHours: number;
        tasksWorkedOn: string;
        remarks: string;
        update: DailyUpdate | null;
      }>;
      chartData: Array<{
        day: string;
        dayLabel: string;
        fullDay: string;
        dateStr: string;
        inCurrentWeek: boolean;
        diffDays?: number;
        remainingGraceDays?: number;
        isWithinGrace?: boolean;
        standardHours: number;
        burnoutHours: number;
        leaveHours: number;
        missedHours: number;
        totalHours: number;
        isOvertime: boolean;
        hasLog: boolean;
        isMissedLog: boolean;
        isLeave: boolean;
        leaveType: string;
        leaveReason: string;
        classesCount: number;
        dayClasses: any[];
        practiceSessionsCount: number;
        invigilationHours: number;
        invigilationDetails: string;
        paperEvaluationHours: number;
        inServiceHours: number;
        tasksWorkedOn: string;
        remarks: string;
      }>;
      pieData: Array<{ name: string; value: number; color: string; percentStr?: string }>;
    }> = [];

    let currentMonday = new Date(startMonday);
    let weekIndex = 0;

    while (currentMonday <= lastOfMonth || (currentMonday.getMonth() === selectedMonthIndex)) {
      const weekNumber = weekIndex + 1;

      // Strictly 6 working days: Monday (Day 1) to Saturday (Day 6)
      const days = [0, 1, 2, 3, 4, 5].map((offset) => {
        const d = new Date(currentMonday);
        d.setDate(currentMonday.getDate() + offset);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const dayName = DAY_NAMES[offset];
        const dayShort = DAY_SHORTS[offset];

        const match = myUpdates.find(u => (u.date || '').split('T')[0] === dateStr);
        const dayClasses = (classes || []).filter(c => c.userId === userProfile?.uid && (c.date || '').split('T')[0] === dateStr && c.status !== 'Cancelled');

        const isPastDay = dateStr < todayStr;
        const isAfterReg = !userRegDateStr || dateStr >= userRegDateStr;
        const isMissedLog = isPastDay && isAfterReg && !match;

        const isLeave = !!match?.isLeave;
        const leaveType = match?.leaveType || 'NONE';
        const leaveReason = match?.leaveReason || '';

        let hoursLogged = 0;
        if (match) {
          hoursLogged = Number(match.hoursLogged ?? match.calculatedTotalHours ?? (isLeave ? 6 : 0));
        }

        let standardHours = 0;
        let burnoutHours = 0;
        let leaveHours = 0;
        let missedHours = 0;

        if (isMissedLog) {
          // Missed Log: user forgot to fill log on previous workday - show full 6 hours in red!
          missedHours = 6.0;
        } else if (isLeave) {
          // Leave day: Casual, Sick, or Unpaid Leave - represent with 6.0h distinct bar (purple)
          leaveHours = 6.0;
        } else {
          standardHours = Math.min(hoursLogged, 6.0);
          burnoutHours = Math.max(0, Number((hoursLogged - 6.0).toFixed(1)));
        }

        const displayTotalHours = isMissedLog ? 6.0 : (isLeave ? leaveHours : hoursLogged);
        const extraHours = isLeave ? 0 : (match ? (match.extraHoursWorked !== undefined ? match.extraHoursWorked : Math.max(0, hoursLogged - 6.0)) : 0);
        const isOvertime = burnoutHours > 0;
        const classesCount = match?.classesCount !== undefined ? match.classesCount : dayClasses.length;

        const todayDate = new Date(todayStr + 'T00:00:00');
        const dayDate = new Date(dateStr + 'T00:00:00');
        const diffMs = todayDate.getTime() - dayDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const remainingGraceDays = Math.max(0, 7 - diffDays);
        const isWithinGrace = diffDays <= 7 && diffDays > 0;

        return {
          dayNum: d.getDate(),
          dateStr,
          dayName,
          dayShort,
          dayOfWeek: offset + 1,
          dayOrderName: `Day ${offset + 1} (${dayName})`,
          diffDays,
          remainingGraceDays,
          isWithinGrace,
          standardHours,
          burnoutHours,
          leaveHours,
          missedHours,
          hoursLogged,
          displayTotalHours,
          extraHours: Number(extraHours.toFixed(1)),
          isOvertime,
          hasLog: !!match,
          isMissedLog,
          isLeave,
          leaveType,
          leaveReason,
          classesCount,
          dayClasses,
          practiceSessionsCount: match?.practiceSessionsCount || 0,
          invigilationHours: match?.invigilationHours || 0,
          invigilationDetails: match?.invigilationDetails || '',
          paperEvaluationHours: match?.paperEvaluationHours || 0,
          inServiceHours: match?.inServiceHours || 0,
          tasksWorkedOn: match?.tasksWorkedOn || '',
          remarks: match?.remarks || '',
          update: match || null
        };
      });

      const firstDay = days[0];
      const lastDay = days[5];
      const firstDate = new Date(firstDay.dateStr);
      const lastDate = new Date(lastDay.dateStr);

      const dateRangeLabel = `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      const standardWeeklyBaseline = 36.0; // Fixed 6 days * 6h = 36.0 hours target
      const completedLoggedHours = Number(days.reduce((sum, d) => sum + (d.isMissedLog ? 0 : d.displayTotalHours), 0).toFixed(1));
      const weekTotalHours = Number(days.reduce((sum, d) => sum + d.displayTotalHours, 0).toFixed(1));
      const standardHoursCompleted = Math.min(completedLoggedHours, standardWeeklyBaseline);
      const netBurnoutHours = Math.max(0, Number((completedLoggedHours - standardWeeklyBaseline).toFixed(1)));
      const availableCapacity = Math.max(0, Number((standardWeeklyBaseline - completedLoggedHours).toFixed(1)));
      const overtimeDaysCount = days.filter(d => d.isOvertime).length;

      // 6-day bar chart data (Monday to Saturday)
      const chartData = days.map((d, i) => {
        return {
          day: d.dayShort,
          dayLabel: `Day ${i + 1}: ${d.dayShort}`,
          fullDay: `${d.dayName} (Day ${i + 1})`,
          dateStr: d.dateStr,
          inCurrentWeek: true,
          diffDays: d.diffDays,
          remainingGraceDays: d.remainingGraceDays,
          isWithinGrace: d.isWithinGrace,
          standardHours: d.standardHours,
          burnoutHours: d.burnoutHours,
          leaveHours: d.leaveHours,
          missedHours: d.missedHours,
          totalHours: d.displayTotalHours,
          isOvertime: d.isOvertime,
          hasLog: d.hasLog,
          isMissedLog: d.isMissedLog,
          isLeave: d.isLeave,
          leaveType: d.leaveType,
          leaveReason: d.leaveReason,
          classesCount: d.classesCount,
          dayClasses: d.dayClasses,
          practiceSessionsCount: d.practiceSessionsCount,
          invigilationHours: d.invigilationHours,
          invigilationDetails: d.invigilationDetails,
          paperEvaluationHours: d.paperEvaluationHours,
          inServiceHours: d.inServiceHours,
          tasksWorkedOn: d.tasksWorkedOn,
          remarks: d.remarks
        };
      });

      // Pie chart distribution data
      // e.g. for 38 hrs: Normal Standard Work = 36h (94.7%), Burnout Overtime = 2h (5.3%)
      // e.g. for 30 hrs: Normal Standard Work = 30h (83.3%), Remaining Capacity = 6h (16.7%)
      const totalPieSum = Math.max(weekTotalHours, standardWeeklyBaseline);
      const pieData = weekTotalHours === 0 ? [
        { name: 'Remaining Target Capacity', value: 36.0, color: '#e2e8f0', percentStr: '100%' }
      ] : [
        { 
          name: 'Normal Standard Work', 
          value: standardHoursCompleted, 
          color: '#0284c7',
          percentStr: `${Math.round((standardHoursCompleted / (weekTotalHours || 36.0)) * 100)}%`
        },
        ...(netBurnoutHours > 0 ? [{ 
          name: 'Burnout Overtime', 
          value: netBurnoutHours, 
          color: '#f59e0b',
          percentStr: `${Math.round((netBurnoutHours / weekTotalHours) * 100)}%`
        }] : []),
        ...(availableCapacity > 0 ? [{ 
          name: 'Remaining Capacity', 
          value: availableCapacity, 
          color: '#cbd5e1',
          percentStr: `${Math.round((availableCapacity / standardWeeklyBaseline) * 100)}%`
        }] : [])
      ];

      weeks.push({
        weekIndex,
        weekNumber,
        weekLabel: `Week ${weekNumber}`,
        dateRangeLabel,
        workingDaysCount: 6,
        standardWeeklyBaseline: 36.0,
        weekTotalHours,
        standardHoursCompleted,
        netBurnoutHours,
        availableCapacity,
        overtimeDaysCount,
        days,
        chartData,
        pieData
      });

      // Advance by 7 days to the next Monday
      currentMonday = new Date(currentMonday);
      currentMonday.setDate(currentMonday.getDate() + 7);
      weekIndex++;
    }

    return weeks;
  }, [selectedYear, selectedMonthIndex, myUpdates, classes, userProfile, userRegDateStr, todayStr]);

  // Full-Month 7-Column Executive Interactive Calendar Grid (Mon to Sun)
  const monthCalendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonthIndex, 1);
    const totalDaysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();

    // Day of week of 1st day (0 = Sun, 1 = Mon, ..., 6 = Sat)
    // We map to Monday = 0, Tuesday = 1, ..., Sunday = 6
    let startCol = firstDayOfMonth.getDay() - 1;
    if (startCol === -1) startCol = 6; // Sunday is column index 6

    const cells: Array<{
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isSunday: boolean;
      isToday: boolean;
      isPastDay: boolean;
      isFuture: boolean;
      isPreRegistration: boolean;
      isMissedLog: boolean;
      diffDays: number;
      remainingGraceDays: number;
      isWithinGrace: boolean;
      update: DailyUpdate | null;
      isLeave: boolean;
      leaveType: string;
      leaveReason: string;
      hoursLogged: number;
      classesCount: number;
      practiceCount: number;
      isOvertime: boolean;
      extraHours: number;
    }> = [];

    // 1. Previous month leading padding
    const prevMonthLastDate = new Date(selectedYear, selectedMonthIndex, 0).getDate();
    for (let i = startCol - 1; i >= 0; i--) {
      const pDay = prevMonthLastDate - i;
      const prevM = selectedMonthIndex === 0 ? 11 : selectedMonthIndex - 1;
      const prevY = selectedMonthIndex === 0 ? selectedYear - 1 : selectedYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
      const dayOfWeek = new Date(prevY, prevM, pDay).getDay();
      cells.push({
        dayNum: pDay,
        dateStr,
        isCurrentMonth: false,
        isSunday: dayOfWeek === 0,
        isToday: dateStr === todayStr,
        isPastDay: dateStr < todayStr,
        isFuture: dateStr > todayStr,
        isPreRegistration: Boolean(userRegDateStr && dateStr < userRegDateStr),
        isMissedLog: false,
        diffDays: 999,
        remainingGraceDays: 0,
        isWithinGrace: false,
        update: null,
        isLeave: false,
        leaveType: 'NONE',
        leaveReason: '',
        hoursLogged: 0,
        classesCount: 0,
        practiceCount: 0,
        isOvertime: false,
        extraHours: 0,
      });
    }

    // 2. Days of current selected month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(selectedYear, selectedMonthIndex, d).getDay();
      const isSunday = dayOfWeek === 0;
      const isToday = dateStr === todayStr;
      const isPastDay = dateStr < todayStr;
      const isFuture = dateStr > todayStr;
      const isPreReg = Boolean(userRegDateStr && dateStr < userRegDateStr);

      const match = myUpdates.find(u => (u.date || '').split('T')[0] === dateStr);
      const dayClasses = (classes || []).filter(c => c.userId === userProfile?.uid && (c.date || '').split('T')[0] === dateStr && c.status !== 'Cancelled');

      const todayDate = new Date(todayStr + 'T00:00:00');
      const thisDayDate = new Date(dateStr + 'T00:00:00');
      const diffMs = todayDate.getTime() - thisDayDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const isWithinGrace = diffDays <= 7 && diffDays > 0;
      const remainingGraceDays = Math.max(0, 7 - diffDays);

      const isMissed = isPastDay && !isSunday && !isPreReg && !match;
      const isLeave = !!match?.isLeave;
      const leaveType = match?.leaveType || 'NONE';
      const leaveReason = match?.leaveReason || '';
      const hoursLogged = match ? Number(match.hoursLogged ?? match.calculatedTotalHours ?? (isLeave ? 6 : 0)) : 0;
      const classesCount = match?.classesCount !== undefined ? match.classesCount : dayClasses.length;
      const practiceCount = match?.practiceSessionsCount || 0;
      const extraHours = isLeave ? 0 : Math.max(0, hoursLogged - 6);
      const isOvertime = extraHours > 0;

      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        isSunday,
        isToday,
        isPastDay,
        isFuture,
        isPreRegistration: isPreReg,
        isMissedLog: isMissed,
        diffDays,
        remainingGraceDays,
        isWithinGrace,
        update: match || null,
        isLeave,
        leaveType,
        leaveReason,
        hoursLogged,
        classesCount,
        practiceCount,
        isOvertime,
        extraHours: Number(extraHours.toFixed(1)),
      });
    }

    // 3. Next month trailing padding to complete full 7-day grid rows
    const remainder = cells.length % 7;
    if (remainder > 0) {
      const trailingCount = 7 - remainder;
      for (let t = 1; t <= trailingCount; t++) {
        const nextM = selectedMonthIndex === 11 ? 0 : selectedMonthIndex + 1;
        const nextY = selectedMonthIndex === 11 ? selectedYear + 1 : selectedYear;
        const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
        const dayOfWeek = new Date(nextY, nextM, t).getDay();
        cells.push({
          dayNum: t,
          dateStr,
          isCurrentMonth: false,
          isSunday: dayOfWeek === 0,
          isToday: dateStr === todayStr,
          isPastDay: false,
          isFuture: true,
          isPreRegistration: false,
          isMissedLog: false,
          diffDays: 0,
          remainingGraceDays: 0,
          isWithinGrace: false,
          update: null,
          isLeave: false,
          leaveType: 'NONE',
          leaveReason: '',
          hoursLogged: 0,
          classesCount: 0,
          practiceCount: 0,
          isOvertime: false,
          extraHours: 0,
        });
      }
    }

    return cells;
  }, [selectedYear, selectedMonthIndex, myUpdates, classes, userProfile, userRegDateStr, todayStr]);

  // Executive Month Statistics Summary
  const monthCalendarSummary = useMemo(() => {
    const currentMonthDays = monthCalendarGrid.filter(c => c.isCurrentMonth);
    const pastOrTodayWorkdays = currentMonthDays.filter(c => !c.isSunday && !c.isFuture && !c.isPreRegistration);
    const loggedCount = currentMonthDays.filter(c => c.update && !c.isLeave).length;
    const leaveCount = currentMonthDays.filter(c => c.isLeave).length;
    const missedCount = currentMonthDays.filter(c => c.isMissedLog).length;
    const totalHoursLogged = currentMonthDays.reduce((sum, c) => sum + (c.update ? c.hoursLogged : 0), 0);

    return {
      totalWorkdays: pastOrTodayWorkdays.length,
      loggedDays: loggedCount,
      leaveDays: leaveCount,
      missedDays: missedCount,
      totalHours: Number(totalHoursLogged.toFixed(1)),
    };
  }, [monthCalendarGrid]);

  // Automatically select the active week containing today (or registration date) or target position
  useEffect(() => {
    if (monthWeeksData.length === 0) return;

    if (targetWeekOnMonthChange === 'first') {
      setSelectedWeekIndex(0);
      setTargetWeekOnMonthChange(null);
      return;
    }

    if (targetWeekOnMonthChange === 'last') {
      setSelectedWeekIndex(Math.max(0, monthWeeksData.length - 1));
      setTargetWeekOnMonthChange(null);
      return;
    }

    // 1. Check if the current month contains today's date
    const currentWeekIdx = monthWeeksData.findIndex(w => 
      w.days.some(d => d.dateStr === todayStr)
    );

    if (currentWeekIdx !== -1) {
      setSelectedWeekIndex(currentWeekIdx);
    } else {
      // 2. If viewing another month, check if user's registration date is in that month
      const regWeekIdx = userRegDateStr
        ? monthWeeksData.findIndex(w => w.days.some(d => d.dateStr === userRegDateStr))
        : -1;
      
      if (regWeekIdx !== -1) {
        setSelectedWeekIndex(regWeekIdx);
      } else {
        setSelectedWeekIndex(0);
      }
    }
  }, [selectedYear, selectedMonthIndex, monthWeeksData, todayStr, userRegDateStr, targetWeekOnMonthChange]);

  const handlePrevMonth = () => {
    setTargetWeekOnMonthChange('first');
    if (selectedMonthIndex === 0) {
      setSelectedYear(prev => prev - 1);
      setSelectedMonthIndex(11);
    } else {
      setSelectedMonthIndex(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setTargetWeekOnMonthChange('first');
    if (selectedMonthIndex === 11) {
      setSelectedYear(prev => prev + 1);
      setSelectedMonthIndex(0);
    } else {
      setSelectedMonthIndex(prev => prev + 1);
    }
  };

  const handlePrevWeek = () => {
    if (selectedWeekIndex > 0) {
      setSelectedWeekIndex(prev => prev - 1);
    } else {
      setTargetWeekOnMonthChange('last');
      if (selectedMonthIndex === 0) {
        setSelectedYear(prev => prev - 1);
        setSelectedMonthIndex(11);
      } else {
        setSelectedMonthIndex(prev => prev - 1);
      }
    }
  };

  const handleNextWeek = () => {
    if (selectedWeekIndex < monthWeeksData.length - 1) {
      setSelectedWeekIndex(prev => prev + 1);
    } else {
      setTargetWeekOnMonthChange('first');
      if (selectedMonthIndex === 11) {
        setSelectedYear(prev => prev + 1);
        setSelectedMonthIndex(0);
      } else {
        setSelectedMonthIndex(prev => prev + 1);
      }
    }
  };

  const handleJumpToCurrent = () => {
    const currentNow = new Date();
    setTargetWeekOnMonthChange(null);
    setSelectedYear(currentNow.getFullYear());
    setSelectedMonthIndex(currentNow.getMonth());
  };

  const activeWeek = useMemo(() => {
    if (monthWeeksData.length === 0) return null;
    return monthWeeksData[selectedWeekIndex] || monthWeeksData[0];
  }, [monthWeeksData, selectedWeekIndex]);

  // Calculate Weekly Burnout & Workload Metrics (last 6 working days or current week)
  const weeklyMetrics = useMemo(() => {
    if (activeWeek) {
      const weeklyBurnoutStatus = activeWeek.netBurnoutHours > 0 
        ? 'Elevated Burnout Risk' 
        : 'Healthy Workload';

      return {
        totalWeeklyHours: activeWeek.weekTotalHours,
        totalWeeklyExtra: activeWeek.netBurnoutHours,
        burnoutDaysCount: activeWeek.overtimeDaysCount,
        weeklyBurnoutStatus,
        loggedDaysCount: activeWeek.days.filter(d => d.hasLog).length,
        standardWeeklyBaseline: activeWeek.standardWeeklyBaseline,
        workingDaysCount: activeWeek.workingDaysCount
      };
    }

    const recentUpdates = myUpdates.slice(0, 6);
    const totalWeeklyHours = recentUpdates.reduce((acc, u) => acc + (u.hoursLogged || 6), 0);
    const totalWeeklyExtra = recentUpdates.reduce((acc, u) => {
      const extra = u.extraHoursWorked !== undefined ? u.extraHoursWorked : Math.max(0, (u.hoursLogged || 6) - 6);
      return acc + extra;
    }, 0);

    const burnoutDaysCount = recentUpdates.filter(u => (u.hoursLogged || 6) > 6).length;
    const weeklyBurnoutStatus = totalWeeklyHours > STANDARD_WORK_HOURS_PER_WEEK 
      ? 'Elevated Burnout Risk' 
      : 'Healthy Workload';

    return {
      totalWeeklyHours: Number(totalWeeklyHours.toFixed(1)),
      totalWeeklyExtra: Number(totalWeeklyExtra.toFixed(1)),
      burnoutDaysCount,
      weeklyBurnoutStatus,
      loggedDaysCount: recentUpdates.length,
      standardWeeklyBaseline: 36.0,
      workingDaysCount: 6
    };
  }, [activeWeek, myUpdates]);

  const filteredUpdates = useMemo(() => {
    return myUpdates.filter(u => {
      if (dateFilter && u.date !== dateFilter) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const match = 
          (u.classesHandled && u.classesHandled.toLowerCase().includes(q)) ||
          (u.tasksWorkedOn && u.tasksWorkedOn.toLowerCase().includes(q)) ||
          (u.additionalResponsibilities && u.additionalResponsibilities.toLowerCase().includes(q)) ||
          (u.extraWorkReason && u.extraWorkReason.toLowerCase().includes(q)) ||
          (u.projectUpdates && u.projectUpdates.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [myUpdates, dateFilter, searchFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDate = (formData.date || todayStr).split('T')[0];

    if (userRegDateStr && targetDate < userRegDateStr) {
      addToast({
        title: 'Pre-Registration Date Not Allowed',
        message: `Attendance and work logs can only be recorded starting from your account registration date (${userRegDateStr}).`,
        type: 'error',
        duration: 5000
      });
      return;
    }

    if (targetDate > todayStr) {
      addToast({
        title: 'Future Date Not Allowed',
        message: 'Attendance and daily work cannot be logged for future dates.',
        type: 'error',
        duration: 5000
      });
      return;
    }

    if (duplicateConflict) {
      addToast({
        title: 'Duplicate Submission Prevented',
        message: `A work log for ${formData.date} already exists. A trainee is allowed exactly 1 work log per day. Please edit the existing entry instead.`,
        type: 'error',
        duration: 5000
      });
      return;
    }

    setSaving(true);
    try {
      const isLeave = !!formData.isLeave && formData.leaveType !== 'NONE';
      const leaveType = isLeave ? formData.leaveType : 'NONE';
      const leaveReason = isLeave ? formData.leaveReason.trim() : '';
      const leaveTypeTitle = leaveType === 'CASUAL_LEAVE' 
        ? 'Casual Leave (CL)' 
        : leaveType === 'SICK_LEAVE' 
        ? 'Sick Leave (SL)' 
        : leaveType === 'UNPAID_LEAVE' 
        ? 'Unpaid Leave (LOP)' 
        : 'Normal Workday';

      let additionalSummary = 'None';
      if (formData.additionalCategory === 'Invigilation') {
        additionalSummary = `Exam Invigilation: ${invigilationHrs} hrs${formData.invigilationDetails ? ` (${formData.invigilationDetails})` : ''}`;
      } else if (formData.additionalCategory === 'Paper Evaluation') {
        additionalSummary = `Paper Evaluation: ${paperEvalHrs} hrs`;
      } else if (formData.additionalCategory === 'In-service') {
        additionalSummary = `In-service: ${inServiceHrs} hrs`;
      } else if (formData.additionalCategory === 'Both') {
        additionalSummary = `Paper Evaluation: ${paperEvalHrs} hrs | In-service: ${inServiceHrs} hrs`;
      } else if (formData.additionalCategory === 'All Duties') {
        additionalSummary = `Invigilation: ${invigilationHrs} hrs | Paper Eval: ${paperEvalHrs} hrs | In-service: ${inServiceHrs} hrs`;
      }

      const rawHours = isLeave 
        ? (leaveType === 'UNPAID_LEAVE' ? 0 : STANDARD_WORK_HOURS_PER_DAY)
        : (Number(formData.hoursLogged) || totalWorkHoursToday || STANDARD_WORK_HOURS_PER_DAY);
      const finalHoursLogged = Math.min(MAX_WORK_HOURS_PER_DAY, Math.max(0, rawHours));
      const finalExtraHours = isLeave ? 0 : Number(Math.max(0, finalHoursLogged - STANDARD_WORK_HOURS_PER_DAY).toFixed(2));
      const burnoutRisk = isLeave ? 'Normal' : getBurnoutRiskLevel(finalHoursLogged);

      const payload = {
        userId: userProfile.uid,
        employeeId: userProfile.employeeId || '',
        employeeName: userProfile.fullName || '',
        teamId: userProfile.teamId || '',
        managerId: userProfile.managerId || '',
        date: targetDate,
        classesHandled: isLeave ? `0 Classes (${leaveTypeTitle})` : `${formData.classesCount} Classes`,
        classesCount: isLeave ? 0 : Number(formData.classesCount),
        classDurationMinutes: isLeave ? 0 : Number(formData.classDurationMinutes),
        totalClassesDurationMinutes: isLeave ? 0 : totalClassesMinutes,
        practiceSessionsCount: isLeave ? 0 : Number(formData.practiceSessionsCount),
        practiceDurationMinutes: isLeave ? 0 : Number(formData.practiceDurationMinutes),
        totalPracticeDurationMinutes: isLeave ? 0 : totalPracticeMinutes,
        totalSessionsCount: isLeave ? 0 : (Number(formData.classesCount) + Number(formData.practiceSessionsCount)),
        sessionMinutesCalculated: isLeave ? 0 : totalTeachingMinutes,
        tasksWorkedOn: isLeave ? `[${leaveTypeTitle}] ${leaveReason || 'Authorized Leave'}` : (formData.tasksWorkedOn.trim() || `${formData.classesCount} Classes and ${formData.practiceSessionsCount} Practice Sessions conducted`),
        projectUpdates: isLeave ? `On Leave (${leaveTypeTitle})` : `${formData.practiceSessionsCount} Practice Sessions (${totalPracticeMinutes} mins)`,
        additionalCategory: isLeave ? 'None' : formData.additionalCategory,
        additionalResponsibilities: isLeave ? 'None (On Leave)' : additionalSummary,
        paperEvaluationHours: isLeave ? 0 : paperEvalHrs,
        inServiceHours: isLeave ? 0 : inServiceHrs,
        invigilationHours: isLeave ? 0 : invigilationHrs,
        invigilationDetails: isLeave ? '' : formData.invigilationDetails.trim(),
        isLeave,
        leaveType,
        leaveReason,
        calculatedTotalHours: isLeave ? (leaveType === 'UNPAID_LEAVE' ? 0 : 6) : totalWorkHoursToday,
        standardWorkingHours: STANDARD_WORK_HOURS_PER_DAY,
        weeklyStandardHours: STANDARD_WORK_HOURS_PER_WEEK,
        extraHoursWorked: finalExtraHours,
        burnoutRiskLevel: burnoutRisk,
        extraWorkReason: isLeave ? 'None' : (finalExtraHours > 0 ? (formData.extraWorkReason || 'Overtime Duty') : 'None'),
        extraWorkDetails: isLeave ? '' : (formData.extraWorkDetails.trim() || formData.remarks.trim() || ''),
        remarks: isLeave ? leaveReason : (formData.remarks.trim() || (finalExtraHours > 0 ? formData.extraWorkDetails.trim() : '')),
        hoursLogged: finalHoursLogged,
      };

      // Determine target ID: explicitly editing ID or existing log for this date
      const existingLogForDate = myUpdates.find(u => (u.date || '').split('T')[0] === targetDate);
      const targetId = editingUpdateId || existingLogForDate?.id || null;
      const wasLeavePreviously = !!existingLogForDate?.isLeave;

      if (targetId) {
        await updateDailyUpdate(targetId, payload);
        if (wasLeavePreviously && !isLeave) {
          addToast({
            title: 'Leave Converted to Normal Workday',
            message: `Previous leave record for ${targetDate} was converted to a working day with ${formData.classesCount} classes (${finalHoursLogged}h logged).`,
            type: 'success',
            duration: 5000
          });
        } else if (!wasLeavePreviously && isLeave) {
          addToast({
            title: 'Workday Converted to Leave',
            message: `Workday record for ${targetDate} was updated to ${leaveTypeTitle}. Previous workload details cleared.`,
            type: 'success',
            duration: 5000
          });
        } else if (rawWorkHoursToday >= MAX_WORK_HOURS_PER_DAY) {
          addToast({
            title: 'Daily Work Log Updated (12h Limit Applied)',
            message: `Work log for ${targetDate} updated at 12.0 hours maximum limit (activities reached ${rawWorkHoursToday.toFixed(1)}h).`,
            type: 'info',
            duration: 5000
          });
        } else {
          addToast({
            title: 'Daily Work Log Updated',
            message: `Your work log for ${targetDate} was updated successfully (${finalHoursLogged}h logged).`,
            type: 'success',
            duration: 4000
          });
        }
      } else {
        await addDailyUpdate(payload);
        if (rawWorkHoursToday >= MAX_WORK_HOURS_PER_DAY) {
          addToast({
            title: 'Daily Work Log Submitted (12h Limit Applied)',
            message: `Work log for ${targetDate} recorded at 12.0 hours maximum limit (activities reached ${rawWorkHoursToday.toFixed(1)}h).`,
            type: 'info',
            duration: 5000
          });
        } else {
          addToast({
            title: 'Daily Work Log Submitted',
            message: `Your work log for ${targetDate} has been recorded (${finalHoursLogged}h logged).`,
            type: 'success',
            duration: 4000
          });
        }
      }

      // Cleanly reset all modal and edit state
      setIsModalOpen(false);
      setEditingUpdateId(null);
      setSelectedDetailUpdate(null);
      setFormData(getInitialFormData(todayStr));
    } catch (err) {
      console.error('Error saving daily update:', err);
      addToast({
        title: 'Save Failed',
        message: 'Could not save your daily work update. Please try again.',
        type: 'error',
        duration: 4000
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Daily Work & Instructor Burnout Tracking
            </h1>
            <span className="rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold px-2.5 py-0.5 border border-sky-200">
              6 Hours / Day Baseline
            </span>
            {todayUpdate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 border border-emerald-300">
                <CheckCircle className="h-3 w-3 text-emerald-600" />
                <span>Today's Log Submitted ({todayUpdate.hoursLogged || 6}h)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Log daily classes (1 hour standard), practice sessions (1 hour standard), and track overtime hours worked over the 6h standard limit to prevent burnout. (1 submission per day policy).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {todayUpdate ? (
            <>
              <button
                type="button"
                id="edit-today-daily-work-btn"
                onClick={() => openEditModal(todayUpdate)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition-colors cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
                <span>Edit Today's Log ({todayUpdate.date})</span>
              </button>
              <button
                type="button"
                id="log-past-date-btn"
                onClick={openNewModalForPastDate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-sky-800 hover:bg-sky-50 transition-colors cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-sky-600" />
                <span>Log Past Date</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              id="new-daily-work-update-btn"
              onClick={openNewModal}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Submit Daily Work Update</span>
            </button>
          )}
        </div>
      </div>

      {/* 7-Day Grace Window Missed Logs Banner */}
      {missedPreviousDays.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-rose-100 p-2.5 text-rose-700 shrink-0 border border-rose-300 shadow-2xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-extrabold text-rose-950">
                  7-Day Grace Period: Pending Missed Work Logs
                </h4>
                <span className="rounded-full bg-rose-200 text-rose-900 text-[10px] font-black px-2.5 py-0.5 border border-rose-300 animate-pulse">
                  {missedPreviousDays.length} {missedPreviousDays.length === 1 ? 'Unlogged Day' : 'Unlogged Days'}
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1">
                You forgot to log your daily work on{' '}
                <strong className="font-bold text-rose-950">
                  {missedPreviousDays.map(m => `${m.label} (${m.dayName})`).join(', ')}
                </strong>
                . Instructors have a strict <strong>7-day grace window</strong> to backfill forgotten records. Click any day below to submit attendance before it expires.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {missedPreviousDays.map(m => (
              <button
                key={m.dateStr}
                type="button"
                onClick={() => openModalForDate(m.dateStr)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Fill {m.label}</span>
                <span className="bg-rose-800/80 text-rose-100 text-[10px] px-1.5 py-0.2 rounded-md font-semibold">
                  {m.daysRemaining > 0 ? `${m.daysRemaining}d left` : 'Last day!'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trainee Daily Submission Rule Banner */}
      {todayUpdate ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 shrink-0 mt-0.5">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-emerald-950">
                  Today's Work Log is Already Submitted ({todayUpdate.date})
                </h4>
                <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md">
                  {todayUpdate.hoursLogged || 6} Hours Recorded
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Each trainee is permitted <strong>1 work log per day</strong>. If you made any mistakes or need to add more sessions/evaluations, use the <strong>Edit Log</strong> button below without starting from scratch.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openEditModal(todayUpdate)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Today's Log</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700 shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950">
                Today's Work Log is Pending ({todayStr})
              </h4>
              <p className="text-[11px] text-amber-800 mt-0.5">
                You haven't submitted your work log for today yet. Remember to log your classes, practice sessions, and academic duties before ending your day.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log Today's Work</span>
          </button>
        </div>
      )}

      {/* Interactive Weekly Work & Burnout Analytics Module */}
      <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-xs space-y-5">
        {/* Module Header & Month Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-sky-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 shadow-2xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {calendarDisplayMode === 'calendar' ? 'Monthly Attendance & Workload Calendar' : 'Weekly Workload & Attendance Tracker'}
                </h2>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedYear(prev => prev - 1)}
                    className="hover:text-sky-600 cursor-pointer px-0.5"
                    title="Previous Year"
                  >
                    &laquo;
                  </button>
                  <span>{selectedYear}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedYear(prev => prev + 1)}
                    className="hover:text-sky-600 cursor-pointer px-0.5"
                    title="Next Year"
                  >
                    &raquo;
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Official 6-day work week (Monday &ndash; Saturday &bull; 6h baseline). Sunday is weekly holiday.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setCalendarDisplayMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  calendarDisplayMode === 'calendar'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Monthly Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => setCalendarDisplayMode('weekly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  calendarDisplayMode === 'weekly'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Weekly Workload Chart</span>
              </button>
            </div>

            {/* Month Selector Pills & Controls */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-800 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleJumpToCurrent}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 text-sky-900 hover:bg-sky-200 border border-sky-200 transition-colors cursor-pointer shrink-0"
                title="Jump to Current Month and Week"
              >
                Today
              </button>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                {MONTH_SHORTS.map((mShort, mIdx) => {
                  const isSelected = mIdx === selectedMonthIndex;
                  const isCurrentMonth = mIdx === new Date().getMonth() && selectedYear === new Date().getFullYear();
                  return (
                    <button
                      key={mShort}
                      type="button"
                      onClick={() => setSelectedMonthIndex(mIdx)}
                      className={`relative px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : isCurrentMonth
                          ? 'bg-sky-100 text-sky-900 border border-sky-300 font-extrabold'
                          : 'bg-sky-50 text-slate-700 hover:bg-sky-100 hover:text-sky-900'
                      }`}
                    >
                      <span>{mShort}</span>
                      {isCurrentMonth && !isSelected && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-sky-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-800 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* MONTHLY CALENDAR GRID VIEW */}
        {calendarDisplayMode === 'calendar' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Month Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Working Days (Mon-Sat)
                </span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  {monthCalendarSummary.totalWorkdays} Days
                </span>
                <span className="text-[10px] text-slate-500 block">Sundays excluded</span>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Logs Submitted
                </span>
                <span className="text-lg font-black text-emerald-950 mt-0.5 block">
                  {monthCalendarSummary.loggedDays} Days
                </span>
                <span className="text-[10px] text-emerald-700 block">Work accounted</span>
              </div>

              <div className={`rounded-xl border p-3 text-center ${
                monthCalendarSummary.missedDays > 0 
                  ? 'border-rose-300 bg-rose-50 text-rose-950' 
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}>
                <span className="text-[10px] font-bold uppercase tracking-wider block flex items-center justify-center gap-1">
                  {monthCalendarSummary.missedDays > 0 && <AlertTriangle className="h-3 w-3 text-rose-600 animate-pulse" />}
                  <span>Missed Workdays</span>
                </span>
                <span className="text-lg font-black mt-0.5 block">
                  {monthCalendarSummary.missedDays > 0 ? `${monthCalendarSummary.missedDays} Pending` : '0 (None)'}
                </span>
                <span className="text-[10px] opacity-80 block">
                  {monthCalendarSummary.missedDays > 0 ? '7-Day Grace Window Active' : 'All logs up to date'}
                </span>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 text-center">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
                  Taken Leaves
                </span>
                <span className="text-lg font-black text-purple-950 mt-0.5 block">
                  {monthCalendarSummary.leaveDays} Days
                </span>
                <span className="text-[10px] text-purple-700 block">CL / SL / LOP</span>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                  Total Month Hours
                </span>
                <span className="text-lg font-black text-sky-950 mt-0.5 block">
                  {monthCalendarSummary.totalHours} hrs
                </span>
                <span className="text-[10px] text-sky-700 block">Logged output</span>
              </div>
            </div>

            {/* 7-Column Modern Calendar Grid */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              {/* Day Header Row */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-700">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday (Off)'].map((colName, idx) => (
                  <div
                    key={colName}
                    className={`py-2.5 px-1 border-r last:border-r-0 border-slate-200 ${
                      idx === 6 ? 'text-amber-800 bg-amber-50/40' : ''
                    }`}
                  >
                    <span className="hidden sm:inline">{colName}</span>
                    <span className="sm:hidden">{colName.slice(0, 3)}</span>
                  </div>
                ))}
              </div>

              {/* Day Cards Grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
                {monthCalendarGrid.map((cell, cIdx) => {
                  const isSun = cell.isSunday;
                  const isCurrent = cell.isCurrentMonth;
                  const isMissed = cell.isMissedLog;
                  const isToday = cell.isToday;
                  const isLeave = cell.isLeave;
                  const hasLog = !!cell.update;

                  return (
                    <div
                      key={`${cell.dateStr}-${cIdx}`}
                      className={`min-h-[110px] p-2 flex flex-col justify-between transition-all relative ${
                        !isCurrent 
                          ? 'bg-slate-50/30 opacity-40' 
                          : isMissed 
                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200/80 shadow-2xs' 
                          : isLeave 
                          ? 'bg-purple-50/40 hover:bg-purple-50/70' 
                          : isToday 
                          ? 'bg-sky-50/60 ring-2 ring-sky-300 shadow-2xs' 
                          : isSun 
                          ? 'bg-amber-50/20' 
                          : hasLog 
                          ? 'bg-white hover:bg-sky-50/20' 
                          : 'bg-white'
                      }`}
                    >
                      {/* Top Header of Cell: Day Number & Status Badges */}
                      <div className="flex items-start justify-between gap-1">
                        <span className={`text-xs font-black ${
                          !isCurrent 
                            ? 'text-slate-400' 
                            : isMissed 
                            ? 'text-rose-700 text-sm' 
                            : isToday 
                            ? 'text-sky-700 text-sm' 
                            : isSun 
                            ? 'text-slate-500' 
                            : 'text-slate-800'
                        }`}>
                          {cell.dayNum}
                        </span>

                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {isToday && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-sky-600 text-white shadow-2xs">
                              Today
                            </span>
                          )}

                          {isMissed && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-rose-600 text-white animate-pulse">
                              Missed
                            </span>
                          )}

                          {isLeave && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-purple-600 text-white">
                              Leave
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Cell Content */}
                      <div className="my-1.5 space-y-1">
                        {isMissed ? (
                          <div className="rounded-lg bg-rose-100/90 p-1.5 border border-rose-300 text-left space-y-1">
                            <div className="text-[10px] font-extrabold text-rose-900 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                              <span>Daily log not submitted</span>
                            </div>
                            <div className="text-[9px] font-bold text-rose-800 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                              <span>You haven't filled the daily log</span>
                            </div>
                            {cell.isWithinGrace && (
                              <div className="text-[8px] font-bold text-rose-700 bg-rose-200/60 px-1 py-0.5 rounded-sm">
                                {cell.remainingGraceDays > 0 ? `${cell.remainingGraceDays} days left to fill` : 'Last day to submit!'}
                              </div>
                            )}
                          </div>
                        ) : isLeave ? (
                          <div className="rounded-lg bg-purple-100/70 p-1.5 border border-purple-200 text-left space-y-0.5">
                            <span className="text-[10px] font-extrabold text-purple-950 flex items-center gap-1">
                              <Palmtree className="h-3 w-3 text-purple-600 shrink-0" />
                              <span className="truncate">
                                {cell.leaveType === 'CASUAL_LEAVE' ? 'Casual Leave' : cell.leaveType === 'SICK_LEAVE' ? 'Sick Leave' : 'Unpaid Leave'}
                              </span>
                            </span>
                            <span className="text-[9px] text-purple-800 font-semibold block">
                              {cell.leaveType === 'UNPAID_LEAVE' ? '0.0h (LOP)' : '6.0h Accounted'}
                            </span>
                          </div>
                        ) : hasLog ? (
                          <div className="rounded-lg bg-sky-50 p-1.5 border border-sky-100 text-left space-y-0.5">
                            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-900">
                              <span>{cell.hoursLogged} hrs</span>
                              {cell.isOvertime ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-700 bg-amber-100 px-1 rounded-sm">
                                  <Flame className="h-2.5 w-2.5 text-amber-600" />
                                  +{cell.extraHours}h
                                </span>
                              ) : (
                                <span className="text-emerald-600">
                                  <ShieldCheck className="h-3 w-3 inline" />
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-500 font-medium truncate">
                              {cell.classesCount > 0 ? `${cell.classesCount} Classes` : ''}
                              {cell.classesCount > 0 && cell.practiceCount > 0 ? ' &bull; ' : ''}
                              {cell.practiceCount > 0 ? `${cell.practiceCount} Practice` : ''}
                              {cell.classesCount === 0 && cell.practiceCount === 0 ? 'Work Logged' : ''}
                            </div>
                          </div>
                        ) : isSun ? (
                          <div className="text-center py-2">
                            <span className="text-[10px] text-slate-400 font-semibold block flex items-center justify-center gap-1">
                              <Sun className="h-3 w-3 text-amber-400" />
                              <span>Weekly Off</span>
                            </span>
                          </div>
                        ) : cell.isPreRegistration ? (
                          <div className="text-center py-2 text-[10px] text-slate-400 italic">
                            Pre-Account
                          </div>
                        ) : cell.isFuture ? (
                          <div className="text-center py-2 text-[10px] text-slate-400 font-medium">
                            Upcoming
                          </div>
                        ) : (
                          <div className="text-center py-2 text-[10px] text-slate-400">
                            Pending
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Button */}
                      <div className="pt-1">
                        {isMissed ? (
                          <button
                            type="button"
                            onClick={() => openModalForDate(cell.dateStr)}
                            className="w-full py-1 px-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Fill Log</span>
                          </button>
                        ) : hasLog ? (
                          <button
                            type="button"
                            onClick={() => openEditModal(cell.update!)}
                            className="w-full py-0.5 px-1 rounded-lg bg-white hover:bg-sky-50 border border-slate-200 text-slate-700 hover:text-sky-900 text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Pencil className="h-2.5 w-2.5 text-slate-500" />
                            <span>Edit</span>
                          </button>
                        ) : isToday && !hasLog ? (
                          <button
                            type="button"
                            onClick={openNewModal}
                            className="w-full py-1 px-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Log Today</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-emerald-500" />
                  <span>Logged Shift (&le;6h Standard)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-amber-500" />
                  <span>Overtime Worked (&gt;6h Shift)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-rose-500 animate-pulse" />
                  <span className="font-bold text-rose-800">Missed Log (7-Day Grace Window Active)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-purple-500" />
                  <span>Taken Leave (CL/SL/LOP)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-md bg-slate-300" />
                  <span>Sunday Weekly Off</span>
                </div>
              </div>

              <span className="text-2xs font-bold text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200">
                Switch to Weekly Workload Chart for hourly distribution &amp; charts
              </span>
            </div>
          </div>
        )}

        {/* WEEKLY WORKLOAD & BURNOUT CHART VIEW */}
        {calendarDisplayMode === 'weekly' && (
          <>
            {/* Week Selector Tabs */}
            {monthWeeksData.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1 shrink-0">
              <CalendarRange className="h-3.5 w-3.5 text-sky-600" />
              Select Week:
            </span>

            {/* Prev Week Button */}
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-800 transition-colors cursor-pointer shrink-0"
              title="Previous Week (moves across months if needed)"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {monthWeeksData.map((w, wIdx) => {
                const isSelected = wIdx === selectedWeekIndex;
                const isCurrentWeek = w.days.some(d => d.dateStr === todayStr);
                return (
                  <button
                    key={w.weekLabel}
                    type="button"
                    onClick={() => setSelectedWeekIndex(wIdx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-300'
                    }`}
                  >
                    <span>{w.weekLabel}</span>
                    {isCurrentWeek && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-black uppercase tracking-wider ${
                        isSelected ? 'bg-sky-700 text-white' : 'bg-sky-200 text-sky-900'
                      }`}>
                        Current
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-sky-700 text-sky-100' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {w.dateRangeLabel}
                    </span>
                    <span className={`text-[10px] font-extrabold ${
                      w.netBurnoutHours > 0 
                        ? (isSelected ? 'text-amber-200' : 'text-amber-700')
                        : (isSelected ? 'text-emerald-200' : 'text-emerald-700')
                    }`}>
                      ({w.workingDaysCount}d &bull; {w.standardWeeklyBaseline}h)
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Next Week Button */}
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-sky-50 hover:text-sky-800 transition-colors cursor-pointer shrink-0"
              title="Next Week (moves across months if needed)"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 4 Weekly Dynamic KPI Cards */}
        {activeWeek && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Daily Standard Benchmark */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-center">
              <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                Daily Max Standard
              </span>
              <span className="text-lg font-black text-slate-900 mt-0.5 block">6.0 hrs / day</span>
              <span className="text-2xs text-slate-500 block">6 Working Days (Mon &ndash; Sat)</span>
            </div>

            {/* Weekly Capacity for this Week */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 text-center">
              <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                {activeWeek.weekLabel} Target
              </span>
              <span className="text-lg font-black text-slate-900 mt-0.5 block">
                {activeWeek.standardWeeklyBaseline} hrs
              </span>
              <span className="text-2xs text-slate-500 block">
                {activeWeek.workingDaysCount} {activeWeek.workingDaysCount === 1 ? 'Working Day' : 'Working Days'} &times; 6.0h
              </span>
            </div>

            {/* Total Hours Worked this Week */}
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-center">
              <span className="text-2xs font-bold text-sky-800 uppercase tracking-wider block">
                {activeWeek.weekLabel} Worked
              </span>
              <span className="text-lg font-black text-sky-950 mt-0.5 block">
                {activeWeek.weekTotalHours} hrs
              </span>
              <span className="text-2xs text-sky-700 block">
                Target: {activeWeek.standardWeeklyBaseline} hrs
              </span>
            </div>

            {/* Weekly Burnout / Overtime */}
            <div className={`rounded-xl border p-3 text-center ${
              activeWeek.netBurnoutHours > 0
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}>
              <span className="text-2xs font-bold uppercase tracking-wider block">
                Weekly Burnout
              </span>
              <span className="text-lg font-black mt-0.5 block">
                {activeWeek.netBurnoutHours > 0 ? `+${activeWeek.netBurnoutHours} hrs Overtime` : '0.0 hrs (Balanced)'}
              </span>
              <span className="text-2xs opacity-80 block">
                {activeWeek.netBurnoutHours > 0 ? `${activeWeek.overtimeDaysCount} Overtime Days` : 'Zero Burnout (Healthy)'}
              </span>
            </div>
          </div>
        )}

        {/* Dual Interactive Visual Graphs */}
        {activeWeek && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Left Graph: 6-Day Workload vs 6.0h Daily Standard (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-sky-50/20 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-sky-600" />
                    <span>6-Day Workload ({activeWeek.weekLabel}: {activeWeek.dateRangeLabel})</span>
                  </h3>
                  <span className="text-2xs font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md">
                    6 Workdays (Mon &ndash; Sat)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Each day has a 6-hour standard threshold. Overtime exceeding 6.0h is tracked in amber.
                </p>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={activeWeek.chartData} 
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      onClick={(e: any) => {
                        if (e && e.activePayload && e.activePayload.length) {
                          const clicked = e.activePayload[0].payload;
                          if (clicked && clicked.dateStr) {
                            openModalForDate(clicked.dateStr);
                          }
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="dayLabel" 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false} 
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false} 
                        domain={[0, (dataMax: number) => Math.max(8, Math.ceil(dataMax + 1))]} 
                        unit="h"
                      />
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
                                    <div className="font-extrabold text-slate-900 text-sm">{d.fullDay}</div>
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
                                  ) : d.hasLog ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-300">
                                      <CheckCircle className="h-3 w-3 text-sky-600" />
                                      {d.totalHours}h Logged
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                      Pending
                                    </span>
                                  )}
                                </div>

                                {/* Classes Delivered Telemetry */}
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
                                            {cls.startTime ? ` &bull; ${cls.startTime}` : ''}
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
                                      0 classes scheduled (On Authorized Leave)
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
                                    <div className="font-bold flex items-center justify-between text-rose-800">
                                      <span className="flex items-center gap-1">
                                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                        Missed Work Log (6.0h Deficit)
                                      </span>
                                      {d.isWithinGrace && (
                                        <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-black animate-pulse">
                                          {d.remainingGraceDays > 0 ? `${d.remainingGraceDays} Days Left` : 'Last Day!'}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-rose-800 font-semibold leading-tight">
                                      {d.isWithinGrace
                                        ? `⚠️ ${d.remainingGraceDays} days remaining in the 7-day grace window to fill this log.`
                                        : '7-Day grace window has expired for this past date.'}
                                    </p>
                                    <p className="text-[10px] text-rose-600 font-bold underline cursor-pointer">
                                      👉 Click this red bar to open log form and submit attendance now
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
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', paddingBottom: '6px' }}
                      />
                      <ReferenceLine 
                        y={6} 
                        stroke="#0284c7" 
                        strokeDasharray="4 4" 
                        label={{ value: '6h Daily Standard', fill: '#0284c7', fontSize: 10, position: 'insideTopRight' }} 
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

              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                <span>Total Worked: <strong className="text-slate-800">{activeWeek.weekTotalHours} hrs</strong></span>
                <span>Capacity: <strong className="text-slate-800">{activeWeek.standardWeeklyBaseline} hrs</strong></span>
                <span className={activeWeek.netBurnoutHours > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                  {activeWeek.netBurnoutHours > 0 ? `Burnout: +${activeWeek.netBurnoutHours}h` : 'Balanced (Zero Burnout)'}
                </span>
              </div>
            </div>

            {/* Right Graph: Weekly Burnout & Capacity Pie / Donut Chart (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-sky-50/20 p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <PieIcon className="h-4 w-4 text-sky-600" />
                    <span>Weekly Capacity & Burnout Distribution</span>
                  </h3>
                  <span className={`text-2xs font-bold px-2 py-0.5 rounded-md ${
                    activeWeek.netBurnoutHours > 0 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {activeWeek.netBurnoutHours > 0 ? 'Burnout Risk' : 'Healthy Load'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Distribution of standard hours, burnout overtime, and remaining capacity.
                </p>

                <div className="h-44 w-full relative flex items-center justify-center">
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
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
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
                    <span className="text-sm font-black text-slate-900">{activeWeek.weekTotalHours}h</span>
                    <span className="text-[10px] text-slate-500">/ {activeWeek.standardWeeklyBaseline}h</span>
                  </div>
                </div>

                {/* Slices Legend */}
                <div className="space-y-1 text-xs pt-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-600 shrink-0" />
                      <span>Standard Met:</span>
                    </span>
                    <strong className="text-slate-900 text-[11px]">{activeWeek.standardHoursCompleted} hrs</strong>
                  </div>
                  {activeWeek.netBurnoutHours > 0 && (
                    <div className="flex items-center justify-between text-amber-700 font-bold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Burnout Overtime:</span>
                      </span>
                      <span>+{activeWeek.netBurnoutHours} hrs</span>
                    </div>
                  )}
                  {activeWeek.availableCapacity > 0 && (
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-300 shrink-0" />
                        <span>Remaining Capacity:</span>
                      </span>
                      <span>{activeWeek.availableCapacity} hrs</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                <span>Working Days: <strong className="text-slate-800">{activeWeek.workingDaysCount} Days</strong></span>
                <span className="text-emerald-700 font-semibold">Sunday: Off (0h)</span>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Burnout Report Table (Day 1: Mon to Day 6: Sat) */}
        {activeWeek && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-sky-600" />
                  <span>Weekly Burnout Report &bull; {activeWeek.weekLabel} ({activeWeek.dateRangeLabel}, {selectedYear})</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Standard 6 working days from Monday (Day 1) to Saturday (Day 6). Sunday is a holiday.
                </p>
              </div>

              <span className="text-xs font-bold bg-white text-slate-800 px-3 py-1 rounded-lg border border-slate-200 shadow-2xs shrink-0">
                Week Total: <strong>{activeWeek.weekTotalHours} hrs</strong> (Standard Target: {activeWeek.standardWeeklyBaseline} hrs)
              </span>
            </div>

            {/* Clean Table of the 6 Working Days */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-2xs">
                    <th className="py-2.5 px-3">Working Day & Date</th>
                    <th className="py-2.5 px-3">Standard Limit</th>
                    <th className="py-2.5 px-3">Hours Logged</th>
                    <th className="py-2.5 px-3">Burnout / Overtime</th>
                    <th className="py-2.5 px-3">Tasks & Duties</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {activeWeek.days.map((day) => {
                    const isSun = day.dayOfWeek === 0;
                    const isToday = day.dateStr === todayStr;
                    const isPreRegistration = Boolean(userRegDateStr && day.dateStr < userRegDateStr);
                    const isFuture = day.dateStr > todayStr;
                    return (
                      <tr 
                        key={day.dateStr}
                        className={`transition-colors ${
                          day.isMissedLog
                            ? 'bg-rose-50/50 hover:bg-rose-50/80 border-l-4 border-l-rose-500 shadow-2xs'
                            : day.isLeave
                            ? 'bg-purple-50/40 hover:bg-purple-50/70 border-l-4 border-l-purple-500'
                            : isToday 
                            ? 'bg-sky-50/80 border-l-4 border-l-sky-600 shadow-2xs' 
                            : day.isOvertime 
                            ? 'bg-amber-50/50 hover:bg-amber-50/80' 
                            : day.hasLog 
                            ? 'bg-white hover:bg-sky-50/30' 
                            : isPreRegistration
                            ? 'bg-slate-50/30 text-slate-400 opacity-60'
                            : 'bg-slate-50/30 hover:bg-slate-100/50'
                        }`}
                      >
                        {/* Day & Date */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">{day.dayOrderName}</span>
                            {isToday && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-600 text-white shadow-2xs">
                                Today
                              </span>
                            )}
                            {day.isMissedLog && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                                Missed Log
                              </span>
                            )}
                            {day.isLeave && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white">
                                Leave
                              </span>
                            )}
                            {day.dateStr === userRegDateStr && !isToday && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Registration Day
                              </span>
                            )}
                          </div>
                          <div className="text-2xs text-slate-500 font-medium">{day.dateStr}</div>
                        </td>

                        {/* Standard Limit */}
                        <td className="py-2.5 px-3 text-slate-600 font-semibold">
                          {isSun ? 'Holiday (0h)' : '6.0 hrs'}
                        </td>

                        {/* Hours Logged */}
                        <td className="py-2.5 px-3">
                          {day.isMissedLog ? (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-slate-400 text-xs">0.0 hrs</span>
                              <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-300">
                                6h Deficit
                              </span>
                            </div>
                          ) : day.isLeave ? (
                            <div className="flex items-center gap-1">
                              <span className="font-black text-purple-900 text-xs">
                                {day.hoursLogged} hrs
                              </span>
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md border border-purple-200">
                                {day.leaveType === 'UNPAID_LEAVE' ? 'LOP' : 'Shift Credited'}
                              </span>
                            </div>
                          ) : day.hasLog ? (
                            <span className="font-black text-slate-900 text-xs">
                              {day.hoursLogged} hrs
                            </span>
                          ) : isPreRegistration ? (
                            <span className="text-slate-400 text-2xs italic">Prior to Account</span>
                          ) : (
                            <span className="text-slate-400 italic">No log</span>
                          )}
                        </td>

                        {/* Burnout / Overtime Status */}
                        <td className="py-2.5 px-3">
                          {day.isMissedLog ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 text-2xs font-black">
                              <AlertTriangle className="h-3 w-3 text-rose-600" />
                              Missed Log (6h Deficit)
                            </span>
                          ) : day.isLeave ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 text-2xs font-bold">
                              <Palmtree className="h-3 w-3 text-purple-600" />
                              {day.leaveType === 'CASUAL_LEAVE' 
                                ? 'Casual Leave (CL)' 
                                : day.leaveType === 'SICK_LEAVE' 
                                ? 'Sick Leave (SL)' 
                                : 'Unpaid Leave (LOP)'}
                            </span>
                          ) : day.hasLog ? (
                            day.isOvertime ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-2xs font-extrabold">
                                <Flame className="h-3 w-3 text-amber-600" />
                                +{day.extraHours}h Overtime {day.update?.extraWorkReason ? `(${day.update.extraWorkReason})` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-2xs font-bold">
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                Balanced (≤6.0h)
                              </span>
                            )
                          ) : isPreRegistration ? (
                            <span className="text-2xs text-slate-400">Not Applicable</span>
                          ) : isFuture ? (
                            <span className="text-2xs text-slate-400">Upcoming</span>
                          ) : (
                            <span className="text-2xs text-slate-400">Pending</span>
                          )}
                        </td>

                        {/* Tasks & Duties */}
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                          {day.isMissedLog ? (
                            <span className="text-rose-700 font-medium italic">
                              Forgot to submit daily log &bull; Click action to submit now
                            </span>
                          ) : day.isLeave ? (
                            <span className="text-purple-900 font-medium">
                              {day.leaveReason ? `On Leave: ${day.leaveReason}` : 'Taken Leave'}
                            </span>
                          ) : day.update ? (
                            day.update.tasksWorkedOn || (
                              day.update.classesCount 
                                ? `${day.update.classesCount} classes, ${day.update.practiceSessionsCount || 0} practice sessions` 
                                : 'Daily work update logged'
                            )
                          ) : (
                            <span className="text-slate-400 italic">&mdash;</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-3 text-right">
                          {isPreRegistration ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-2xs font-medium cursor-not-allowed" title={`Account created on ${userRegDateStr}. Attendance can only be logged from registration date onwards.`}>
                              Pre-Account
                            </span>
                          ) : isFuture ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-2xs font-medium">
                              Upcoming
                            </span>
                          ) : day.isMissedLog ? (
                            <button
                              type="button"
                              onClick={() => openModalForDate(day.dateStr)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-2xs font-black shadow-xs transition-colors cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Submit Missed Log</span>
                            </button>
                          ) : day.update ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(day.update!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 text-2xs font-bold transition-colors cursor-pointer"
                            >
                              <Pencil className="h-3 w-3 text-amber-700" />
                              <span>Edit Log</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openModalForDate(day.dateStr)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 text-2xs font-bold transition-colors cursor-pointer"
                            >
                              <Plus className="h-3 w-3 text-sky-600" />
                              <span>Log Day</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sunday Holiday Note */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-2.5 flex items-center justify-between text-xs text-sky-900">
              <span className="flex items-center gap-2 font-semibold">
                <Sun className="h-4 w-4 text-amber-500" />
                <span><strong>Sunday:</strong> Official Weekly Off &amp; Holiday (0 working hours expected).</span>
              </span>
              <span className="text-2xs text-sky-700 font-bold bg-white px-2 py-0.5 rounded-md border border-sky-200">
                Work Days: Monday to Saturday
              </span>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-sky-100 bg-white p-3.5 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-sky-600/70" />
          <input
            type="text"
            placeholder="Search updates by task, classes, overtime reasons..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-sky-200 bg-sky-50/30 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="text-xs text-rose-600 hover:underline px-1 font-semibold cursor-pointer"
            >
              Clear Date
            </button>
          )}
        </div>
      </div>

      {/* Updates List */}
      <div className="space-y-4">
        {filteredUpdates.length === 0 ? (
          <div className="rounded-2xl border border-sky-100 bg-white p-12 text-center shadow-xs">
            <FileText className="mx-auto h-10 w-10 text-sky-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              No daily updates found
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Submit your daily work update to record classes, practice sessions, tasks, and burnout hours.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Submit Daily Work Update</span>
            </button>
          </div>
        ) : (
          filteredUpdates.map((update) => {
            const cCount = update.classesCount !== undefined 
              ? update.classesCount 
              : (parseInt(update.classesHandled) || 0);
            const pCount = update.practiceSessionsCount !== undefined 
              ? update.practiceSessionsCount 
              : 0;
            const cDuration = update.classDurationMinutes || 50;
            const pDuration = update.practiceDurationMinutes || 50;
            const totalCMinutes = update.totalClassesDurationMinutes || (cCount * cDuration);
            const totalPMinutes = update.totalPracticeDurationMinutes || (pCount * pDuration);
            const totalTeachingMins = update.sessionMinutesCalculated || (totalCMinutes + totalPMinutes);

            const loggedHours = update.hoursLogged || 6;
            const extraHrs = update.extraHoursWorked !== undefined 
              ? update.extraHoursWorked 
              : Math.max(0, loggedHours - STANDARD_WORK_HOURS_PER_DAY);

            const isBurnoutWarning = loggedHours > STANDARD_WORK_HOURS_PER_DAY;

            const isLeave = !!update.isLeave;
            return (
              <div
                key={update.id}
                className={`rounded-2xl border p-5 shadow-xs transition-all hover:shadow-md ${
                  isLeave
                    ? 'border-purple-200 bg-purple-50/20 hover:border-purple-300'
                    : isBurnoutWarning
                    ? 'border-amber-200/90 bg-white'
                    : 'border-sky-100 bg-white hover:border-sky-200'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-sky-50 pb-3 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="h-4 w-4 text-sky-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Daily Log for {update.date}
                    </h3>
                    {update.date === todayStr && (
                      <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200">
                        Today
                      </span>
                    )}
                    {isLeave && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-black text-purple-800 border border-purple-300">
                        <Palmtree className="h-3 w-3" />
                        {update.leaveType === 'CASUAL_LEAVE' 
                          ? 'Casual Leave (CL)' 
                          : update.leaveType === 'SICK_LEAVE' 
                          ? 'Sick Leave (SL)' 
                          : 'Unpaid Leave (LOP)'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Working Hours / Leave Status Badge */}
                    {isLeave ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-purple-900 font-bold bg-purple-100/80 px-3 py-1 rounded-xl border border-purple-200">
                        <Palmtree className="h-3.5 w-3.5 text-purple-600" />
                        {update.leaveType === 'UNPAID_LEAVE' ? '0.0h (Loss of Pay)' : '6.0h Standard Shift Accounted'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 font-bold bg-sky-50 px-3 py-1 rounded-xl border border-sky-200">
                        <Clock className="h-3.5 w-3.5 text-sky-600" />
                        {loggedHours} hours worked
                      </span>
                    )}

                    {/* Extra Hours & Burnout Callout */}
                    {!isLeave && (
                      extraHrs > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-xl shadow-2xs">
                          <Flame className="h-3.5 w-3.5 text-amber-600" />
                          +{extraHrs}h extra worked (over 6h limit)
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                          Standard 6h load met
                        </span>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(update)}
                      className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5 text-amber-700" />
                      <span>Edit Log</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDetailUpdate(update)}
                      className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-50 transition-colors cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>

                {/* 3 Column Content */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Sessions Handled & Time Breakdown */}
                  <div className="rounded-xl bg-sky-50/50 p-3.5 border border-sky-100/80">
                    <p className="font-bold text-sky-950 mb-2 flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-sky-600" />
                      <span>Classes & Practice Sessions</span>
                    </p>
                    {isLeave ? (
                      <p className="text-purple-800 text-xs italic py-2">
                        Instructor was on leave. No classes or lab practice scheduled.
                      </p>
                    ) : (
                      <div className="space-y-1.5 text-slate-600">
                        <div className="flex justify-between items-center">
                          <span>Classes:</span>
                          <span className="font-bold text-slate-900">
                            {cCount} {cCount === 1 ? 'Class' : 'Classes'} ({cDuration}m ea = {totalCMinutes}m)
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Practice:</span>
                          <span className="font-bold text-slate-900">
                            {pCount} {pCount === 1 ? 'Session' : 'Sessions'} ({pDuration}m ea = {totalPMinutes}m)
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sky-800 font-semibold pt-1 border-t border-sky-100">
                          <span>Teaching Time:</span>
                          <span>{totalTeachingMins} mins ({(totalTeachingMins / 60).toFixed(2)}h)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Task Worked On */}
                  <div className="rounded-xl bg-sky-50/50 p-3.5 border border-sky-100/80">
                    <p className="font-bold text-sky-950 mb-1.5 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-sky-600" />
                      <span>{isLeave ? 'Reason for Leave' : 'Task Worked On'}</span>
                    </p>
                    <p className="text-slate-700 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {isLeave 
                        ? (update.leaveReason || 'Taken Leave')
                        : (update.tasksWorkedOn || 'No task description provided.')}
                    </p>
                  </div>

                  {/* Additional Responsibilities & Extra Hours / Burnout Reason */}
                  <div className="rounded-xl bg-sky-50/50 p-3.5 border border-sky-100/80 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-sky-950 mb-1.5 flex items-center gap-1.5">
                        <FileCheck2 className="h-3.5 w-3.5 text-sky-600" />
                        <span>Responsibilities & Overtime Cause</span>
                      </p>
                      <div className="space-y-1 text-slate-700">
                        {update.extraWorkReason ? (
                          <div className="inline-block rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold border border-amber-300 mb-1">
                            Cause: {update.extraWorkReason}
                          </div>
                        ) : null}

                        {update.invigilationHours ? (
                          <p className="flex justify-between text-rose-700 font-semibold">
                            <span>Exam Invigilation:</span>
                            <strong className="text-slate-900">{update.invigilationHours} hrs {update.invigilationDetails ? `(${update.invigilationDetails})` : ''}</strong>
                          </p>
                        ) : null}

                        {update.paperEvaluationHours ? (
                          <p className="flex justify-between">
                            <span>Paper Evaluation:</span>
                            <strong className="text-slate-900">{update.paperEvaluationHours} hrs</strong>
                          </p>
                        ) : null}

                        {update.inServiceHours ? (
                          <p className="flex justify-between">
                            <span>In-service Training:</span>
                            <strong className="text-slate-900">{update.inServiceHours} hrs</strong>
                          </p>
                        ) : null}

                        {!update.invigilationHours && !update.paperEvaluationHours && !update.inServiceHours && (
                          update.additionalResponsibilities && update.additionalResponsibilities !== 'None' ? (
                            <p className="text-slate-600">{update.additionalResponsibilities}</p>
                          ) : (
                            <p className="text-slate-400 italic">No additional duties logged</p>
                          )
                        )}
                      </div>
                    </div>

                    {/* Total Day Display & Overtime */}
                    <div className="mt-2 pt-2 border-t border-sky-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Daily Output:</span>
                      <strong className={isLeave ? 'text-purple-900' : 'text-sky-900'}>
                        {isLeave 
                          ? `${loggedHours}h (Leave Credited)` 
                          : `${loggedHours}h ${extraHrs > 0 ? `(+${extraHrs}h overtime)` : ''}`}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New / Edit Daily Work Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUpdateId(null);
          setSelectedDetailUpdate(null);
          setFormData(getInitialFormData(todayStr));
        }}
        title={editingUpdateId ? `Edit Daily Work Log (${formData.date})` : 'Daily Work Log'}
        subtitle="Record your daily classes, mentoring sessions, and work hours."
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Top Row: Date & Total Hours Logged */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Date *
                </label>
                {/* Quick Date Presets */}
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, date: todayStr })}
                    className={`px-1.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                      formData.date === todayStr ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Today
                  </button>
                  {(() => {
                    const yDate = new Date();
                    yDate.setDate(yDate.getDate() - 1);
                    const yStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;
                    if (userRegDateStr && yStr < userRegDateStr) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, date: yStr })}
                        className={`px-1.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                          formData.date === yStr ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Yesterday
                      </button>
                    );
                  })()}
                  {(() => {
                    const dDate = new Date();
                    dDate.setDate(dDate.getDate() - 2);
                    const dStr = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${String(dDate.getDate()).padStart(2, '0')}`;
                    if (userRegDateStr && dStr < userRegDateStr) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, date: dStr })}
                        className={`px-1.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                          formData.date === dStr ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        -2 Days
                      </button>
                    );
                  })()}
                </div>
              </div>
              <input
                type="date"
                required
                id="daily-work-date-input"
                value={formData.date}
                min={minAllowedDate}
                max={todayStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (userRegDateStr && val < userRegDateStr) {
                    addToast({
                      title: 'Pre-Registration Date',
                      message: `Attendance can only be logged from your account registration date (${userRegDateStr}) onwards.`,
                      type: 'warning',
                      duration: 4000
                    });
                    return;
                  }
                  if (val > todayStr) {
                    addToast({
                      title: 'Future Date',
                      message: 'Cannot log attendance for future dates.',
                      type: 'warning',
                      duration: 4000
                    });
                    return;
                  }
                  setFormData({ ...formData, date: val });
                }}
                className={`w-full rounded-xl border p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden ${
                  duplicateConflict 
                    ? 'border-rose-300 bg-rose-50/50 focus:border-rose-500' 
                    : 'border-slate-200 bg-slate-50/40 focus:border-sky-500'
                }`}
              />
              {userRegDateStr && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Account created on <strong className="text-slate-700">{userRegDateStr}</strong>. Attendance is allowed from this date forward.
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  {formData.isLeave ? 'Shift Status' : 'Total Logged Hours * (Max 12h)'}
                </label>
                {!formData.isLeave && formData.hoursLogged !== totalWorkHoursToday && (
                  <button
                    type="button"
                    onClick={handleSyncCalculatedHours}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 cursor-pointer"
                  >
                    Sync Calculated ({totalWorkHoursToday}h)
                  </button>
                )}
              </div>
              {formData.isLeave ? (
                <div className="w-full rounded-xl border border-purple-200 bg-purple-50/70 p-2.5 text-xs text-purple-950 font-bold flex items-center justify-between">
                  <span>{formData.leaveType === 'UNPAID_LEAVE' ? '0.0 hrs (Loss of Pay)' : '6.0 hrs Standard Shift Accounted'}</span>
                  <span className="text-2xs bg-purple-200 text-purple-900 px-2 py-0.5 rounded-md font-extrabold">
                    {formData.leaveType === 'CASUAL_LEAVE' ? 'Casual Leave' : formData.leaveType === 'SICK_LEAVE' ? 'Sick Leave' : 'Unpaid Leave'}
                  </span>
                </div>
              ) : (
                <select
                  id="daily-work-hours-dropdown"
                  value={formData.hoursLogged}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, hoursLogged: Math.min(MAX_WORK_HOURS_PER_DAY, Math.max(0, val)) });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden font-bold"
                >
                  {HOURS_DROPDOWN_OPTIONS.filter(o => o.value <= 12).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value} {opt.value === 1 ? 'Hour' : 'Hours'} {opt.value === 6 ? '(Standard 6h load)' : opt.value === 12 ? '(Daily Max Limit: 12h)' : opt.value > 6 ? `(+${(opt.value - 6).toFixed(1)}h overtime)` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Subcategory: Leave / Attendance Status */}
          <div className={`rounded-2xl border p-3.5 transition-all ${
            formData.isLeave 
              ? 'border-purple-300 bg-purple-50/50 ring-1 ring-purple-200' 
              : 'border-slate-200 bg-slate-50/40 hover:border-slate-300'
          }`}>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.isLeave}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    updateLeaveMode(isChecked, isChecked ? (formData.leaveType !== 'NONE' ? formData.leaveType : 'CASUAL_LEAVE') : 'NONE');
                  }}
                  className="h-4 w-4 rounded-md border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Palmtree className="h-4 w-4 text-purple-600" />
                  <span>Took Leave Today / Mark as Leave</span>
                </span>
              </label>

              {formData.isLeave && (
                <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                  {formData.leaveType === 'UNPAID_LEAVE' ? '0.0h Loss of Pay' : '6.0h Shift Accounted'}
                </span>
              )}
            </div>

            {formData.isLeave && (
              <div className="mt-3 pt-3 border-t border-purple-100 space-y-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-purple-900">Leave Type:</span>
                  <button
                    type="button"
                    onClick={() => toggleLeaveType('CASUAL_LEAVE')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      formData.leaveType === 'CASUAL_LEAVE'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
                    }`}
                    title={formData.leaveType === 'CASUAL_LEAVE' ? "Click to unselect Casual Leave and return to normal workday" : "Click to select Casual Leave"}
                  >
                    <span>Casual Leave (CL) &bull; 6h</span>
                    {formData.leaveType === 'CASUAL_LEAVE' && (
                      <span className="text-[10px] font-black bg-purple-700 text-white px-1 rounded-sm" title="Selected - click again to unselect">✕ Unselect</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLeaveType('SICK_LEAVE')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      formData.leaveType === 'SICK_LEAVE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                    }`}
                    title={formData.leaveType === 'SICK_LEAVE' ? "Click to unselect Sick Leave and return to normal workday" : "Click to select Sick Leave"}
                  >
                    <span>Sick Leave (SL) &bull; 6h</span>
                    {formData.leaveType === 'SICK_LEAVE' && (
                      <span className="text-[10px] font-black bg-emerald-700 text-white px-1 rounded-sm" title="Selected - click again to unselect">✕ Unselect</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLeaveType('UNPAID_LEAVE')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                      formData.leaveType === 'UNPAID_LEAVE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                    title={formData.leaveType === 'UNPAID_LEAVE' ? "Click to unselect Unpaid Leave and return to normal workday" : "Click to select Unpaid Leave"}
                  >
                    <span>Unpaid Leave (LOP) &bull; 0h</span>
                    {formData.leaveType === 'UNPAID_LEAVE' && (
                      <span className="text-[10px] font-black bg-amber-700 text-white px-1 rounded-sm" title="Selected - click again to unselect">✕ Unselect</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLeaveMode(false, 'NONE')}
                    className="ml-auto text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
                  >
                    Unselect / Normal Workday
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-purple-900/80">
                  <span>Single-tap to select &bull; Tap again on active leave to unselect &bull; Or click sessions below</span>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Reason for leave (optional, e.g. Doctor consultation, family event)..."
                    value={formData.leaveReason}
                    onChange={(e) => setFormData({ ...formData, leaveReason: e.target.value })}
                    className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>
              {/* 12-Hour Daily Max Limit Notification Callout */}
              {rawWorkHoursToday >= MAX_WORK_HOURS_PER_DAY && (
                <div className="rounded-2xl border border-amber-300 bg-linear-to-r from-amber-50 to-orange-50/70 p-3.5 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
                  <div className="rounded-xl bg-amber-100 p-2 text-amber-700 shrink-0 mt-0.5">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <span>Daily Maximum Working Limit (12 Hours Strict Policy)</span>
                    </p>
                    <p className="text-amber-800 leading-relaxed text-[11px]">
                      Your selected activities total <strong>{rawWorkHoursToday.toFixed(1)} hours</strong> ({totalTeachingHoursDecimal.toFixed(1)}h classes/practice + {totalAdditionalHours.toFixed(1)}h evaluations/in-service/invigilation). By system policy, total daily logged hours are strictly capped at <strong>12.0 hours maximum</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Duplicate Submission Warning Banner */}
              {duplicateConflict && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 flex items-start gap-2.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-rose-900">
                      A work log already exists for {formData.date}
                    </p>
                    <p className="text-rose-700">
                      You can edit the existing log instead of submitting a duplicate entry.
                    </p>
                    <button
                      type="button"
                      onClick={() => openEditModal(duplicateConflict)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 hover:underline cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Load and edit existing log</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Teaching & Practice Sessions */}
              <div className={`rounded-2xl border transition-all p-3.5 space-y-3 ${
                formData.isLeave
                  ? 'border-purple-200 bg-purple-50/20'
                  : 'border-slate-200 bg-slate-50/30'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    <span>Teaching & Practice Sessions</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {formData.isLeave ? (
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 animate-pulse">
                        Click any session below to convert this leave to a normal workday
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-600">
                        {(totalTeachingMinutes / 60).toFixed(1)} hrs total
                      </span>
                    )}
                  </div>
                </div>

                {/* Classes Handled */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800">
                      Classes Handled (1 hr standard per class)
                    </label>
                    <span className="text-xs font-bold text-sky-700">
                      {formData.classesCount} {formData.classesCount === 1 ? 'class' : 'classes'} &bull; {(totalClassesMinutes / 60).toFixed(1)}h
                    </span>
                  </div>

                  {/* Quick Select Pills (0, 1, 2, 3, 4, 6 sessions) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[0, 1, 2, 3, 4, 6].map((num) => {
                      const isSelected = formData.classesCount === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => updateClassesCount(num)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                          }`}
                        >
                          {num} {num === 1 ? 'Class' : 'Classes'}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Select Classes Count (0 to 12)
                      </label>
                      <select
                        id="classes-handled-dropdown"
                        value={formData.classesCount}
                        onChange={(e) => updateClassesCount(parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden font-medium"
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Class' : 'Classes'} ({n} hrs standard)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Duration per class
                      </label>
                      <select
                        id="class-duration-dropdown"
                        value={formData.classDurationMinutes}
                        onChange={(e) => updateClassDuration(parseInt(e.target.value) || 60)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                      >
                        {DURATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Practice Sessions */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-800">
                      Practice Sessions (1 hr standard per session)
                    </label>
                    <span className="text-xs font-bold text-sky-700">
                      {formData.practiceSessionsCount} {formData.practiceSessionsCount === 1 ? 'session' : 'sessions'} &bull; {(totalPracticeMinutes / 60).toFixed(1)}h
                    </span>
                  </div>

                  {/* Quick Select Pills (0, 1, 2, 3, 4, 6 sessions) */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[0, 1, 2, 3, 4, 6].map((num) => {
                      const isSelected = formData.practiceSessionsCount === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => updatePracticeCount(num)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                          }`}
                        >
                          {num} {num === 1 ? 'Session' : 'Sessions'}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Select Practice Sessions Count (0 to 12)
                      </label>
                      <select
                        id="practice-sessions-dropdown"
                        value={formData.practiceSessionsCount}
                        onChange={(e) => updatePracticeCount(parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden font-medium"
                      >
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Session' : 'Sessions'} ({n} hrs standard)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Duration per session
                      </label>
                      <select
                        id="practice-duration-dropdown"
                        value={formData.practiceDurationMinutes}
                        onChange={(e) => updatePracticeDuration(parseInt(e.target.value) || 60)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                      >
                        {DURATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Worked On (Description) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tasks Completed Today *
                </label>
                <textarea
                  required={!formData.isLeave}
                  id="tasks-worked-on-textarea"
                  rows={2}
                  placeholder="Summary of topics taught, student lab coordination, and code reviews completed..."
                  value={formData.tasksWorkedOn}
                  onChange={(e) => setFormData({ ...formData, tasksWorkedOn: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Additional Responsibilities (Invigilation, Paper Evaluation, In-service) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4 text-sky-600" />
                    <span>Additional Responsibilities</span>
                  </span>
                  {formData.additionalCategory !== 'None' && (
                    <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                      {formData.additionalCategory}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Duty Category
                  </label>
                  <select
                    id="additional-responsibilities-dropdown"
                    value={formData.additionalCategory}
                    onChange={(e) => updateAdditionalCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden font-medium"
                  >
                    <option value="None">None</option>
                    <option value="Invigilation">Invigilation (Exam hall supervision & test proctoring)</option>
                    <option value="Paper Evaluation">Paper Evaluation (Grading exams & coding assignments)</option>
                    <option value="In-service">In-service (Training, workshops & upskilling)</option>
                    <option value="Both">Both (Paper Evaluation & In-service)</option>
                    <option value="All Duties">All Duties (Invigilation, Paper Evaluation & In-service)</option>
                  </select>
                </div>

                {/* Invigilation Duty Block */}
                {(formData.additionalCategory === 'Invigilation' || formData.additionalCategory === 'All Duties') && (
                  <div className="bg-white rounded-xl border border-rose-200/80 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-rose-600" />
                        <span>Exam Invigilation Hours *</span>
                      </label>
                      <span className="text-xs font-extrabold text-rose-700">
                        {formData.invigilationHours} {formData.invigilationHours === 1 ? 'hour' : 'hours'}
                      </span>
                    </div>

                    {/* Quick Select Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[1, 2, 3, 4, 6, 8].map((hrs) => {
                        const isSelected = Number(formData.invigilationHours) === hrs;
                        return (
                          <button
                            key={hrs}
                            type="button"
                            onClick={() => updateInvigilationHours(hrs)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                            }`}
                          >
                            {hrs} {hrs === 1 ? 'Hour' : 'Hours'}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">
                          Select Hours Worked
                        </label>
                        <select
                          id="invigilation-hours-dropdown"
                          value={formData.invigilationHours}
                          onChange={(e) => updateInvigilationHours(parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-hidden font-medium"
                        >
                          {HOURS_DROPDOWN_OPTIONS.filter(o => o.value <= 12).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">
                          Exam / Hall Details (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Mid-term Exam Hall A, Practical Lab..."
                          value={formData.invigilationDetails}
                          onChange={(e) => setFormData({ ...formData, invigilationDetails: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Paper Evaluation Hours Dropdown */}
                {(formData.additionalCategory === 'Paper Evaluation' || formData.additionalCategory === 'Both' || formData.additionalCategory === 'All Duties') && (
                  <div className="bg-white rounded-xl border border-indigo-200/80 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        Paper Evaluation Hours *
                      </label>
                      <span className="text-xs font-bold text-indigo-700">
                        {formData.paperEvaluationHours} {formData.paperEvaluationHours === 1 ? 'hour' : 'hours'}
                      </span>
                    </div>

                    {/* Quick Select Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[1, 2, 3, 4, 6, 8, 12].map((hrs) => {
                        const isSelected = Number(formData.paperEvaluationHours) === hrs;
                        return (
                          <button
                            key={hrs}
                            type="button"
                            onClick={() => updatePaperEvalHours(hrs)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                            }`}
                          >
                            {hrs} {hrs === 1 ? 'Hour' : 'Hours'}
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Select Hours Worked
                      </label>
                      <select
                        id="paper-evaluation-hours-dropdown"
                        value={formData.paperEvaluationHours}
                        onChange={(e) => updatePaperEvalHours(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden font-medium"
                      >
                        {HOURS_DROPDOWN_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* In-service Hours Dropdown */}
                {(formData.additionalCategory === 'In-service' || formData.additionalCategory === 'Both' || formData.additionalCategory === 'All Duties') && (
                  <div className="bg-white rounded-xl border border-teal-200/80 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        In-service Hours *
                      </label>
                      <span className="text-xs font-bold text-teal-700">
                        {formData.inServiceHours} {formData.inServiceHours === 1 ? 'hour' : 'hours'}
                      </span>
                    </div>

                    {/* Quick Select Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[1, 2, 3, 4, 6, 8, 12].map((hrs) => {
                        const isSelected = Number(formData.inServiceHours) === hrs;
                        return (
                          <button
                            key={hrs}
                            type="button"
                            onClick={() => updateInServiceHours(hrs)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-teal-600 text-white shadow-xs'
                                : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                            }`}
                          >
                            {hrs} {hrs === 1 ? 'Hour' : 'Hours'}
                          </button>
                        );
                      })}
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Select Hours Worked
                      </label>
                      <select
                        id="in-service-hours-dropdown"
                        value={formData.inServiceHours}
                        onChange={(e) => updateInServiceHours(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-hidden font-medium"
                      >
                        {HOURS_DROPDOWN_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

          {/* Section: Hours & Overtime Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Calculated Total:</span>
                <span className="text-base font-extrabold text-slate-900">{totalWorkHoursToday} hrs</span>
                {extraHoursCalculated > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <Flame className="h-3 w-3 text-amber-600" />
                    +{extraHoursCalculated}h Overtime
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                    Within standard 6h baseline
                  </span>
                )}
              </div>

              {formData.hoursLogged !== totalWorkHoursToday && (
                <button
                  type="button"
                  onClick={handleSyncCalculatedHours}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Apply {totalWorkHoursToday}h as Logged</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Daily Notes / Remarks (Optional) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Daily Work Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="Any general comments or notes for today..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              {editingUpdateId && (
                <span className="text-xs text-amber-700 font-medium">
                  Editing log for {formData.date}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUpdateId(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !!duplicateConflict}
                id="submit-daily-work-update-btn"
                className={`rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer flex items-center gap-2 ${
                  duplicateConflict
                    ? 'bg-rose-400 cursor-not-allowed opacity-60'
                    : editingUpdateId
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                    : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {saving
                    ? 'Saving Workload...'
                    : duplicateConflict
                    ? 'Duplicate Date'
                    : 'Save Workload'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      {selectedDetailUpdate && (
        <Modal
          isOpen={!!selectedDetailUpdate}
          onClose={() => setSelectedDetailUpdate(null)}
          title={`Daily Work Log: ${selectedDetailUpdate.date}`}
          subtitle={`Logged by ${selectedDetailUpdate.employeeName} (${selectedDetailUpdate.employeeId})`}
        >
          <div className="space-y-4 text-xs">
            {/* Hours & Extra Hours Banner */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border gap-2 ${
              (selectedDetailUpdate.extraHoursWorked && selectedDetailUpdate.extraHoursWorked > 0) || ((selectedDetailUpdate.hoursLogged || 0) > STANDARD_WORK_HOURS_PER_DAY)
                ? 'bg-amber-50 border-amber-300'
                : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-600" />
                <span className="font-semibold text-slate-700">Total Hours Worked:</span>
                <span className="font-bold text-sky-950 text-sm">{selectedDetailUpdate.hoursLogged || 6} Hours</span>
              </div>
              
              {(selectedDetailUpdate.extraHoursWorked && selectedDetailUpdate.extraHoursWorked > 0) || 
               ((selectedDetailUpdate.hoursLogged || 0) > STANDARD_WORK_HOURS_PER_DAY) ? (
                <span className="inline-flex items-center gap-1 font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300">
                  <Flame className="h-3.5 w-3.5 text-amber-600" />
                  +{(selectedDetailUpdate.extraHoursWorked || ((selectedDetailUpdate.hoursLogged || 0) - STANDARD_WORK_HOURS_PER_DAY)).toFixed(2)}h Overtime (Beyond 6h Limit)
                </span>
              ) : (
                <span className="text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Standard 6h Workday (Healthy Load)
                </span>
              )}
            </div>

            {/* Overtime Work Reason (if overtime was worked) */}
            {selectedDetailUpdate.extraWorkReason && (
              <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
                <span className="font-bold text-amber-950 block mb-1">
                  Reason / Task for Extra Hours Worked:
                </span>
                <p className="text-amber-900 font-semibold">
                  {selectedDetailUpdate.extraWorkReason}
                </p>
                {selectedDetailUpdate.extraWorkDetails && (
                  <p className="text-slate-600 mt-1 italic">
                    "{selectedDetailUpdate.extraWorkDetails}"
                  </p>
                )}
              </div>
            )}

            {/* Sessions Handled Breakdown */}
            <div className="rounded-xl bg-sky-50/60 p-4 border border-sky-100 space-y-2">
              <span className="font-bold text-sky-950 flex items-center gap-1.5 border-b border-sky-200/60 pb-2">
                <GraduationCap className="h-4 w-4 text-sky-600" />
                <span>Classes & Practice Sessions</span>
              </span>
              
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-sky-100">
                  <span className="text-slate-500 text-[11px]">Classes Handled:</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedDetailUpdate.classesCount !== undefined 
                      ? `${selectedDetailUpdate.classesCount} Classes`
                      : selectedDetailUpdate.classesHandled}
                  </p>
                  {selectedDetailUpdate.classDurationMinutes && (
                    <p className="text-[10px] text-sky-600 mt-0.5">
                      {selectedDetailUpdate.classDurationMinutes} mins each (Total: {(selectedDetailUpdate.totalClassesDurationMinutes || ((selectedDetailUpdate.classesCount || 0) * selectedDetailUpdate.classDurationMinutes))} mins)
                    </p>
                  )}
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-sky-100">
                  <span className="text-slate-500 text-[11px]">Practice Sessions:</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedDetailUpdate.practiceSessionsCount !== undefined 
                      ? `${selectedDetailUpdate.practiceSessionsCount} Sessions`
                      : (selectedDetailUpdate.projectUpdates || '0 Sessions')}
                  </p>
                  {selectedDetailUpdate.practiceDurationMinutes && (
                    <p className="text-[10px] text-sky-600 mt-0.5">
                      {selectedDetailUpdate.practiceDurationMinutes} mins each (Total: {(selectedDetailUpdate.totalPracticeDurationMinutes || ((selectedDetailUpdate.practiceSessionsCount || 0) * selectedDetailUpdate.practiceDurationMinutes))} mins)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tasks Worked On */}
            <div className="rounded-xl bg-sky-50/60 p-4 border border-sky-100">
              <span className="font-bold text-sky-950 block mb-1.5 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-sky-600" />
                <span>Task Worked On (Description):</span>
              </span>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-sky-100">
                {selectedDetailUpdate.tasksWorkedOn}
              </p>
            </div>

            {/* Additional Responsibilities */}
            <div className="rounded-xl bg-amber-50/60 p-4 border border-amber-200 space-y-2">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-amber-600" />
                <span>Additional Responsibilities:</span>
              </span>
              
              <div className="bg-white p-3 rounded-lg border border-amber-100 space-y-1.5">
                {selectedDetailUpdate.additionalCategory && selectedDetailUpdate.additionalCategory !== 'None' ? (
                  <>
                    <p className="font-bold text-amber-900 text-xs">
                      Category: {selectedDetailUpdate.additionalCategory}
                    </p>
                    {selectedDetailUpdate.paperEvaluationHours ? (
                      <p className="text-slate-700">
                        • Paper Evaluation Duration: <strong>{selectedDetailUpdate.paperEvaluationHours} hours</strong>
                      </p>
                    ) : null}
                    {selectedDetailUpdate.inServiceHours ? (
                      <p className="text-slate-700">
                        • In-service Duration: <strong>{selectedDetailUpdate.inServiceHours} hours</strong>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-slate-700">
                    {selectedDetailUpdate.additionalResponsibilities || 'None logged'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-sky-100">
              <button
                type="button"
                onClick={() => {
                  if (selectedDetailUpdate) {
                    openEditModal(selectedDetailUpdate);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition-colors cursor-pointer shadow-xs"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit This Work Log</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDetailUpdate(null)}
                className="rounded-xl bg-sky-100 px-5 py-2 font-semibold text-sky-800 hover:bg-sky-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
