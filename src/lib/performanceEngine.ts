import { 
  ClassItem, 
  TaskItem, 
  ProjectItem, 
  FeedbackRecord, 
  AttendanceRecord, 
  DailyUpdate,
  PerformanceBreakdown, 
  PerformanceCategory, 
  PerformanceWeights,
  MetricCalculationConfig,
  HolisticContributionRecord,
  HolisticGuidanceMetrics,
  HolisticGuidanceCategory
} from '../types';

export const DEFAULT_WEIGHTS: PerformanceWeights = {
  classDelivery: 100,
  taskCompletion: 0,
  projectProgress: 0,
  additionalContribution: 0,
};

export const DEFAULT_METRIC_CONFIG: MetricCalculationConfig = {
  weeklyStandardHours: 36.0,
  dailyStandardHours: 6.0,
  burnoutHourRate: 3.0,
  holisticHourRate: 3.5,
  taskBonusPerItem: 3.0,
  projectBaseBonus: 5.0,
  projectProgressScale: 10.0,
  maxTaskBonus: 15.0,
  maxProjectBonus: 15.0,
  maxHolisticBonus: 20.0,
  maxOverallScore: 150.0,
  goldThreshold: 120,
  silverThreshold: 110,
  valueAddThreshold: 101,
  standardSlaThreshold: 90,
};

export type BurnoutCategory = 'safe' | 'mild' | 'high' | 'critical';

export interface BurnoutStatusInfo {
  hoursLogged: number;
  standardHours: number; // 6.0 standard baseline
  burnoutHours: number; // Math.max(0, hoursLogged - 6.0)
  category: BurnoutCategory;
  categoryLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  isBurnout: boolean;
}

export function getBurnoutStatus(hoursLogged: number): BurnoutStatusInfo {
  const standardHours = 6.0;
  const burnoutHours = Math.max(0, Number((hoursLogged - standardHours).toFixed(1)));
  const isBurnout = burnoutHours > 0;

  if (hoursLogged <= 6.0) {
    return {
      hoursLogged,
      standardHours,
      burnoutHours: 0,
      category: 'safe',
      categoryLabel: 'Safe / Optimal (<=6h)',
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      badgeBorder: 'border-emerald-200 dark:border-emerald-800',
      isBurnout: false,
    };
  }
  if (hoursLogged <= 7.0) {
    return {
      hoursLogged,
      standardHours,
      burnoutHours,
      category: 'mild',
      categoryLabel: 'Mild Burnout (6.1-7.0h)',
      badgeBg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
      badgeText: 'text-amber-800 dark:text-amber-300',
      badgeBorder: 'border-amber-200 dark:border-amber-800',
      isBurnout: true,
    };
  }
  if (hoursLogged <= 8.5) {
    return {
      hoursLogged,
      standardHours,
      burnoutHours,
      category: 'high',
      categoryLabel: 'High Burnout (7.1-8.5h)',
      badgeBg: 'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
      badgeText: 'text-orange-800 dark:text-orange-300',
      badgeBorder: 'border-orange-200 dark:border-orange-800',
      isBurnout: true,
    };
  }
  return {
    hoursLogged,
    standardHours,
    burnoutHours,
    category: 'critical',
    categoryLabel: 'Critical Burnout (>8.5h)',
    badgeBg: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    badgeText: 'text-rose-800 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800',
    isBurnout: true,
  };
}

export function getPerformanceCategory(score: number): PerformanceCategory {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Needs Improvement';
  return 'Critical';
}

export function getCategoryBadgeColor(category: PerformanceCategory): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (category) {
    case 'Excellent':
      return {
        bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
      };
    case 'Good':
      return {
        bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500',
      };
    case 'Needs Improvement':
      return {
        bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
      };
    case 'Critical':
      return {
        bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800',
        dot: 'bg-rose-500',
      };
  }
}

export interface AdditionalDutyCalculation {
  totalPaperEvaluationHours: number;
  totalInServiceHours: number;
  totalAdditionalHours: number;
  dutySessionsCount: number;
  completionPercentage: number; // 0 - 100
  hasUndertakenDuties: boolean;
  breakdown: Array<{
    date: string;
    category: string;
    hours: number;
    targetHours: number;
    completionPercentage: number;
    reason?: string;
  }>;
}

export function calculateAdditionalDutiesWork(dailyUpdates: DailyUpdate[] = []): AdditionalDutyCalculation {
  if (dailyUpdates.length === 0) {
    return {
      totalPaperEvaluationHours: 0,
      totalInServiceHours: 0,
      totalAdditionalHours: 0,
      dutySessionsCount: 0,
      completionPercentage: 0,
      hasUndertakenDuties: false,
      breakdown: [],
    };
  }

  let totalPaperEvaluationHours = 0;
  let totalInServiceHours = 0;
  let totalInvigilationHours = 0;
  const breakdown: AdditionalDutyCalculation['breakdown'] = [];

  dailyUpdates.forEach(u => {
    const isPaperEval = (u.additionalCategory === 'Paper Evaluation' || u.additionalCategory === 'Both' || u.additionalCategory === 'All Duties') || (u.paperEvaluationHours || 0) > 0;
    const isInService = (u.additionalCategory === 'In-service' || u.additionalCategory === 'Both' || u.additionalCategory === 'All Duties') || (u.inServiceHours || 0) > 0;
    const isInvigilation = (u.additionalCategory === 'Invigilation' || u.additionalCategory === 'All Duties') || (u.invigilationHours || 0) > 0;

    const paperHours = isPaperEval ? (u.paperEvaluationHours || 0) : 0;
    const inServHours = isInService ? (u.inServiceHours || 0) : 0;
    const invigHours = isInvigilation ? (u.invigilationHours || 0) : 0;

    if (paperHours > 0) {
      totalPaperEvaluationHours += paperHours;
      // Standard Paper Evaluation target block is 2.0 hours
      const target = 2.0;
      const pct = Math.min(100, Math.round((paperHours / target) * 100));
      breakdown.push({
        date: u.date,
        category: 'Paper Evaluation',
        hours: paperHours,
        targetHours: target,
        completionPercentage: pct,
        reason: u.extraWorkDetails || u.remarks || 'Standard Paper Evaluation Block',
      });
    }

    if (inServHours > 0) {
      totalInServiceHours += inServHours;
      // Standard In-service training target block is 2.0 hours
      const target = 2.0;
      const pct = Math.min(100, Math.round((inServHours / target) * 100));
      breakdown.push({
        date: u.date,
        category: 'In-service Training',
        hours: inServHours,
        targetHours: target,
        completionPercentage: pct,
        reason: u.extraWorkDetails || u.remarks || 'In-service Up-skilling & Pedagogical Training',
      });
    }

    if (invigHours > 0) {
      totalInvigilationHours += invigHours;
      // Standard Invigilation duty target block is 2.0 hours
      const target = 2.0;
      const pct = Math.min(100, Math.round((invigHours / target) * 100));
      breakdown.push({
        date: u.date,
        category: 'Invigilation & Exam Duty',
        hours: invigHours,
        targetHours: target,
        completionPercentage: pct,
        reason: u.invigilationDetails || u.extraWorkDetails || u.remarks || 'Exam Invigilation & Proctoring Duty',
      });
    }
  });

  const totalAdditionalHours = Number((totalPaperEvaluationHours + totalInServiceHours + totalInvigilationHours).toFixed(2));
  const dutySessionsCount = breakdown.length;
  const hasUndertakenDuties = dutySessionsCount > 0 && totalAdditionalHours > 0;

  let completionPercentage = 0;
  if (hasUndertakenDuties) {
    const sumPct = breakdown.reduce((sum, item) => sum + item.completionPercentage, 0);
    completionPercentage = Math.min(100, Math.round(sumPct / dutySessionsCount));
  }

  return {
    totalPaperEvaluationHours: Number(totalPaperEvaluationHours.toFixed(2)),
    totalInServiceHours: Number(totalInServiceHours.toFixed(2)),
    totalAdditionalHours,
    dutySessionsCount,
    completionPercentage,
    hasUndertakenDuties,
    breakdown,
  };
}

export function calculateTrainerMetrics(
  classes: ClassItem[] = [],
  tasks: TaskItem[] = [],
  projects: ProjectItem[] = [],
  _feedbacks: FeedbackRecord[] = [],
  _attendanceList: AttendanceRecord[] = [],
  _additionalScore: number = 0,
  dailyUpdates: DailyUpdate[] = []
): PerformanceBreakdown {
  const hasDailyUpdates = dailyUpdates.length > 0;
  const hasClasses = classes.length > 0;
  const hasTasks = tasks.length > 0;
  const hasProjects = projects.length > 0;

  // If user has zero records across the board
  if (!hasDailyUpdates && !hasClasses && !hasTasks && !hasProjects) {
    return {
      classDeliveryScore: 0,
      taskCompletionScore: 0,
      projectProgressScore: 0,
      additionalContributionScore: 0,
      classesCompleted: 0,
      classesScheduled: 0,
      tasksCompleted: 0,
      totalTasks: 0,
      activeProjects: 0,
      avgProjectCompletion: 0,
    };
  }

  // 1. Class & Daily Delivery Score (0 - 100)
  const scheduledClasses = classes.filter(c => c.status !== 'Cancelled');
  const completedClasses = classes.filter(c => c.status === 'Completed');
  const logClassesDelivered = dailyUpdates.reduce((sum, u) => sum + (u.classesCount || 0), 0);
  const totalClassesCompleted = completedClasses.length + (scheduledClasses.length === 0 ? logClassesDelivered : 0);
  const totalClassesScheduled = Math.max(scheduledClasses.length, totalClassesCompleted);

  let classDeliveryScore = 0;
  if (totalClassesScheduled > 0) {
    classDeliveryScore = Math.min(100, Math.round((totalClassesCompleted / totalClassesScheduled) * 100));
  } else if (hasDailyUpdates) {
    const avgHours = dailyUpdates.reduce((s, u) => s + (u.hoursLogged || 6), 0) / dailyUpdates.length;
    classDeliveryScore = Math.min(100, Math.round((avgHours / 6) * 100));
  }

  // 2. Task Completion (0 - 100)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const totalTaskProgressSum = tasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0);

  let taskCompletionScore = 0;
  if (totalTasks > 0) {
    taskCompletionScore = Math.round(totalTaskProgressSum / totalTasks);
  } else if (hasDailyUpdates) {
    const updatesWithTasks = dailyUpdates.filter(u => (u.tasksWorkedOn || '').trim().length > 0).length;
    taskCompletionScore = updatesWithTasks > 0 
      ? Math.min(100, Math.round((updatesWithTasks / dailyUpdates.length) * 100))
      : 0;
  }

  // 3. Project Progress (0 - 100)
  // CRITICAL REQUIREMENT: Milestone progress MUST be zero if trainer is not doing any project
  const activeProjects = projects.length;
  let projectProgressScore = 0;
  let avgProjectCompletion = 0;
  if (activeProjects > 0) {
    avgProjectCompletion = Math.round(projects.reduce((sum, p) => sum + (p.overallCompletionPercentage || 0), 0) / activeProjects);
    projectProgressScore = avgProjectCompletion;
  } else {
    // Zero if not undertaking any project
    avgProjectCompletion = 0;
    projectProgressScore = 0;
  }

  // 4. Additional Contribution Score (0 - 100)
  // CRITICAL REQUIREMENT: Additional duties and evaluations MUST be zero if trainer is not undertaking them
  // If performed (e.g. 2 hours of paper evaluation), calculate actual completed percentage mathematically
  const additionalWork = calculateAdditionalDutiesWork(dailyUpdates);
  const additionalContributionScore = additionalWork.hasUndertakenDuties 
    ? additionalWork.completionPercentage 
    : 0;

  return {
    classDeliveryScore,
    taskCompletionScore,
    projectProgressScore,
    additionalContributionScore,
    classesCompleted: totalClassesCompleted,
    classesScheduled: totalClassesScheduled,
    tasksCompleted: completedTasks,
    totalTasks,
    activeProjects,
    avgProjectCompletion,
  };
}

export function computeOverallScore(
  breakdown: PerformanceBreakdown,
  weights: PerformanceWeights = DEFAULT_WEIGHTS
): number {
  const wClass = Number(weights.classDelivery) || 0;
  const wTask = Number(weights.taskCompletion) || 0;
  const wProj = Number(weights.projectProgress) || 0;
  const wAdd = Number(weights.additionalContribution) || 0;

  const totalWeight = wClass + wTask + wProj + wAdd;
  if (totalWeight === 0) return breakdown.classDeliveryScore || 0;

  // Base weighted score
  const weightedSum = 
    (breakdown.classDeliveryScore * wClass) +
    (breakdown.taskCompletionScore * wTask) +
    (breakdown.projectProgressScore * wProj) +
    (breakdown.additionalContributionScore * wAdd);

  let finalScore = Math.round(weightedSum / totalWeight);

  // When class delivery is set to 100% (the core 6h baseline model),
  // award recognition value-add bonus credits for extra initiative (tasks/projects/additional)
  if (wClass === 100 && wTask === 0 && wProj === 0 && wAdd === 0) {
    let bonusCredits = 0;
    if (breakdown.tasksCompleted > 0) {
      bonusCredits += Math.min(5, breakdown.tasksCompleted * 2);
    }
    if (breakdown.avgProjectCompletion > 0) {
      bonusCredits += Math.min(5, Math.round(breakdown.avgProjectCompletion * 0.05));
    }
    if (breakdown.additionalContributionScore > 0) {
      bonusCredits += Math.min(5, Math.round(breakdown.additionalContributionScore * 0.05));
    }
    finalScore = Math.min(100, finalScore + bonusCredits);
  }

  return finalScore;
}

/**
 * Calculates the comprehensive Overall Score including:
 * - Base Composite Score (Classes/Daily logs up to 100%)
 * - Extra Tasks completed/in-progress
 * - Active Projects undertook (if trainer is doing projects, percentage gets added; if 0, stays at base 100%)
 * - Holistic Work / Guidance & Peer Mentorship Hours (counseling, doubt solving, syllabus review)
 * - Extra Delivery & Contributions
 */
export function calculateValueAddOverallScore(
  metrics: PerformanceBreakdown,
  options?: {
    holisticHours?: number;
    holisticCount?: number;
    activeProjectsList?: any[];
    tasksList?: any[];
    burnoutHours?: number;
    config?: Partial<MetricCalculationConfig>;
  }
): {
  overallScore: number;
  baseCompositeScore: number;
  taskBonus: number;
  projectBonus: number;
  holisticBonus: number;
  burnoutBonus: number;
  peerBonus: number;
  tierLabel: string;
  tierBadgeClass: string;
} {
  const cfg = { ...DEFAULT_METRIC_CONFIG, ...(options?.config || {}) };
  const baseCompositeScore = metrics.classDeliveryScore || 100;
  
  // 1. Task Contribution Bonus
  let taskBonus = 0;
  if (metrics.tasksCompleted > 0) {
    taskBonus = Math.min(cfg.maxTaskBonus, metrics.tasksCompleted * cfg.taskBonusPerItem);
  } else if (metrics.totalTasks > 0 && metrics.taskCompletionScore > 0) {
    taskBonus = Math.min(10, Math.round((metrics.taskCompletionScore / 100) * cfg.maxTaskBonus));
  }

  // 2. Active Project Contribution Bonus
  let projectBonus = 0;
  if (metrics.activeProjects > 0) {
    const avgProgress = metrics.avgProjectCompletion > 0 ? metrics.avgProjectCompletion : 50;
    projectBonus = Math.min(cfg.maxProjectBonus, Math.round(cfg.projectBaseBonus + (avgProgress / 100) * cfg.projectProgressScale));
  }

  // 3. Holistic Work & Guidance
  let holisticBonus = 0;
  const holisticHrs = options?.holisticHours ?? (metrics.additionalContributionScore > 0 ? (metrics.additionalContributionScore / 10) : 0);
  const holisticCnt = options?.holisticCount ?? 0;
  
  if (holisticHrs > 0) {
    holisticBonus = Math.min(cfg.maxHolisticBonus, Math.round(holisticHrs * cfg.holisticHourRate));
  } else if (holisticCnt > 0) {
    holisticBonus = Math.min(15, holisticCnt * 3);
  }

  // 4. Burnout Overtime Bonus (if specified)
  let burnoutBonus = 0;
  const burnoutHrs = options?.burnoutHours ?? 0;
  if (burnoutHrs > 0) {
    burnoutBonus = Number((burnoutHrs * cfg.burnoutHourRate).toFixed(1));
  }

  // Total overall score
  const overallScore = Math.min(cfg.maxOverallScore, Math.round(baseCompositeScore + taskBonus + projectBonus + holisticBonus + burnoutBonus));

  // Determine Tier Label
  let tierLabel = 'Core SLA Met (100%)';
  let tierBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';

  if (overallScore >= cfg.goldThreshold) {
    tierLabel = 'Gold MVP Performer 🌟';
    tierBadgeClass = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
  } else if (overallScore >= cfg.silverThreshold) {
    tierLabel = 'Silver Star Performer 🟣';
    tierBadgeClass = 'bg-purple-50 text-purple-900 border-purple-300 font-bold';
  } else if (overallScore >= cfg.valueAddThreshold) {
    tierLabel = 'Value-Add Contributor 🔵';
    tierBadgeClass = 'bg-sky-50 text-sky-900 border-sky-300 font-semibold';
  } else if (overallScore >= cfg.standardSlaThreshold) {
    tierLabel = 'Standard SLA (100%) 🟢';
    tierBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200 font-semibold';
  } else {
    tierLabel = 'Needs Attention (<90%) ⚠️';
    tierBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200 font-semibold';
  }

  return {
    overallScore,
    baseCompositeScore,
    taskBonus,
    projectBonus,
    holisticBonus,
    burnoutBonus,
    peerBonus: holisticBonus,
    tierLabel,
    tierBadgeClass,
  };
}

export interface SimulationParams {
  regularHours: number;
  burnoutHours: number;
  holisticHours: number;
  tasksCompleted: number;
  activeProjects: number;
  avgProjectProgress?: number;
  config?: Partial<MetricCalculationConfig>;
}

export function simulateOverallScore(params: SimulationParams) {
  const cfg = { ...DEFAULT_METRIC_CONFIG, ...(params.config || {}) };
  
  // Base SLA delivery percentage based on 36.0h weekly standard target
  const baseDeliveryPct = params.regularHours >= cfg.weeklyStandardHours 
    ? 100 
    : Math.min(100, Math.round((params.regularHours / cfg.weeklyStandardHours) * 100));

  const burnoutBonus = Number((params.burnoutHours * cfg.burnoutHourRate).toFixed(1));
  const holisticBonus = Math.min(cfg.maxHolisticBonus, Number((params.holisticHours * cfg.holisticHourRate).toFixed(1)));
  const taskBonus = Math.min(cfg.maxTaskBonus, params.tasksCompleted * cfg.taskBonusPerItem);
  
  let projectBonus = 0;
  if (params.activeProjects > 0) {
    const progress = params.avgProjectProgress ?? 75;
    projectBonus = Math.min(cfg.maxProjectBonus, Math.round(cfg.projectBaseBonus + (progress / 100) * cfg.projectProgressScale));
  }

  const rawTotal = baseDeliveryPct + burnoutBonus + holisticBonus + taskBonus + projectBonus;
  const overallScore = Math.min(cfg.maxOverallScore, Math.round(rawTotal));

  let tierLabel = 'Standard SLA (100%)';
  let tierBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (overallScore >= cfg.goldThreshold) {
    tierLabel = 'Gold MVP Performer 🌟';
    tierBadgeClass = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
  } else if (overallScore >= cfg.silverThreshold) {
    tierLabel = 'Silver Star Performer 🟣';
    tierBadgeClass = 'bg-purple-50 text-purple-900 border-purple-300 font-bold';
  } else if (overallScore >= cfg.valueAddThreshold) {
    tierLabel = 'Value-Add Contributor 🔵';
    tierBadgeClass = 'bg-sky-50 text-sky-900 border-sky-300 font-semibold';
  } else if (overallScore >= cfg.standardSlaThreshold) {
    tierLabel = 'Core SLA Met (100%) 🟢';
    tierBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
  } else {
    tierLabel = 'Needs Attention (<90%) ⚠️';
    tierBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200 font-semibold';
  }

  return {
    overallScore,
    rawTotal,
    baseDeliveryPct,
    burnoutBonus,
    holisticBonus,
    taskBonus,
    projectBonus,
    tierLabel,
    tierBadgeClass,
  };
}

export function calculateHolisticGuidanceMetrics(
  contributions: HolisticContributionRecord[] = []
): HolisticGuidanceMetrics {
  const categoryCounts: Record<string, number> = {};
  const categoryHours: Record<string, number> = {};

  if (!contributions || contributions.length === 0) {
    return {
      totalSessions: 0,
      totalHours: 0,
      connectPercentage: 0,
      categoryCounts: {},
      categoryHours: {},
      impactLevel: 'Emerging Mentor',
    };
  }

  let totalMinutes = 0;

  contributions.forEach((item) => {
    const mins = Number(item.durationMinutes) || 30;
    const cat = item.category || 'General Guidance';

    totalMinutes += mins;

    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    categoryHours[cat] = Number(((categoryHours[cat] || 0) + mins / 60).toFixed(2));
  });

  const totalSessions = contributions.length;
  const totalHours = Number((totalMinutes / 60).toFixed(2));

  // Separate Connect Percentage Algorithm:
  // Evaluates consistency of contribution sessions and total dedicated hours
  // Target: 4+ sessions (50 pts) and 3.0+ hours (50 pts)
  const sessionPoints = Math.min(50, Math.round((totalSessions / 4) * 50));
  const depthPoints = Math.min(50, Math.round((totalHours / 3.0) * 50));

  const connectPercentage = Math.min(100, sessionPoints + depthPoints);

  let impactLevel: HolisticGuidanceMetrics['impactLevel'] = 'Emerging Mentor';
  if (connectPercentage >= 85) {
    impactLevel = 'Distinguished Mentor';
  } else if (connectPercentage >= 65) {
    impactLevel = 'Lead Community Pillar';
  } else if (connectPercentage >= 40) {
    impactLevel = 'Proactive Enabler';
  }

  return {
    totalSessions,
    totalHours,
    connectPercentage,
    categoryCounts,
    categoryHours,
    impactLevel,
  };
}

export type WorkEffortTimeframe = 'day' | 'week' | 'month' | 'all';
export type WorkEffortMode = 'all' | 'extraOnly' | 'additionalDuties' | 'peerEnablement';

export interface WorkEffortSlice {
  name: string;
  hours: number;
  percentage: number;
  color: string;
  isExtra: boolean;
  description: string;
}

export interface WorkEffortBreakdown {
  timeframe: WorkEffortTimeframe;
  distinctDaysCount: number;
  regularDeliveryHours: number;
  paperEvaluationHours: number;
  inServiceHours: number;
  invigilationHours: number;
  overtimeHours: number;
  holisticHours: number;
  totalWorkloadHours: number;
  totalExtraHours: number;
  extraEffortPercentage: number;
  regularWorkPercentage: number;
  slices: WorkEffortSlice[];
  allSlices: WorkEffortSlice[];
  extraOnlySlices: WorkEffortSlice[];
  additionalDutiesSlices: WorkEffortSlice[];
  peerEnablementSlices: WorkEffortSlice[];
}

export function calculateWorkEffortBreakdown(
  dailyUpdates: DailyUpdate[] = [],
  holisticContributions: HolisticContributionRecord[] = [],
  timeframe: WorkEffortTimeframe = 'day'
): WorkEffortBreakdown {
  let rawRegularDeliveryHours = 0;
  let rawPaperEvaluationHours = 0;
  let rawInServiceHours = 0;
  let rawInvigilationHours = 0;
  let rawOvertimeHours = 0;
  let rawHolisticHours = 0;

  const distinctDates = new Set<string>();

  dailyUpdates.forEach((u) => {
    if (u.date) distinctDates.add(u.date);
    const logged = Number(u.hoursLogged) || (u.isLeave ? 6 : 6);
    const paper = Number(u.paperEvaluationHours) || 0;
    const inServ = Number(u.inServiceHours) || 0;
    const invig = Number(u.invigilationHours) || 0;
    const ot = Number(u.extraHoursWorked) || Math.max(0, logged - 6);

    rawPaperEvaluationHours += paper;
    rawInServiceHours += inServ;
    rawInvigilationHours += invig;
    rawOvertimeHours += ot;

    // Regular core delivery hours
    const core = Math.max(0, logged - paper - inServ - invig - ot);
    rawRegularDeliveryHours += core > 0 ? core : Math.max(0, Math.min(logged, 6) - paper - inServ - invig);
  });

  // Track holistic contribution categories
  const holisticCategoryHours: Record<string, number> = {};
  holisticContributions.forEach((h) => {
    if (h.date) distinctDates.add(h.date);
    const mins = Number(h.durationMinutes) || 0;
    const hrs = mins / 60;
    rawHolisticHours += hrs;
    const cat = h.category || 'Peer Enablement';
    holisticCategoryHours[cat] = (holisticCategoryHours[cat] || 0) + hrs;
  });

  const distinctDaysCount = Math.max(1, distinctDates.size || dailyUpdates.length || 1);

  // Timeframe scaling factor
  let scaleFactor = 1;
  if (timeframe === 'day') {
    scaleFactor = 1 / distinctDaysCount;
  } else if (timeframe === 'week') {
    scaleFactor = 6 / distinctDaysCount;
  } else if (timeframe === 'month') {
    scaleFactor = 24 / distinctDaysCount;
  } else {
    // 'all'
    scaleFactor = 1;
  }

  const regularDeliveryHours = Number((rawRegularDeliveryHours * scaleFactor).toFixed(2));
  const paperEvaluationHours = Number((rawPaperEvaluationHours * scaleFactor).toFixed(2));
  const inServiceHours = Number((rawInServiceHours * scaleFactor).toFixed(2));
  const invigilationHours = Number((rawInvigilationHours * scaleFactor).toFixed(2));
  const overtimeHours = Number((rawOvertimeHours * scaleFactor).toFixed(2));
  const holisticHours = Number((rawHolisticHours * scaleFactor).toFixed(2));

  const totalExtraHours = Number(
    (paperEvaluationHours + inServiceHours + invigilationHours + overtimeHours + holisticHours).toFixed(2)
  );
  const totalWorkloadHours = Number((regularDeliveryHours + totalExtraHours).toFixed(2));

  const extraEffortPercentage = totalWorkloadHours > 0
    ? Number(((totalExtraHours / totalWorkloadHours) * 100).toFixed(1))
    : 0;

  const regularWorkPercentage = totalWorkloadHours > 0
    ? Number(((regularDeliveryHours / totalWorkloadHours) * 100).toFixed(1))
    : 0;

  // 1. All Slices (Total Workload Split)
  const allSlices: WorkEffortSlice[] = [];
  if (regularDeliveryHours > 0) {
    allSlices.push({
      name: 'Regular Delivery & Core Shift',
      hours: regularDeliveryHours,
      percentage: totalWorkloadHours > 0 ? Number(((regularDeliveryHours / totalWorkloadHours) * 100).toFixed(1)) : 0,
      color: '#38bdf8', // Soft Sky Blue
      isExtra: false,
      description: 'Scheduled classroom delivery, practice sessions & standard shift work',
    });
  }

  if (overtimeHours > 0) {
    allSlices.push({
      name: 'Overtime & Extended Hours',
      hours: overtimeHours,
      percentage: totalWorkloadHours > 0 ? Number(((overtimeHours / totalWorkloadHours) * 100).toFixed(1)) : 0,
      color: '#fbbf24', // Warm Amber Gold
      isExtra: true,
      description: 'Extra hours worked beyond standard 6-hour shift (extended labs/sessions)',
    });
  }

  if (paperEvaluationHours > 0) {
    allSlices.push({
      name: 'Paper Evaluation & Grading',
      hours: paperEvaluationHours,
      percentage: totalWorkloadHours > 0 ? Number(((paperEvaluationHours / totalWorkloadHours) * 100).toFixed(1)) : 0,
      color: '#818cf8', // Soft Indigo Lavender
      isExtra: true,
      description: 'Assessment scoring, test correction & performance grading blocks',
    });
  }

  if (inServiceHours > 0) {
    allSlices.push({
      name: 'In-Service Training & Upskilling',
      hours: inServiceHours,
      percentage: totalWorkloadHours > 0 ? Number(((inServiceHours / totalWorkloadHours) * 100).toFixed(1)) : 0,
      color: '#34d399', // Soft Mint Emerald
      isExtra: true,
      description: 'Pedagogical workshops, syllabus deep dives & technical enablement',
    });
  }

  if (invigilationHours > 0) {
    allSlices.push({
      name: 'Invigilation & Exam Duties',
      hours: invigilationHours,
      percentage: totalWorkloadHours > 0 ? Number(((invigilationHours / totalWorkloadHours) * 100).toFixed(1)) : 0,
      color: '#f43f5e', // Vibrant Rose
      isExtra: true,
      description: 'Exam hall supervision, student proctoring & evaluation oversight',
    });
  }

  if (holisticHours > 0) {
    allSlices.push({
      name: 'Peer Enablement & Guidance',
      hours: holisticHours,
      percentage: totalWorkloadHours > 0 ? Number(((holisticHours / totalWorkloadHours) * 100).toFixed(1)) : 0,
      color: '#fb7185', // Soft Rose Blush
      isExtra: true,
      description: 'Emotional counseling, peer doubt clearing, community & admin support',
    });
  }

  if (allSlices.length === 0) {
    allSlices.push({
      name: 'Regular Delivery',
      hours: 0,
      percentage: 100,
      color: '#38bdf8',
      isExtra: false,
      description: 'No hours recorded for this timeframe',
    });
  }

  // 2. Extra & Overtime Only Slices
  const extraOnlySlices: WorkEffortSlice[] = [];
  if (totalExtraHours > 0) {
    if (overtimeHours > 0) {
      extraOnlySlices.push({
        name: 'Overtime & Extended Shift',
        hours: overtimeHours,
        percentage: Number(((overtimeHours / totalExtraHours) * 100).toFixed(1)),
        color: '#fbbf24', // Warm Amber
        isExtra: true,
        description: 'Direct overtime hours beyond standard shift',
      });
    }
    if (paperEvaluationHours > 0) {
      extraOnlySlices.push({
        name: 'Paper Evaluation',
        hours: paperEvaluationHours,
        percentage: Number(((paperEvaluationHours / totalExtraHours) * 100).toFixed(1)),
        color: '#818cf8', // Soft Indigo Lavender
        isExtra: true,
        description: 'Assessment paper grading and scoring',
      });
    }
    if (inServiceHours > 0) {
      extraOnlySlices.push({
        name: 'In-Service Training',
        hours: inServiceHours,
        percentage: Number(((inServiceHours / totalExtraHours) * 100).toFixed(1)),
        color: '#34d399', // Soft Mint Emerald
        isExtra: true,
        description: 'Pedagogical upskilling and curriculum workshops',
      });
    }
    if (invigilationHours > 0) {
      extraOnlySlices.push({
        name: 'Invigilation & Exam Duties',
        hours: invigilationHours,
        percentage: Number(((invigilationHours / totalExtraHours) * 100).toFixed(1)),
        color: '#f43f5e', // Vibrant Rose
        isExtra: true,
        description: 'Exam supervision & proctoring blocks',
      });
    }
    if (holisticHours > 0) {
      extraOnlySlices.push({
        name: 'Peer Enablement & Counseling',
        hours: holisticHours,
        percentage: Number(((holisticHours / totalExtraHours) * 100).toFixed(1)),
        color: '#fb7185', // Soft Rose
        isExtra: true,
        description: 'Guidance and empathy support sessions',
      });
    }
  } else {
    extraOnlySlices.push({
      name: 'No Extra Hours',
      hours: 0,
      percentage: 100,
      color: '#cbd5e1',
      isExtra: true,
      description: 'Trainer adhered to standard shift hours with no overtime logged',
    });
  }

  // 3. Additional Duties Slices (Paper Evaluation + In-Service Training + Invigilation)
  const totalAdditionalDutiesHours = Number((paperEvaluationHours + inServiceHours + invigilationHours).toFixed(2));
  const additionalDutiesSlices: WorkEffortSlice[] = [];
  if (totalAdditionalDutiesHours > 0) {
    if (paperEvaluationHours > 0) {
      additionalDutiesSlices.push({
        name: 'Paper Evaluation & Grading',
        hours: paperEvaluationHours,
        percentage: Number(((paperEvaluationHours / totalAdditionalDutiesHours) * 100).toFixed(1)),
        color: '#818cf8', // Soft Indigo Lavender
        isExtra: true,
        description: 'Test paper correction, performance assessments, and trainee feedback',
      });
    }
    if (inServiceHours > 0) {
      additionalDutiesSlices.push({
        name: 'In-Service Training & Workshops',
        hours: inServiceHours,
        percentage: Number(((inServiceHours / totalAdditionalDutiesHours) * 100).toFixed(1)),
        color: '#34d399', // Soft Mint Emerald
        isExtra: true,
        description: 'Pedagogical workshops, syllabus refinement, and skill enhancement',
      });
    }
    if (invigilationHours > 0) {
      additionalDutiesSlices.push({
        name: 'Invigilation & Exam Duty',
        hours: invigilationHours,
        percentage: Number(((invigilationHours / totalAdditionalDutiesHours) * 100).toFixed(1)),
        color: '#f43f5e', // Vibrant Rose
        isExtra: true,
        description: 'Exam hall supervision, student proctoring & exam duty blocks',
      });
    }
  } else {
    additionalDutiesSlices.push({
      name: 'No Additional Duties',
      hours: 0,
      percentage: 100,
      color: '#cbd5e1',
      isExtra: true,
      description: 'No paper evaluation, in-service, or invigilation logged for this timeframe',
    });
  }

  // 4. Peer Enablement Slices (Breakdown by holistic categories)
  const peerEnablementSlices: WorkEffortSlice[] = [];
  const holisticColors: Record<string, string> = {
    'Emotional & Wellbeing Guidance': '#fb7185', // Soft Rose
    'Peer Collaboration & Doubt Clearing': '#38bdf8', // Soft Sky Blue
    'Administrative & Distribution Support': '#fb923c', // Soft Warm Orange
    'Community & Context Collaboration': '#818cf8', // Soft Indigo
    'Lab & Practical Support': '#34d399', // Soft Mint Emerald
    'Lab & Practical Assistance': '#34d399',
    'Trainee Motivation & Career Mentorship': '#c084fc', // Soft Purple
    'Syllabus Enrichment & Code Reviews': '#22d3ee', // Soft Cyan
  };

  const defaultCategoryColors = ['#fb7185', '#38bdf8', '#fbbf24', '#818cf8', '#34d399', '#c084fc', '#22d3ee', '#f472b6', '#2dd4bf'];
  let colorIdx = 0;

  const totalPeerHours = holisticHours;
  if (totalPeerHours > 0 && Object.keys(holisticCategoryHours).length > 0) {
    Object.entries(holisticCategoryHours).forEach(([catName, catRawHours]) => {
      const scaledCatHours = Number((catRawHours * scaleFactor).toFixed(2));
      if (scaledCatHours > 0 || totalPeerHours > 0) {
        const catPercentage = totalPeerHours > 0 
          ? Number(((scaledCatHours / totalPeerHours) * 100).toFixed(1)) 
          : 0;
        const assignedColor = holisticColors[catName] || defaultCategoryColors[colorIdx % defaultCategoryColors.length];
        colorIdx++;

        peerEnablementSlices.push({
          name: catName,
          hours: scaledCatHours,
          percentage: catPercentage,
          color: assignedColor,
          isExtra: true,
          description: `Holistic contribution logged in ${catName}`,
        });
      }
    });
  } else {
    peerEnablementSlices.push({
      name: 'No Peer Guidance Logged',
      hours: 0,
      percentage: 100,
      color: '#94a3b8',
      isExtra: true,
      description: 'No peer enablement or counseling sessions logged for this timeframe',
    });
  }

  return {
    timeframe,
    distinctDaysCount,
    regularDeliveryHours,
    paperEvaluationHours,
    inServiceHours,
    invigilationHours,
    overtimeHours,
    holisticHours,
    totalWorkloadHours,
    totalExtraHours,
    extraEffortPercentage,
    regularWorkPercentage,
    slices: allSlices,
    allSlices,
    extraOnlySlices,
    additionalDutiesSlices,
    peerEnablementSlices,
  };
}
