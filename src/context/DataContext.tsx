import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  setDoc,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { 
  ClassItem, 
  TaskItem, 
  ProjectItem, 
  DailyUpdate, 
  FeedbackRecord, 
  AttendanceRecord, 
  TargetItem, 
  AlertItem, 
  NotificationItem, 
  PerformanceBreakdown, 
  PerformanceWeights,
  MetricCalculationConfig,
  UserProfile,
  Team,
  HolisticContributionRecord,
  ManagerChangeRequest
} from '../types';
import { 
  calculateTrainerMetrics, 
  computeOverallScore, 
  DEFAULT_WEIGHTS,
  DEFAULT_METRIC_CONFIG
} from '../lib/performanceEngine';
import { evaluateAlerts } from '../lib/alertEngine';
import { handleFirestoreError, OperationType, cleanFirestoreData } from '../lib/firestoreErrors';
import { seedEnterpriseData } from '../lib/seedDatabase';
import { 
  createDailyUpdate as createDailyUpdateSupa,
  updateDailyUpdate as updateDailyUpdateSupa,
  deleteDailyUpdate as deleteDailyUpdateSupa,
  createClass as createClassSupa,
  updateTask as updateTaskSupa,
  savePerformanceWeights as savePerformanceWeightsSupa,
  fetchDailyUpdates as fetchDailyUpdatesSupa,
  fetchClasses as fetchClassesSupa,
  fetchTasks as fetchTasksSupa,
  fetchProjects as fetchProjectsSupa,
  fetchAllProfiles as fetchAllProfilesSupa,
  fetchPerformanceWeights as fetchPerformanceWeightsSupa,
  upsertProfile as upsertProfileSupa
} from '../lib/supabaseDb';
import { supabase } from '../lib/supabase';

interface DataContextType {
  // Collections
  classes: ClassItem[];
  tasks: TaskItem[];
  projects: ProjectItem[];
  dailyUpdates: DailyUpdate[];
  feedbacks: FeedbackRecord[];
  attendanceList: AttendanceRecord[];
  targets: TargetItem[];
  alerts: AlertItem[];
  notifications: NotificationItem[];
  allTrainers: UserProfile[];
  allRegisteredTrainers: UserProfile[];
  allManagers: UserProfile[];
  teams: Team[];
  holisticContributions: HolisticContributionRecord[];
  userHolisticContributions: HolisticContributionRecord[];
  managerChangeRequests: ManagerChangeRequest[];

  // Persistent Selected Trainee State for Manager Workspace
  selectedTraineeId: string;
  setSelectedTraineeId: (id: string) => void;
  
  // Performance Engine
  currentMetrics: PerformanceBreakdown;
  currentOverallScore: number;
  performanceWeights: PerformanceWeights;
  setPerformanceWeights: (weights: PerformanceWeights) => void;
  metricConfig: MetricCalculationConfig;
  updateMetricConfig: (config: MetricCalculationConfig) => Promise<void>;
  
  // Trainer Actions
  addDailyUpdate: (update: Omit<DailyUpdate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateDailyUpdate: (id: string, data: Partial<DailyUpdate>) => Promise<void>;
  deleteDailyUpdate: (id: string) => Promise<void>;

  addHolisticContribution: (item: Omit<HolisticContributionRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateHolisticContribution: (id: string, data: Partial<HolisticContributionRecord>) => Promise<void>;
  deleteHolisticContribution: (id: string) => Promise<void>;
  
  addClass: (classItem: Omit<ClassItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateClass: (id: string, data: Partial<ClassItem>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  
  updateTaskProgress: (id: string, completionPercentage: number, status?: TaskItem['status'], remarks?: string) => Promise<void>;
  createTask: (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  deleteTask: (id: string) => Promise<void>;
  
  createProject: (project: Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProjectMilestone: (projectId: string, milestoneId: string, progress: number, status: 'Not Started' | 'In Progress' | 'Completed') => Promise<void>;
  updateProject: (id: string, data: Partial<ProjectItem>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  addTarget: (target: Omit<TargetItem, 'id' | 'createdAt'>) => Promise<string>;
  updateTargetProgress: (id: string, currentValue: number) => Promise<void>;
  deleteTarget: (id: string) => Promise<void>;

  // Manager Change Request Actions
  submitManagerChangeRequest: (req: Omit<ManagerChangeRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'requestDate'>) => Promise<string>;
  approveManagerChangeRequest: (requestId: string, notes?: string) => Promise<void>;
  rejectManagerChangeRequest: (requestId: string, notes?: string) => Promise<void>;
  
  // Manager Actions
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  addFeedback: (fb: Omit<FeedbackRecord, 'id' | 'createdAt'>) => Promise<string>;
  deleteFeedback: (id: string) => Promise<void>;
  deleteTrainer: (userId: string) => Promise<void>;
  
  // Notification Actions
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Data Seeding
  reseedData: () => Promise<void>;
  isSeeding: boolean;

  loadingData: boolean;
}

import { 
  validateTrainerManagerOwnership,
  isManagerAuthorizedForTrainer,
  filterTrainersByManagerOwnership,
  filterClassesByManagerOwnership,
  filterTasksByManagerOwnership,
  filterProjectsByManagerOwnership,
  filterDailyUpdatesByManagerOwnership,
  filterFeedbackByManagerOwnership,
  filterAttendanceByManagerOwnership,
  filterTargetsByManagerOwnership,
  filterAlertsByManagerOwnership,
  filterHolisticContributionsByManagerOwnership,
  filterTeamsByManagerOwnership,
  OwnershipValidationResult
} from '../lib/permissionChecker';

export const isTraineeMappedToManager = (trainee: UserProfile, manager: UserProfile | null): boolean => {
  return isManagerAuthorizedForTrainer(trainee, manager);
};

export { validateTrainerManagerOwnership };

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isManager } = useAuth();
  
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [holisticContributions, setHolisticContributions] = useState<HolisticContributionRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [rawTrainers, setRawTrainers] = useState<UserProfile[]>([]);
  const [allManagers, setAllManagers] = useState<UserProfile[]>([]);
  const [managerChangeRequests, setManagerChangeRequests] = useState<ManagerChangeRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [performanceWeights, setPerformanceWeights] = useState<PerformanceWeights>(DEFAULT_WEIGHTS);
  const [metricConfig, setMetricConfig] = useState<MetricCalculationConfig>(() => {
    try {
      const saved = localStorage.getItem('ENTERPRISE_METRIC_CALCULATION_CONFIG');
      if (saved) {
        return { ...DEFAULT_METRIC_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_METRIC_CONFIG;
  });
  const [loadingData, setLoadingData] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!userProfile) {
      setLoadingData(false);
      return;
    }

    // 1. Teams
    const unsubTeams = onSnapshot(
      collection(db, 'teams'), 
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Team));
        setTeams(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'teams');
      }
    );

    // 2. All Users (for manager team roster and directory)
    const unsubUsers = onSnapshot(
      collection(db, 'users'), 
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
        setRawTrainers(list.filter(u => u.role === 'TRAINER'));
        setAllManagers(list.filter(u => u.role === 'MANAGER'));
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    );

    // 3. Classes
    const classesRef = collection(db, 'classes');
    const unsubClasses = onSnapshot(
      classesRef, 
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as ClassItem));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setClasses(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'classes');
      }
    );

    // 4. Tasks
    const tasksRef = collection(db, 'tasks');
    const unsubTasks = onSnapshot(
      tasksRef, 
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as TaskItem));
        setTasks(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'tasks');
      }
    );

    // 5. Projects
    const projectsRef = collection(db, 'projects');
    const unsubProjects = onSnapshot(
      projectsRef, 
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as ProjectItem));
        setProjects(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'projects');
      }
    );

    // 6. Daily Updates
    const updatesRef = collection(db, 'dailyUpdates');
    const unsubUpdates = onSnapshot(
      updatesRef, 
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as DailyUpdate));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setDailyUpdates(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'dailyUpdates');
      }
    );

    // 7. Feedback
    const feedbackRef = collection(db, 'feedback');
    const unsubFeedback = onSnapshot(
      feedbackRef, 
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as FeedbackRecord));
        setFeedbacks(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'feedback');
      }
    );

    // 8. Attendance
    const attRef = collection(db, 'attendance');
    const unsubAtt = onSnapshot(
      attRef, 
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord));
        setAttendanceList(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'attendance');
      }
    );

    // 9. Targets
    const targetsRef = collection(db, 'targets');
    const unsubTargets = onSnapshot(
      targetsRef, 
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as TargetItem));
        setTargets(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'targets');
      }
    );

    // 10. Alerts
    const alertsRef = collection(db, 'alerts');
    const unsubAlerts = onSnapshot(
      alertsRef, 
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as AlertItem));
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setAlerts(list);
        setLoadingData(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'alerts');
        setLoadingData(false);
      }
    );

    // 11. Holistic Guidance & Invisible Contributions
    const hcRef = collection(db, 'holisticContributions');
    const unsubHC = onSnapshot(
      hcRef,
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as HolisticContributionRecord));
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setHolisticContributions(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'holisticContributions');
      }
    );

    // 12. Manager Change Requests
    const mcrRef = collection(db, 'manager_change_requests');
    const unsubMCR = onSnapshot(
      mcrRef,
      (snap) => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as ManagerChangeRequest));
        list.sort((a, b) => (b.requestDate || b.createdAt || '').localeCompare(a.requestDate || a.createdAt || ''));
        setManagerChangeRequests(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'manager_change_requests');
      }
    );

    // Load data from Supabase
    const loadSupabaseData = async () => {
      try {
        const [supaProfiles, supaUpdates, supaClasses, supaTasks, supaProjects, supaWeights] = await Promise.all([
          fetchAllProfilesSupa(),
          fetchDailyUpdatesSupa(),
          fetchClassesSupa(),
          fetchTasksSupa(),
          fetchProjectsSupa(),
          fetchPerformanceWeightsSupa(),
        ]);

        if (supaProfiles && supaProfiles.length > 0) {
          setRawTrainers(supaProfiles.filter(u => u.role === 'TRAINER'));
        }
        if (supaUpdates && supaUpdates.length > 0) {
          setDailyUpdates(supaUpdates);
        }
        if (supaClasses && supaClasses.length > 0) {
          setClasses(supaClasses);
        }
        if (supaTasks && supaTasks.length > 0) {
          setTasks(supaTasks);
        }
        if (supaProjects && supaProjects.length > 0) {
          setProjects(supaProjects);
        }
        if (supaWeights) {
          setPerformanceWeights(supaWeights);
        }
      } catch (err) {
        console.info('[Supabase] Initial fetch notice:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadSupabaseData();

    // Supabase Realtime channel for live multi-user synchronization
    const realtimeChannel = supabase
      .channel('supabase-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_updates' }, () => {
        fetchDailyUpdatesSupa().then(data => { if (data.length > 0) setDailyUpdates(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
        fetchClassesSupa().then(data => { if (data.length > 0) setClasses(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasksSupa().then(data => { if (data.length > 0) setTasks(data); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchAllProfilesSupa().then(data => { if (data.length > 0) setRawTrainers(data.filter(u => u.role === 'TRAINER')); });
      })
      .subscribe();

    // Safety timer to prevent perpetual loading screen in offline mode or initial connection latency
    const fallbackTimeout = setTimeout(() => {
      setLoadingData(false);
    }, 1500);

    return () => {
      clearTimeout(fallbackTimeout);
      realtimeChannel.unsubscribe();
      unsubTeams();
      unsubUsers();
      unsubClasses();
      unsubTasks();
      unsubProjects();
      unsubUpdates();
      unsubFeedback();
      unsubAtt();
      unsubTargets();
      unsubAlerts();
      unsubHC();
      unsubMCR();
    };
  }, [userProfile?.uid, isManager]);

  // Filter trainers explicitly validated by centralized permission checker
  const allTrainers = useMemo(() => {
    return filterTrainersByManagerOwnership(rawTrainers, userProfile);
  }, [rawTrainers, userProfile]);

  // Persistent Selected Trainee State across all Manager Views
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>('');

  // Keep selectedTraineeId valid when allTrainers changes
  useEffect(() => {
    if (allTrainers && allTrainers.length > 0) {
      if (!selectedTraineeId || !allTrainers.some(t => t.uid === selectedTraineeId)) {
        setSelectedTraineeId(allTrainers[0].uid);
      }
    } else {
      setSelectedTraineeId('');
    }
  }, [allTrainers, selectedTraineeId]);

  // Set of mapped trainer UIDs for scoped manager views
  const mappedTrainerUidSet = useMemo(() => {
    return new Set((allTrainers || []).map(t => t.uid));
  }, [allTrainers]);

  // Scoped datasets strictly validated against active manager ownership
  const contextualClasses = useMemo(() => {
    return filterClassesByManagerOwnership(classes, userProfile, mappedTrainerUidSet);
  }, [classes, userProfile, mappedTrainerUidSet]);

  const contextualTasks = useMemo(() => {
    return filterTasksByManagerOwnership(tasks, userProfile, mappedTrainerUidSet);
  }, [tasks, userProfile, mappedTrainerUidSet]);

  const contextualProjects = useMemo(() => {
    return filterProjectsByManagerOwnership(projects, userProfile, mappedTrainerUidSet, allTrainers);
  }, [projects, userProfile, mappedTrainerUidSet, allTrainers]);

  const contextualDailyUpdates = useMemo(() => {
    return filterDailyUpdatesByManagerOwnership(dailyUpdates, userProfile, mappedTrainerUidSet);
  }, [dailyUpdates, userProfile, mappedTrainerUidSet]);

  const contextualFeedbacks = useMemo(() => {
    return filterFeedbackByManagerOwnership(feedbacks, userProfile, mappedTrainerUidSet);
  }, [feedbacks, userProfile, mappedTrainerUidSet]);

  const contextualAttendanceList = useMemo(() => {
    return filterAttendanceByManagerOwnership(attendanceList, userProfile, mappedTrainerUidSet);
  }, [attendanceList, userProfile, mappedTrainerUidSet]);

  const contextualTargets = useMemo(() => {
    return filterTargetsByManagerOwnership(targets, userProfile, mappedTrainerUidSet);
  }, [targets, userProfile, mappedTrainerUidSet]);

  const contextualAlerts = useMemo(() => {
    return filterAlertsByManagerOwnership(alerts, userProfile, mappedTrainerUidSet);
  }, [alerts, userProfile, mappedTrainerUidSet]);

  const contextualHolisticContributions = useMemo(() => {
    return filterHolisticContributionsByManagerOwnership(holisticContributions, userProfile, mappedTrainerUidSet, allTrainers);
  }, [holisticContributions, userProfile, mappedTrainerUidSet, allTrainers]);

  // Contextual teams scoped to manager's department
  const contextualTeams = useMemo(() => {
    return filterTeamsByManagerOwnership(teams, userProfile);
  }, [teams, userProfile]);

  const userClasses = userProfile ? (classes || []).filter(c => c.userId === userProfile.uid) : [];
  const userTasks = userProfile ? (tasks || []).filter(t => t.assignedTo === userProfile.uid) : [];
  const userProjects = userProfile ? (projects || []).filter(p => p.assignedTo === userProfile.uid) : [];
  const userFeedbacks = userProfile ? (feedbacks || []).filter(f => f.userId === userProfile.uid) : [];
  const userAttendance = userProfile ? (attendanceList || []).filter(a => a.userId === userProfile.uid) : [];
  const userDailyUpdates = userProfile ? (dailyUpdates || []).filter(u => {
    if (u.userId && u.userId === userProfile.uid) return true;
    if (userProfile.employeeId && u.employeeId && u.employeeId.toUpperCase() === userProfile.employeeId.toUpperCase()) return true;
    if (userProfile.companyEmail && ((u as any).userEmail || (u as any).email || (u as any).companyEmail) && ((u as any).userEmail || (u as any).email || (u as any).companyEmail).toLowerCase() === userProfile.companyEmail.toLowerCase()) return true;
    if (userProfile.fullName && u.employeeName && u.employeeName.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase()) return true;
    return false;
  }) : [];

  const userHolisticContributions = userProfile ? (holisticContributions || []).filter(h => {
    if (h.userId && h.userId === userProfile.uid) return true;
    if (userProfile.employeeId && h.employeeId && h.employeeId.toUpperCase() === userProfile.employeeId.toUpperCase()) return true;
    if (userProfile.fullName && h.employeeName && h.employeeName.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase()) return true;
    return false;
  }) : [];

  const currentMetrics = calculateTrainerMetrics(
    userClasses,
    userTasks,
    userProjects,
    userFeedbacks,
    userAttendance,
    90,
    userDailyUpdates
  );

  const currentOverallScore = computeOverallScore(currentMetrics, performanceWeights);

  // Auto evaluate dynamic alerts
  useEffect(() => {
    if (!userProfile || isManager) return;
    const dynamicAlerts = evaluateAlerts(
      userProfile,
      userTasks,
      userProjects,
      (dailyUpdates || []).filter(u => u.userId === userProfile.uid),
      currentMetrics,
      currentOverallScore
    );

    // Sync any newly detected alerts to Firestore if not already present
    dynamicAlerts.forEach(async (newAlert) => {
      const exists = alerts.some(a => a.id === newAlert.id || (a.entityId === newAlert.entityId && a.type === newAlert.type));
      if (!exists) {
        try {
          await setDoc(doc(db, 'alerts', newAlert.id), newAlert);
        } catch (e) {
          // Silent ignore
        }
      }
    });
  }, [userProfile?.uid, userTasks.length, userProjects.length, currentOverallScore]);

  // Actions
  const addDailyUpdate = async (update: Omit<DailyUpdate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = doc(collection(db, 'dailyUpdates'));
      const now = new Date().toISOString();
      const newDoc: DailyUpdate = {
        ...update,
        id: docRef.id,
        userId: update.userId || userProfile?.uid || '',
        employeeId: update.employeeId || userProfile?.employeeId || '',
        employeeName: update.employeeName || userProfile?.fullName || '',
        userEmail: (update as any).userEmail || userProfile?.companyEmail || '',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(docRef, cleanFirestoreData(newDoc));
      setDailyUpdates(prev => {
        const filtered = prev.filter(u => u.id !== docRef.id);
        const next = [newDoc, ...filtered];
        next.sort((a, b) => b.date.localeCompare(a.date));
        return next;
      });

      // Synchronize to Supabase daily_updates
      createDailyUpdateSupa(update).catch(err => {
        console.info('[Supabase] addDailyUpdate notice:', err);
      });

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'dailyUpdates');
      throw error;
    }
  };

  const updateDailyUpdate = async (id: string, data: Partial<DailyUpdate>) => {
    try {
      const docRef = doc(db, 'dailyUpdates', id);
      const updatedAt = new Date().toISOString();
      await setDoc(docRef, cleanFirestoreData({
        ...data,
        id,
        updatedAt,
      }), { merge: true });
      setDailyUpdates(prev => {
        const next = prev.map(item => item.id === id ? ({ ...item, ...data, id, updatedAt } as DailyUpdate) : item);
        next.sort((a, b) => b.date.localeCompare(a.date));
        return next;
      });

      // Synchronize to Supabase daily_updates
      updateDailyUpdateSupa(id, data).catch(err => {
        console.info('[Supabase] updateDailyUpdate notice:', err);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `dailyUpdates/${id}`);
      throw error;
    }
  };

  const deleteDailyUpdate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'dailyUpdates', id));
      setDailyUpdates(prev => prev.filter(u => u.id !== id));

      // Synchronize to Supabase daily_updates
      deleteDailyUpdateSupa(id).catch(err => {
        console.info('[Supabase] deleteDailyUpdate notice:', err);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `dailyUpdates/${id}`);
      throw error;
    }
  };

  const addHolisticContribution = async (item: Omit<HolisticContributionRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = doc(collection(db, 'holisticContributions'));
      const now = new Date().toISOString();
      const newDoc: HolisticContributionRecord = {
        ...item,
        id: docRef.id,
        userId: item.userId || userProfile?.uid || '',
        employeeId: item.employeeId || userProfile?.employeeId || '',
        employeeName: item.employeeName || userProfile?.fullName || '',
        managerId: item.managerId || userProfile?.managerId || '',
        managerName: item.managerName || userProfile?.managerName || '',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(docRef, cleanFirestoreData(newDoc));
      setHolisticContributions(prev => {
        const filtered = prev.filter(h => h.id !== docRef.id);
        const next = [newDoc, ...filtered];
        next.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        return next;
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'holisticContributions');
      throw error;
    }
  };

  const updateHolisticContribution = async (id: string, data: Partial<HolisticContributionRecord>) => {
    try {
      const docRef = doc(db, 'holisticContributions', id);
      const updatedAt = new Date().toISOString();
      await setDoc(docRef, cleanFirestoreData({
        ...data,
        id,
        updatedAt,
      }), { merge: true });
      setHolisticContributions(prev => {
        const next = prev.map(h => h.id === id ? ({ ...h, ...data, id, updatedAt } as HolisticContributionRecord) : h);
        next.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        return next;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `holisticContributions/${id}`);
      throw error;
    }
  };

  const deleteHolisticContribution = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'holisticContributions', id));
      setHolisticContributions(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `holisticContributions/${id}`);
      throw error;
    }
  };

  const addClass = async (classItem: Omit<ClassItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const docRef = doc(collection(db, 'classes'));
    const now = new Date().toISOString();
    const newDoc: ClassItem = {
      ...classItem,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, cleanFirestoreData(newDoc));

    // Synchronize to Supabase classes
    createClassSupa(classItem).catch(err => {
      console.info('[Supabase] addClass notice:', err);
    });

    return docRef.id;
  };

  const updateClass = async (id: string, data: Partial<ClassItem>) => {
    await updateDoc(doc(db, 'classes', id), cleanFirestoreData({
      ...data,
      updatedAt: new Date().toISOString(),
    }));
  };

  const deleteClass = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'classes', id));
      setClasses(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `classes/${id}`);
      throw error;
    }
  };

  const updateTaskProgress = async (
    id: string, 
    completionPercentage: number, 
    status?: TaskItem['status'], 
    remarks?: string
  ) => {
    let resolvedStatus = status;
    if (!resolvedStatus) {
      if (completionPercentage >= 100) resolvedStatus = 'Completed';
      else if (completionPercentage > 0) resolvedStatus = 'In Progress';
      else resolvedStatus = 'Not Started';
    }

    const payload: any = {
      completionPercentage,
      status: resolvedStatus,
      updatedAt: new Date().toISOString(),
    };
    if (remarks !== undefined) payload.remarks = remarks;

    await updateDoc(doc(db, 'tasks', id), cleanFirestoreData(payload));

    // Synchronize to Supabase tasks
    updateTaskSupa(id, { completionPercentage, status: resolvedStatus, remarks }).catch(err => {
      console.info('[Supabase] updateTask notice:', err);
    });
  };

  const createTask = async (task: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const docRef = doc(collection(db, 'tasks'));
    const now = new Date().toISOString();
    const newDoc: TaskItem = {
      ...task,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, cleanFirestoreData(newDoc));
    return docRef.id;
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
      throw error;
    }
  };

  const createProject = async (project: Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const docRef = doc(collection(db, 'projects'));
    const now = new Date().toISOString();
    const newDoc: ProjectItem = {
      ...project,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(docRef, cleanFirestoreData(newDoc));
    return docRef.id;
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
      throw error;
    }
  };

  const updateProjectMilestone = async (
    projectId: string, 
    milestoneId: string, 
    progress: number, 
    status: 'Not Started' | 'In Progress' | 'Completed'
  ) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    const defaultStages = [
      'Planning',
      'Research',
      'Requirement Analysis',
      'Design',
      'Architecture & Prototyping',
      'Development',
      'Testing',
      'Deployment',
      'Completed',
    ] as const;

    let milestones = proj.milestones && proj.milestones.length > 0 
      ? [...proj.milestones] 
      : defaultStages.map((st, i) => ({
          id: `ms_${projectId}_${i}`,
          projectId,
          title: `${st} Deliverable`,
          stage: st,
          status: (proj.currentStage === st ? 'In Progress' : 'Not Started') as any,
          progress: proj.currentStage === st ? 50 : 0,
          order: i + 1,
        }));

    let idx = milestones.findIndex(m => m.id === milestoneId);
    if (idx === -1) {
      idx = milestones.findIndex(m => 
        milestoneId.toLowerCase().includes(m.stage.toLowerCase()) || 
        milestoneId.endsWith(`_${m.order - 1}`) ||
        milestoneId.endsWith(`_${m.order}`)
      );
    }

    if (idx !== -1) {
      milestones[idx] = {
        ...milestones[idx],
        progress,
        status,
        completedAt: status === 'Completed' ? new Date().toISOString() : undefined,
      };

      // Calculate total overall percentage across the 9 stages
      const totalProgress = milestones.reduce((sum, m) => sum + (m.progress || 0), 0);
      const overall = Math.round(totalProgress / Math.max(1, milestones.length));

      let currentStatus: ProjectItem['currentStatus'] = proj.currentStatus;
      if (overall >= 100) currentStatus = 'Completed';
      else if (currentStatus === 'Completed' && overall < 100) currentStatus = 'On Track';

      // Auto update active development stage if in progress
      let activeStage = proj.currentStage;
      if (status === 'In Progress') {
        activeStage = milestones[idx].stage;
      } else if (status === 'Completed' && idx < milestones.length - 1 && overall < 100) {
        // If this stage completed and next stage is not started, advance stage pointer
        if (milestones[idx + 1].status === 'Not Started') {
          milestones[idx + 1].status = 'In Progress';
          activeStage = milestones[idx + 1].stage;
        }
      }

      await updateDoc(doc(db, 'projects', projectId), cleanFirestoreData({
        milestones,
        overallCompletionPercentage: overall,
        currentStatus,
        currentStage: activeStage,
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const updateProject = async (id: string, data: Partial<ProjectItem>) => {
    await updateDoc(doc(db, 'projects', id), cleanFirestoreData({
      ...data,
      updatedAt: new Date().toISOString(),
    }));
  };

  const addTarget = async (target: Omit<TargetItem, 'id' | 'createdAt'>) => {
    const docRef = doc(collection(db, 'targets'));
    const newDoc: TargetItem = {
      ...target,
      id: docRef.id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, cleanFirestoreData(newDoc));
    return docRef.id;
  };

  const updateTargetProgress = async (id: string, currentValue: number) => {
    const target = targets.find(t => t.id === id);
    if (!target) return;
    const isAchieved = currentValue >= target.targetValue;
    await updateDoc(doc(db, 'targets', id), cleanFirestoreData({
      currentValue,
      status: isAchieved ? 'Achieved' : 'In Progress',
    }));
  };

  const deleteTarget = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'targets', id));
      setTargets(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `targets/${id}`);
      throw error;
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    await updateDoc(doc(db, 'alerts', alertId), cleanFirestoreData({
      status: 'ACKNOWLEDGED',
    }));
  };

  const resolveAlert = async (alertId: string) => {
    await updateDoc(doc(db, 'alerts', alertId), cleanFirestoreData({
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
    }));
  };

  const addFeedback = async (fb: Omit<FeedbackRecord, 'id' | 'createdAt'>) => {
    const docRef = doc(collection(db, 'feedback'));
    const newDoc: FeedbackRecord = {
      ...fb,
      id: docRef.id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, cleanFirestoreData(newDoc));
    return docRef.id;
  };

  const deleteFeedback = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'feedback', id));
      setFeedbacks(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `feedback/${id}`);
      throw error;
    }
  };

  const deleteTrainer = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      // Remove from trainer list state immediately
      setRawTrainers(prev => prev.filter(t => t.uid !== userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      throw error;
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const updateMetricConfig = async (newConfig: MetricCalculationConfig) => {
    setMetricConfig(newConfig);
    try {
      localStorage.setItem('ENTERPRISE_METRIC_CALCULATION_CONFIG', JSON.stringify(newConfig));
    } catch (e) {
      console.error('Failed to persist metric config:', e);
    }
  };

  const reseedData = async () => {
    setIsSeeding(true);
    try {
      await seedEnterpriseData();
    } catch (e) {
      console.error('Reseed error:', e);
    } finally {
      setIsSeeding(false);
    }
  };

  const submitManagerChangeRequest = async (
    req: Omit<ManagerChangeRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'requestDate'>
  ): Promise<string> => {
    try {
      // Prevent duplicate pending requests for the same instructor
      const existingPending = managerChangeRequests.find(
        r => r.instructorId === req.instructorId && r.status === 'PENDING'
      );
      if (existingPending) {
        throw new Error('A manager change request is already pending review. Please wait for your current manager to process it before submitting another.');
      }

      const docRef = doc(collection(db, 'manager_change_requests'));
      const now = new Date().toISOString();
      const newDoc: ManagerChangeRequest = {
        ...req,
        id: docRef.id,
        status: 'PENDING',
        requestDate: now,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(docRef, cleanFirestoreData(newDoc));

      // Create notification for current manager
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, cleanFirestoreData({
          id: notifRef.id,
          userId: req.currentManagerId,
          title: 'New Manager Change Request',
          message: `${req.instructorName} (${req.instructorEmployeeId}) has requested a manager change to ${req.requestedManagerName}.`,
          type: 'PERFORMANCE',
          read: false,
          createdAt: now,
        }));
      } catch (ne) {
        console.warn('Failed to send manager notification:', ne);
      }

      setManagerChangeRequests(prev => [newDoc, ...prev.filter(r => r.id !== docRef.id)]);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'manager_change_requests');
      throw error;
    }
  };

  const approveManagerChangeRequest = async (requestId: string, notes?: string): Promise<void> => {
    try {
      const targetReq = managerChangeRequests.find(r => r.id === requestId);
      if (!targetReq) throw new Error('Manager change request not found');

      const now = new Date().toISOString();
      const updatedReq: Partial<ManagerChangeRequest> = {
        status: 'APPROVED',
        reviewedDate: now,
        reviewNotes: notes?.trim() || 'Approved by manager',
        updatedAt: now,
      };

      // 1. Update the request document in manager_change_requests
      await setDoc(doc(db, 'manager_change_requests', requestId), cleanFirestoreData(updatedReq), { merge: true });

      // 2. Update the instructor's user profile in 'users' collection
      const instructorRef = doc(db, 'users', targetReq.instructorId);
      const instructorSnap = await getDoc(instructorRef);
      const existingInstructor = instructorSnap.exists() ? (instructorSnap.data() as UserProfile) : null;

      const profileUpdate: Partial<UserProfile> = {
        managerId: targetReq.requestedManagerId,
        managerName: targetReq.requestedManagerName,
        managerEmail: targetReq.requestedManagerEmail,
        updatedAt: now,
      };

      await setDoc(instructorRef, cleanFirestoreData(profileUpdate), { merge: true });

      // 3. Update dedicated credentials table (trainer_credentials)
      const credUpdate: any = {
        managerId: targetReq.requestedManagerId,
        managerName: targetReq.requestedManagerName,
        managerEmail: targetReq.requestedManagerEmail,
        updatedAt: now,
      };
      if (targetReq.instructorEmail) {
        await setDoc(doc(db, 'trainer_credentials', targetReq.instructorEmail.toLowerCase()), cleanFirestoreData(credUpdate), { merge: true });
        await setDoc(doc(db, 'user_credentials', targetReq.instructorEmail.toLowerCase()), cleanFirestoreData(credUpdate), { merge: true });
      }
      if (targetReq.instructorEmployeeId) {
        await setDoc(doc(db, 'trainer_credentials', targetReq.instructorEmployeeId.toLowerCase()), cleanFirestoreData(credUpdate), { merge: true });
        await setDoc(doc(db, 'trainer_credentials', targetReq.instructorEmployeeId.toUpperCase()), cleanFirestoreData(credUpdate), { merge: true });
        await setDoc(doc(db, 'user_credentials', targetReq.instructorEmployeeId.toLowerCase()), cleanFirestoreData(credUpdate), { merge: true });
        await setDoc(doc(db, 'user_credentials', targetReq.instructorEmployeeId.toUpperCase()), cleanFirestoreData(credUpdate), { merge: true });
      }

      // 4. Update Supabase profile
      try {
        await upsertProfileSupa({
          ...(existingInstructor || {}),
          employeeId: targetReq.instructorEmployeeId,
          companyEmail: targetReq.instructorEmail,
          managerId: targetReq.requestedManagerId,
          managerName: targetReq.requestedManagerName,
        });
      } catch (se) {
        console.warn('Supabase upsert notice on manager change:', se);
      }

      // 5. Notify the instructor of approval
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, cleanFirestoreData({
          id: notifRef.id,
          userId: targetReq.instructorId,
          title: 'Manager Change Request Approved',
          message: `Your request to transfer to manager ${targetReq.requestedManagerName} has been approved. Your profile mapping is now updated.`,
          type: 'PERFORMANCE',
          read: false,
          createdAt: now,
        }));
      } catch (ne) {
        console.warn('Failed to send instructor notification:', ne);
      }

      // Update local state
      setManagerChangeRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updatedReq } : r));
      setRawTrainers(prev => prev.map(t => t.uid === targetReq.instructorId ? {
        ...t,
        managerId: targetReq.requestedManagerId,
        managerName: targetReq.requestedManagerName,
        managerEmail: targetReq.requestedManagerEmail,
        updatedAt: now,
      } : t));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `manager_change_requests/${requestId}`);
      throw error;
    }
  };

  const rejectManagerChangeRequest = async (requestId: string, notes?: string): Promise<void> => {
    try {
      const targetReq = managerChangeRequests.find(r => r.id === requestId);
      if (!targetReq) throw new Error('Manager change request not found');

      const now = new Date().toISOString();
      const updatedReq: Partial<ManagerChangeRequest> = {
        status: 'REJECTED',
        reviewedDate: now,
        reviewNotes: notes?.trim() || 'Request rejected by manager',
        updatedAt: now,
      };

      await setDoc(doc(db, 'manager_change_requests', requestId), cleanFirestoreData(updatedReq), { merge: true });

      // Notify the instructor of the decision
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, cleanFirestoreData({
          id: notifRef.id,
          userId: targetReq.instructorId,
          title: 'Manager Change Request Rejected',
          message: `Your request to transfer to manager ${targetReq.requestedManagerName} was rejected by ${targetReq.currentManagerName}.${notes ? ` Notes: "${notes}"` : ''} Your existing manager mapping has been retained.`,
          type: 'ALERT',
          read: false,
          createdAt: now,
        }));
      } catch (ne) {
        console.warn('Failed to send rejection notification:', ne);
      }

      setManagerChangeRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updatedReq } : r));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `manager_change_requests/${requestId}`);
      throw error;
    }
  };

  return (
    <DataContext.Provider
      value={{
        classes: contextualClasses,
        tasks: contextualTasks,
        projects: contextualProjects,
        dailyUpdates: contextualDailyUpdates,
        feedbacks: contextualFeedbacks,
        attendanceList: contextualAttendanceList,
        targets: contextualTargets,
        alerts: contextualAlerts,
        notifications,
        allTrainers,
        allRegisteredTrainers: rawTrainers,
        allManagers,
        teams: contextualTeams,
        holisticContributions: contextualHolisticContributions,
        userHolisticContributions,
        managerChangeRequests,
        selectedTraineeId,
        setSelectedTraineeId,
        currentMetrics,
        currentOverallScore,
        performanceWeights,
        setPerformanceWeights,
        metricConfig,
        updateMetricConfig,
        addDailyUpdate,
        updateDailyUpdate,
        deleteDailyUpdate,
        addHolisticContribution,
        updateHolisticContribution,
        deleteHolisticContribution,
        addClass,
        updateClass,
        deleteClass,
        updateTaskProgress,
        createTask,
        deleteTask,
        createProject,
        updateProjectMilestone,
        updateProject,
        deleteProject,
        addTarget,
        updateTargetProgress,
        deleteTarget,
        submitManagerChangeRequest,
        approveManagerChangeRequest,
        rejectManagerChangeRequest,
        acknowledgeAlert,
        resolveAlert,
        addFeedback,
        deleteFeedback,
        deleteTrainer,
        markNotificationRead,
        markAllNotificationsRead,
        reseedData,
        isSeeding,
        loadingData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
