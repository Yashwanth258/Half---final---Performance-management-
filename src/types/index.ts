export type UserRole = 'TRAINER' | 'MANAGER';
export type EnterpriseDepartment = 'Frontend' | 'Backend' | 'GenAI';

export const ENTERPRISE_DEPARTMENTS: { id: EnterpriseDepartment; name: string; label: string; description: string; defaultSubject: string }[] = [
  { 
    id: 'Frontend', 
    name: 'Frontend Department', 
    label: 'Frontend Development', 
    description: 'React, TypeScript, Next.js, UI Architecture & Modern Web Systems',
    defaultSubject: 'React & Modern Frontend Systems'
  },
  { 
    id: 'Backend', 
    name: 'Backend Department', 
    label: 'Backend Development', 
    description: 'Node.js, Distributed APIs, Microservices, Databases & Cloud Infrastructure',
    defaultSubject: 'Node.js & Distributed Systems'
  },
  { 
    id: 'GenAI', 
    name: 'GenAI Department', 
    label: 'Generative AI & LLMs', 
    description: 'Generative AI, Large Language Models, Multi-Agent Systems & AI Workflows',
    defaultSubject: 'Generative AI & LLM Systems'
  },
];

export type PerformanceCategory = 'Excellent' | 'Good' | 'Needs Improvement' | 'Critical';

export type ClassStatus = 'Scheduled' | 'Completed' | 'Ongoing' | 'Cancelled' | 'Rescheduled';
export type DeliveryMode = 'Online' | 'Offline' | 'Hybrid';

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Blocked' | 'Delayed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type ProjectStage = 
  | 'Planning' 
  | 'Research' 
  | 'Requirement Analysis' 
  | 'Design' 
  | 'Architecture & Prototyping'
  | 'Development' 
  | 'Testing' 
  | 'Deployment' 
  | 'Completed';

export type ProjectStatus = 'On Track' | 'At Risk' | 'Delayed' | 'Completed';

export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
export type AlertType = 
  | 'TASK_OVERDUE' 
  | 'PROJECT_DELAYED' 
  | 'LOW_TASK_COMPLETION' 
  | 'QA_RATING_DROP' 
  | 'LOW_STUDENT_FEEDBACK' 
  | 'MISSED_CLASS' 
  | 'LOW_ATTENDANCE' 
  | 'MISSING_DAILY_UPDATE' 
  | 'PERFORMANCE_DROP';

export interface UserProfile {
  uid: string;
  employeeId: string; // Must start with NW for trainers (e.g. NW1048)
  fullName: string;
  companyEmail: string;
  role: UserRole;
  department?: EnterpriseDepartment | string;
  teamId: string;
  teamName?: string;
  managerId: string;
  managerName?: string;
  managerEmail?: string;
  designation: string;
  location: string;
  subject: string;
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  managerId: string;
  managerName: string;
  department: string;
  location: string;
  description?: string;
  createdAt: string;
}

export interface DailyUpdate {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  userEmail?: string;
  teamId: string;
  managerId: string;
  date: string; // YYYY-MM-DD
  classesHandled: string; // text description or "3 Classes"
  classesCount?: number; // 0 - 8
  classDurationMinutes?: number; // e.g. 15, 30, 45, 50, 60, 75, 90, 120, 150, 180, 240 mins (customizable per class)
  totalClassesDurationMinutes?: number;
  practiceSessionsCount?: number; // 0 - 8
  practiceDurationMinutes?: number; // e.g. 15, 30, 45, 50, 60, 75, 90, 120, 150, 180, 240 mins (customizable per practice session)
  totalPracticeDurationMinutes?: number;
  totalSessionsCount?: number;
  sessionMinutesCalculated?: number;
  tasksWorkedOn: string;
  projectUpdates?: string; // Optional legacy field
  additionalCategory?: 'None' | 'Paper Evaluation' | 'In-service' | 'Invigilation' | 'Both' | 'All Duties' | 'Custom' | string;
  additionalResponsibilities?: string;
  paperEvaluationHours?: number;
  inServiceHours?: number;
  invigilationHours?: number;
  invigilationDetails?: string;
  isLeave?: boolean;
  leaveType?: 'CASUAL_LEAVE' | 'SICK_LEAVE' | 'UNPAID_LEAVE' | 'NONE';
  leaveReason?: string;
  calculatedTotalHours?: number;
  standardWorkingHours?: number; // default 6 hours/day
  weeklyStandardHours?: number; // default 36 hours/week (6 days * 6 hours)
  extraHoursWorked?: number; // max(0, totalHours - 6)
  burnoutRiskLevel?: 'Normal' | 'Moderate' | 'High' | 'Severe';
  extraWorkReason?: string; // e.g. 'Paper Evaluation', 'In-service Training', 'Exam Invigilation', 'Extended Class Sessions', etc.
  extraWorkDetails?: string;
  challengesOrBlockers?: string;
  remarks?: string;
  hoursLogged?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassItem {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  teamId: string;
  managerId: string;
  className: string;
  batch: string;
  subject: string;
  topic: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  numberOfStudents: number;
  deliveryMode: DeliveryMode;
  status: ClassStatus;
  remarks?: string;
  roomOrMeetingLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem {
  id: string;
  taskName: string;
  description: string;
  assignedBy: string;
  assignedByName: string;
  assignedTo: string; // userId
  assignedToName: string;
  assignedToEmployeeId: string;
  teamId: string;
  managerId: string;
  priority: TaskPriority;
  assignedDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: TaskStatus;
  completionPercentage: number; // 0 - 100
  remarks?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  stage: ProjectStage;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number;
  order: number;
  dueDate?: string;
  completedAt?: string;
}

export interface ProjectItem {
  id: string;
  projectName: string; // Project Title
  projectDescription: string;
  startDate: string;
  expectedCompletionDate: string;
  currentStage: ProjectStage;
  overallCompletionPercentage: number;
  currentStatus: ProjectStatus;
  managerId: string;
  managerName: string;
  assignedTo: string; // userId (can be empty string if open for self-assignment)
  assignedToName: string;
  assignedToEmployeeId: string;
  teamId: string;
  remarks?: string;
  repositoryUrl?: string;
  deliverables?: string;
  isSelfAssigned?: boolean;
  isOpenForSelfAssignment?: boolean;
  milestones?: ProjectMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface AdditionalDutySummary {
  totalPaperEvaluationHours: number;
  totalInServiceHours: number;
  totalInvigilationHours?: number;
  totalAdditionalHours: number;
  completedDutiesCount: number;
  dutySessionsCount: number;
  calculatedDutyPercentage: number; // 0 - 100%
  hasUndertakenDuties: boolean;
}

export interface PerformanceWeights {
  classDelivery: number; // default 40
  taskCompletion: number; // default 30
  projectProgress: number; // default 20
  additionalContribution: number; // default 10
}

export interface MetricCalculationConfig {
  weeklyStandardHours: number; // default: 36.0
  dailyStandardHours: number; // default: 6.0
  burnoutHourRate: number; // default: 3.0 (% per extra hour beyond 36h)
  holisticHourRate: number; // default: 3.5 (% per hour of mentorship/counseling)
  taskBonusPerItem: number; // default: 3.0 (% per completed task)
  projectBaseBonus: number; // default: 5.0 (% base for undertaking project)
  projectProgressScale: number; // default: 10.0 (% scaled by progress)
  maxTaskBonus: number; // default: 15.0 (%)
  maxProjectBonus: number; // default: 15.0 (%)
  maxHolisticBonus: number; // default: 20.0 (%)
  maxOverallScore: number; // default: 150.0 (%)

  // Tier thresholds
  goldThreshold: number; // default: 120 (%)
  silverThreshold: number; // default: 110 (%)
  valueAddThreshold: number; // default: 101 (%)
  standardSlaThreshold: number; // default: 90 (%)
}

export interface PerformanceBreakdown {
  classDeliveryScore: number; // out of 100
  taskCompletionScore: number; // out of 100
  projectProgressScore: number; // out of 100
  additionalContributionScore: number; // out of 100
  classesCompleted: number;
  classesScheduled: number;
  tasksCompleted: number;
  totalTasks: number;
  activeProjects: number;
  avgProjectCompletion: number;
}

export interface PerformanceRecord {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  teamId: string;
  managerId: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  periodKey: string; // e.g. "2026-W34", "2026-08", "2026-Q3"
  overallScore: number;
  category: PerformanceCategory;
  metrics: PerformanceBreakdown;
  weights: PerformanceWeights;
  calculatedAt: string;
}

export interface TargetItem {
  id: string;
  userId: string;
  employeeId: string;
  managerId: string;
  title: string;
  metricType: 'Classes' | 'Tasks' | 'QA Score' | 'Student Rating' | 'Hours' | 'Projects';
  targetValue: number;
  currentValue: number;
  unit: string;
  period: 'Weekly' | 'Monthly' | 'Quarterly';
  startDate: string;
  endDate: string;
  status: 'In Progress' | 'Achieved' | 'Missed';
  createdAt: string;
}

export interface AlertItem {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  teamId: string;
  managerId: string;
  type: AlertType;
  title: string;
  description: string;
  severity: AlertSeverity;
  date: string;
  status: AlertStatus;
  entityId?: string;
  entityType?: 'task' | 'project' | 'class' | 'dailyUpdate' | 'performance';
  createdAt: string;
  resolvedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'TASK' | 'PROJECT' | 'PERFORMANCE' | 'ALERT' | 'CLASS' | 'FEEDBACK';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface FeedbackRecord {
  id: string;
  userId: string;
  employeeId: string;
  managerId?: string;
  type: 'QA' | 'Student' | 'Manager';
  score: number; // 0 - 10
  maxScore: number;
  category?: string;
  comments: string;
  evaluatorName: string;
  date: string;
  createdAt: string;
}

export type FeedbackItem = FeedbackRecord;
export type PerformanceWeightConfig = PerformanceWeights;

export interface AttendanceRecord {
  id: string;
  userId: string;
  employeeId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
}

export interface WorkloadSummary {
  userId: string;
  employeeName: string;
  employeeId: string;
  classesAssignedThisWeek: number;
  tasksAssigned: number;
  activeProjects: number;
  overdueTasksCount: number;
  delayedProjectsCount: number;
  estimatedWeeklyHours: number;
  status: 'Overloaded' | 'Optimal' | 'Underutilized';
}

export interface FilterState {
  employeeId?: string;
  teamId?: string;
  location?: string;
  subject?: string;
  category?: string;
  taskStatus?: string;
  projectStatus?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
}

export const DEFAULT_HOLISTIC_CATEGORIES = [
  'Emotional & Wellbeing Guidance',
  'Peer Collaboration & Doubt Clearing',
  'Administrative & Distribution Support',
  'Community & Context Collaboration',
  'Lab & Practical Support',
  'Trainee Motivation & Career Mentorship',
  'Other',
] as const;

export type HolisticGuidanceCategory = string;

export interface HolisticContributionRecord {
  id: string;
  userId: string;
  employeeId: string;
  employeeName: string;
  managerId?: string;
  managerName?: string;
  date: string; // YYYY-MM-DD
  category: string;
  durationMinutes: number; // e.g. 15, 30, 45, 60, 90 mins
  impactNotes: string; // Description of the guidance or assistance provided
  acknowledgedByManager?: boolean;
  managerFeedbackNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HolisticGuidanceMetrics {
  totalSessions: number;
  totalHours: number;
  connectPercentage: number; // 0 - 100% separately calculated metric
  categoryCounts: Record<string, number>;
  categoryHours: Record<string, number>;
  impactLevel: 'Emerging Mentor' | 'Proactive Enabler' | 'Lead Community Pillar' | 'Distinguished Mentor';
}

export type ManagerChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ManagerChangeRequest {
  id: string;
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  instructorEmployeeId: string;
  currentManagerId: string;
  currentManagerName: string;
  currentManagerEmail?: string;
  requestedManagerId: string;
  requestedManagerName: string;
  requestedManagerEmail: string;
  reason: string;
  status: ManagerChangeRequestStatus;
  requestDate: string; // ISO date string
  reviewedDate?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}
