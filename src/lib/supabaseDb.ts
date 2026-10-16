import { supabase } from './supabase';
import { 
  UserProfile, 
  DailyUpdate, 
  ClassItem, 
  TaskItem, 
  ProjectItem, 
  PerformanceWeights,
  Team
} from '../types';

// Helper to convert snake_case object to camelCase and vice versa
export const toCamelCase = (obj: any): any => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

export const toSnakeCase = (obj: any): any => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const newObj: any = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = obj[key];
  }
  return newObj;
};

// 1. PROFILES
export const fetchAllProfiles = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Supabase] fetchAllProfiles warning:', error.message);
    return [];
  }
  return (data || []).map(p => ({
    uid: p.uid || p.id,
    employeeId: p.employee_id,
    fullName: p.full_name,
    companyEmail: p.company_email,
    role: p.role,
    department: p.department || 'GenAI',
    teamId: p.team_id || 'team-genai',
    teamName: p.team_name,
    managerId: p.manager_id,
    managerName: p.manager_name,
    managerEmail: p.manager_email,
    designation: p.designation,
    location: p.location || '',
    subject: p.subject || '',
    avatarUrl: p.avatar_url,
    phone: p.phone,
    isActive: p.is_active ?? true,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
};

export const upsertProfile = async (profile: Partial<UserProfile> & { employeeId: string; companyEmail: string }): Promise<void> => {
  const payload: any = {
    employee_id: profile.employeeId,
    full_name: profile.fullName,
    company_email: profile.companyEmail,
    role: profile.role,
    designation: profile.designation,
    department: profile.department || 'GenAI',
    team_id: profile.teamId || 'team-genai',
    team_name: profile.teamName,
    manager_id: profile.managerId,
    manager_name: profile.managerName,
    location: profile.location || '',
    subject: profile.subject || '',
    phone: profile.phone,
    is_active: profile.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
  if (profile.uid) payload.uid = profile.uid;

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'employee_id' });

  if (error) {
    console.error('[Supabase] upsertProfile error:', error);
    throw error;
  }
};

// 2. DAILY UPDATES
export const fetchDailyUpdates = async (): Promise<DailyUpdate[]> => {
  const { data, error } = await supabase
    .from('daily_updates')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.warn('[Supabase] fetchDailyUpdates warning:', error.message);
    return [];
  }
  return (data || []).map(d => ({
    id: d.id,
    userId: d.user_id,
    employeeId: d.employee_id,
    employeeName: d.employee_name,
    userEmail: d.user_email,
    teamId: d.team_id,
    managerId: d.manager_id,
    date: d.date,
    classesHandled: d.classes_handled || '',
    classesCount: d.classes_count || 0,
    classDurationMinutes: d.class_duration_minutes || 60,
    totalClassesDurationMinutes: d.total_classes_duration_minutes || 0,
    practiceSessionsCount: d.practice_sessions_count || 0,
    practiceDurationMinutes: d.practice_duration_minutes || 60,
    totalPracticeDurationMinutes: d.total_practice_duration_minutes || 0,
    totalSessionsCount: d.total_sessions_count || 0,
    sessionMinutesCalculated: d.session_minutes_calculated || 0,
    tasksWorkedOn: d.tasks_worked_on || '',
    projectUpdates: d.project_updates,
    additionalCategory: d.additional_category || 'None',
    additionalResponsibilities: d.additional_responsibilities,
    paperEvaluationHours: Number(d.paper_evaluation_hours) || 0,
    inServiceHours: Number(d.in_service_hours) || 0,
    calculatedTotalHours: Number(d.calculated_total_hours) || 6,
    standardWorkingHours: Number(d.standard_working_hours) || 6,
    weeklyStandardHours: Number(d.weekly_standard_hours) || 36,
    extraHoursWorked: Number(d.extra_hours_worked) || 0,
    burnoutRiskLevel: d.burnout_risk_level || 'Normal',
    extraWorkReason: d.extra_work_reason,
    extraWorkDetails: d.extra_work_details,
    challengesOrBlockers: d.challenges_or_blockers,
    remarks: d.remarks,
    hoursLogged: Number(d.hours_logged) || 6,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));
};

export const createDailyUpdate = async (item: Omit<DailyUpdate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const payload = {
    user_id: item.userId,
    employee_id: item.employeeId,
    employee_name: item.employeeName,
    user_email: item.userEmail,
    team_id: item.teamId,
    manager_id: item.managerId,
    date: item.date,
    classes_handled: item.classesHandled,
    classes_count: item.classesCount || 0,
    class_duration_minutes: item.classDurationMinutes || 60,
    total_classes_duration_minutes: item.totalClassesDurationMinutes || 0,
    practice_sessions_count: item.practiceSessionsCount || 0,
    practice_duration_minutes: item.practiceDurationMinutes || 60,
    total_practice_duration_minutes: item.totalPracticeDurationMinutes || 0,
    total_sessions_count: item.totalSessionsCount || 0,
    session_minutes_calculated: item.sessionMinutesCalculated || 0,
    tasks_worked_on: item.tasksWorkedOn || '',
    additional_category: item.additionalCategory || 'None',
    paper_evaluation_hours: item.paperEvaluationHours || 0,
    in_service_hours: item.inServiceHours || 0,
    calculated_total_hours: item.calculatedTotalHours || 6,
    standard_working_hours: item.standardWorkingHours || 6,
    weekly_standard_hours: item.weeklyStandardHours || 36,
    extra_hours_worked: item.extraHoursWorked || 0,
    burnout_risk_level: item.burnoutRiskLevel || 'Normal',
    extra_work_reason: item.extraWorkReason,
    extra_work_details: item.extraWorkDetails,
    challenges_or_blockers: item.challengesOrBlockers,
    remarks: item.remarks,
    hours_logged: item.hoursLogged || 6,
  };

  const { data, error } = await supabase
    .from('daily_updates')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('[Supabase] createDailyUpdate error:', error);
    throw error;
  }
  return data.id;
};

export const updateDailyUpdate = async (id: string, updates: Partial<DailyUpdate>): Promise<void> => {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.hoursLogged !== undefined) payload.hours_logged = updates.hoursLogged;
  if (updates.tasksWorkedOn !== undefined) payload.tasks_worked_on = updates.tasksWorkedOn;
  if (updates.classesHandled !== undefined) payload.classes_handled = updates.classesHandled;
  if (updates.paperEvaluationHours !== undefined) payload.paper_evaluation_hours = updates.paperEvaluationHours;
  if (updates.inServiceHours !== undefined) payload.in_service_hours = updates.inServiceHours;
  if (updates.calculatedTotalHours !== undefined) payload.calculated_total_hours = updates.calculatedTotalHours;
  if (updates.extraHoursWorked !== undefined) payload.extra_hours_worked = updates.extraHoursWorked;
  if (updates.burnoutRiskLevel !== undefined) payload.burnout_risk_level = updates.burnoutRiskLevel;

  const { error } = await supabase
    .from('daily_updates')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('[Supabase] updateDailyUpdate error:', error);
    throw error;
  }
};

export const deleteDailyUpdate = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('daily_updates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] deleteDailyUpdate error:', error);
    throw error;
  }
};

// 3. CLASSES
export const fetchClasses = async (): Promise<ClassItem[]> => {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.warn('[Supabase] fetchClasses warning:', error.message);
    return [];
  }
  return (data || []).map(c => ({
    id: c.id,
    userId: c.user_id,
    employeeId: c.employee_id,
    employeeName: c.employee_name,
    teamId: c.team_id,
    managerId: c.manager_id,
    className: c.class_name,
    batch: c.batch,
    subject: c.subject,
    topic: c.topic,
    date: c.date,
    startTime: c.start_time,
    endTime: c.end_time,
    durationMinutes: c.duration_minutes,
    numberOfStudents: c.number_of_students,
    deliveryMode: c.delivery_mode,
    status: c.status,
    remarks: c.remarks,
    roomOrMeetingLink: c.room_or_meeting_link,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
};

export const createClass = async (item: Omit<ClassItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const payload = {
    user_id: item.userId,
    employee_id: item.employeeId,
    employee_name: item.employeeName,
    team_id: item.teamId,
    manager_id: item.managerId,
    class_name: item.className,
    batch: item.batch,
    subject: item.subject,
    topic: item.topic,
    date: item.date,
    start_time: item.startTime,
    end_time: item.endTime,
    duration_minutes: item.durationMinutes,
    number_of_students: item.numberOfStudents,
    delivery_mode: item.deliveryMode,
    status: item.status,
    remarks: item.remarks,
    room_or_meeting_link: item.roomOrMeetingLink,
  };

  const { data, error } = await supabase
    .from('classes')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('[Supabase] createClass error:', error);
    throw error;
  }
  return data.id;
};

// 4. TASKS
export const fetchTasks = async (): Promise<TaskItem[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Supabase] fetchTasks warning:', error.message);
    return [];
  }
  return (data || []).map(t => ({
    id: t.id,
    taskName: t.task_name,
    description: t.description,
    assignedBy: t.assigned_by,
    assignedByName: t.assigned_by_name,
    assignedTo: t.assigned_to,
    assignedToName: t.assigned_to_name,
    assignedToEmployeeId: t.assigned_to_employee_id,
    teamId: t.team_id,
    managerId: t.manager_id,
    priority: t.priority,
    assignedDate: t.assigned_date,
    dueDate: t.due_date,
    status: t.status,
    completionPercentage: t.completion_percentage,
    remarks: t.remarks,
    category: t.category,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
};

export const updateTask = async (id: string, updates: Partial<TaskItem>): Promise<void> => {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.completionPercentage !== undefined) payload.completion_percentage = updates.completionPercentage;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.remarks !== undefined) payload.remarks = updates.remarks;

  const { error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('[Supabase] updateTask error:', error);
    throw error;
  }
};

// 5. PROJECTS
export const fetchProjects = async (): Promise<ProjectItem[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Supabase] fetchProjects warning:', error.message);
    return [];
  }
  return (data || []).map(p => ({
    id: p.id,
    projectName: p.project_name,
    projectDescription: p.project_description,
    startDate: p.start_date,
    expectedCompletionDate: p.expected_completion_date,
    currentStage: p.current_stage,
    overallCompletionPercentage: p.overall_completion_percentage,
    currentStatus: p.current_status,
    managerId: p.manager_id,
    managerName: p.manager_name,
    assignedTo: p.assigned_to,
    assignedToName: p.assigned_to_name,
    assignedToEmployeeId: p.assigned_to_employee_id,
    teamId: p.team_id,
    remarks: p.remarks,
    repositoryUrl: p.repository_url,
    deliverables: p.deliverables,
    isSelfAssigned: p.is_self_assigned,
    isOpenForSelfAssignment: p.is_open_for_self_assignment,
    milestones: p.milestones || [],
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
};

// 6. PERFORMANCE WEIGHTS
export const fetchPerformanceWeights = async (): Promise<PerformanceWeights | null> => {
  const { data, error } = await supabase
    .from('performance_weights')
    .select('*')
    .eq('id', 'default')
    .single();

  if (error || !data) return null;
  return {
    classDelivery: data.class_delivery,
    taskCompletion: data.task_completion,
    projectProgress: data.project_progress,
    additionalContribution: data.additional_contribution,
  };
};

export const savePerformanceWeights = async (weights: PerformanceWeights): Promise<void> => {
  const { error } = await supabase
    .from('performance_weights')
    .upsert({
      id: 'default',
      class_delivery: weights.classDelivery,
      task_completion: weights.taskCompletion,
      project_progress: weights.projectProgress,
      additional_contribution: weights.additionalContribution,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[Supabase] savePerformanceWeights error:', error);
  }
};

// 7. CREDENTIALS & AUTH (SUPABASE)
export interface SupabaseCredentialRecord {
  id: string;
  employee_id?: string | null;
  email?: string | null;
  password?: string;
  role?: string;
  department?: string;
  manager_id?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  uid?: string;
  profile?: any;
  created_at?: string;
  updated_at?: string;
}

export const lookupCredentialsSupa = async (
  table: 'manager_credentials' | 'trainer_credentials' | 'user_credentials',
  keys: string[]
): Promise<SupabaseCredentialRecord | null> => {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in('id', keys)
      .limit(1);

    if (error || !data || data.length === 0) {
      // Also try querying by employee_id or email column
      const { data: colData, error: colError } = await supabase
        .from(table)
        .select('*')
        .or(`employee_id.in.(${keys.map(k => `"${k}"`).join(',')}),email.in.(${keys.map(k => `"${k}"`).join(',')})`)
        .limit(1);
      if (!colError && colData && colData.length > 0) {
        return colData[0];
      }
      return null;
    }
    return data[0];
  } catch (err) {
    return null;
  }
};

export const saveCredentialSupa = async (
  table: 'manager_credentials' | 'trainer_credentials' | 'user_credentials',
  keys: string[],
  record: any
): Promise<void> => {
  try {
    const rows = keys.map(k => ({
      id: k,
      employee_id: record.employeeId || null,
      email: record.email || (record.profile?.companyEmail || null),
      password: String(record.password || 'password'),
      role: record.role,
      department: record.department || record.profile?.department || 'GenAI',
      manager_id: record.managerId || record.profile?.managerId || null,
      manager_name: record.managerName || record.profile?.managerName || null,
      manager_email: record.managerEmail || record.profile?.managerEmail || null,
      uid: record.uid,
      profile: record.profile || null,
      updated_at: new Date().toISOString(),
    }));

    await supabase.from(table).upsert(rows, { onConflict: 'id' });
  } catch (err) {
    console.warn(`[Supabase] saveCredentialSupa notice (${table}):`, err);
  }
};
