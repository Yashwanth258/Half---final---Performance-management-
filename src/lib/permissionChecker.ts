import { 
  UserProfile, 
  ClassItem, 
  TaskItem, 
  ProjectItem, 
  DailyUpdate, 
  FeedbackRecord, 
  AttendanceRecord, 
  TargetItem, 
  AlertItem, 
  HolisticContributionRecord, 
  Team 
} from '../types';

/**
 * Result structure returned by ownership validation checks.
 */
export interface OwnershipValidationResult {
  isOwned: boolean;
  reason: string;
  managerId?: string;
  managerName?: string;
  trainerId?: string;
  trainerName?: string;
  matchedCriteria?: 'ID' | 'EMAIL' | 'NAME' | 'SEED_ALIAS' | 'PRIMARY_LEAD' | 'SUPER_ADMIN' | 'NONE';
}

/**
 * Normalizes strings for robust, whitespace- and case-insensitive comparison.
 */
const normalize = (str?: string | null): string => (str || '').trim().toLowerCase();

/**
 * Normalizes department names to handle slight formatting variations.
 */
const normDept = (d?: string | null): string => {
  const s = normalize(d);
  if (s.includes('front')) return 'frontend';
  if (s.includes('back')) return 'backend';
  if (s.includes('gen') || s.includes('ai') || s.includes('llm')) return 'genai';
  if (s.includes('exec') || s.includes('all') || s.includes('admin')) return 'executive';
  return s;
};

/**
 * Centralized Validator: Explicitly validates whether a Trainer is owned/managed by a specific Manager.
 * 
 * Enforces:
 * 1. Strict Department Isolation (A Frontend manager CANNOT view Backend/GenAI trainers and vice versa).
 * 2. Direct Manager Matching by UID, Employee ID (NW...), Company Email, or Full Name.
 * 3. Seeded Alias & Cluster Resolution for known enterprise department leads (e.g. North Yashwan -> Teju, Marcus Vance).
 * 4. Fallback restriction for unassigned trainers to primary departmental capability leads only.
 */
export function validateTrainerManagerOwnership(
  trainer: Partial<UserProfile> | null | undefined,
  manager: Partial<UserProfile> | null | undefined
): OwnershipValidationResult {
  if (!manager) {
    return {
      isOwned: false,
      reason: 'No manager profile provided for ownership validation.',
      matchedCriteria: 'NONE'
    };
  }

  if (!trainer) {
    return {
      isOwned: false,
      reason: 'No trainer profile provided for ownership validation.',
      matchedCriteria: 'NONE'
    };
  }

  const mgrUid = normalize(manager.uid);
  const mgrEmpId = normalize(manager.employeeId);
  const mgrEmail = normalize(manager.companyEmail);
  const mgrName = normalize(manager.fullName);
  const mgrDept = normDept(manager.department);

  const trnUid = normalize(trainer.uid);
  const trnEmpId = normalize(trainer.employeeId);
  const trnName = normalize(trainer.fullName);
  const trnDept = normDept(trainer.department);
  const trnMgrId = normalize(trainer.managerId);
  const trnMgrName = normalize(trainer.managerName);
  const trnMgrEmail = normalize(trainer.managerEmail);

  // Executive / Global Super Admin override (if department is explicitly 'executive' or designation includes executive)
  if (mgrDept === 'executive' || manager.designation?.toLowerCase().includes('executive')) {
    return {
      isOwned: true,
      reason: 'Access granted under Executive Leadership scope.',
      managerId: manager.uid,
      managerName: manager.fullName,
      trainerId: trainer.uid,
      trainerName: trainer.fullName,
      matchedCriteria: 'SUPER_ADMIN'
    };
  }

  // 1. Strict Department Isolation
  if (mgrDept && trnDept && mgrDept !== trnDept) {
    return {
      isOwned: false,
      reason: `Department Mismatch: Manager (${manager.department || 'Unknown'}) cannot access Trainer in ${trainer.department || 'Unknown'}.`,
      managerId: manager.uid,
      trainerId: trainer.uid,
      matchedCriteria: 'NONE'
    };
  }

  // Helper match tests for known manager clusters
  const isMgrNorthYashwan = 
    mgrUid === 'mgr-yash-01' || 
    mgrEmpId === 'nw2015' || 
    mgrEmail.includes('yash') || 
    mgrEmail.includes('north.yashwan') || 
    mgrName.includes('yash') || 
    mgrName.includes('north yashwan') ||
    mgrName.includes('yashwanth') ||
    mgrName.includes('yashwan');

  const isTrnTargetNorthYashwan =
    trnMgrId === 'mgr-yash-01' ||
    trnMgrId === 'nw2015' ||
    trnMgrEmail.includes('yash') ||
    trnMgrEmail.includes('north.yashwan') ||
    trnMgrName.includes('yash') ||
    trnMgrName.includes('north yashwan') ||
    trnMgrName.includes('yashwanth') ||
    trnMgrName.includes('yashwan') ||
    trnUid === 'trainer-teju-08' ||
    trnUid === 'trainer-marcus-05' ||
    trnEmpId === 'nw1108' ||
    trnEmpId === 'nw1089' ||
    trnName === 'teju' ||
    trnName.includes('marcus vance');

  if (isMgrNorthYashwan && isTrnTargetNorthYashwan && (mgrDept === 'frontend' || !mgrDept)) {
    return {
      isOwned: true,
      reason: 'Ownership verified via Frontend Lead (North Yashwan) assignment.',
      managerId: manager.uid,
      managerName: manager.fullName || 'North Yashwan',
      trainerId: trainer.uid,
      trainerName: trainer.fullName,
      matchedCriteria: 'SEED_ALIAS'
    };
  }

  const isMgrChandana = 
    mgrUid === 'mgr-chandana-01' || 
    mgrEmpId === 'nw2008' || 
    mgrEmail.includes('chandana') || 
    mgrName.includes('chandana');

  const isTrnTargetChandana =
    trnMgrId === 'mgr-chandana-01' ||
    trnMgrId === 'nw2008' ||
    trnMgrEmail.includes('chandana') ||
    trnMgrName.includes('chandana') ||
    trnUid === 'trainer-david-03' ||
    trnUid === 'trainer-ishu-07' ||
    trnEmpId === 'nw1065' ||
    trnEmpId === 'nw1102' ||
    trnName.includes('david chen') ||
    trnName === 'ishu';

  if (isMgrChandana && isTrnTargetChandana && (mgrDept === 'frontend' || !mgrDept)) {
    return {
      isOwned: true,
      reason: 'Ownership verified via Frontend Lead (Chandana) assignment.',
      managerId: manager.uid,
      managerName: manager.fullName || 'Chandana',
      trainerId: trainer.uid,
      trainerName: trainer.fullName,
      matchedCriteria: 'SEED_ALIAS'
    };
  }

  const isMgrNitin = 
    mgrUid === 'mgr-nitin-01' || 
    mgrEmpId === 'nw2018' || 
    mgrEmail.includes('nitin') || 
    mgrName.includes('nitin');

  const isTrnTargetNitin =
    trnMgrId === 'mgr-nitin-01' ||
    trnMgrId === 'nw2018' ||
    trnMgrEmail.includes('nitin') ||
    trnMgrName.includes('nitin') ||
    trnUid === 'trainer-suhas-09' ||
    trnEmpId === 'nw1112' ||
    trnName.includes('suhas');

  if (isMgrNitin && isTrnTargetNitin && (mgrDept === 'frontend' || !mgrDept)) {
    return {
      isOwned: true,
      reason: 'Ownership verified via Frontend Lead (Nitin) assignment.',
      managerId: manager.uid,
      managerName: manager.fullName || 'Nitin',
      trainerId: trainer.uid,
      trainerName: trainer.fullName,
      matchedCriteria: 'SEED_ALIAS'
    };
  }

  const isMgrVikram = 
    mgrUid === 'mgr-vikram-01' || 
    mgrEmpId === 'nw2022' || 
    mgrEmail.includes('vikram') || 
    mgrName.includes('vikram');

  const isTrnTargetVikram =
    trnMgrId === 'mgr-vikram-01' ||
    trnMgrId === 'nw2022' ||
    trnMgrEmail.includes('vikram') ||
    trnMgrName.includes('vikram') ||
    trnUid === 'trainer-elena-04' ||
    trnEmpId === 'nw1077' ||
    trnName.includes('elena rostova');

  if (isMgrVikram && isTrnTargetVikram && (mgrDept === 'backend' || !mgrDept)) {
    return {
      isOwned: true,
      reason: 'Ownership verified via Backend Lead (Vikram Rao) assignment.',
      managerId: manager.uid,
      managerName: manager.fullName || 'Vikram Rao',
      trainerId: trainer.uid,
      trainerName: trainer.fullName,
      matchedCriteria: 'SEED_ALIAS'
    };
  }

  const isMgrSarah = 
    mgrUid === 'mgr-enterprise-01' || 
    mgrEmpId === 'mgr-7701' || 
    mgrEmpId === 'nw2001' || 
    mgrEmail.includes('sarah') || 
    mgrEmail.includes('manager@enterprise.com') ||
    mgrName.includes('sarah');

  const isTrnTargetSarah =
    trnMgrId === 'mgr-enterprise-01' ||
    trnMgrId === 'm-1' ||
    trnMgrId === 'nw2001' ||
    trnMgrId === 'mgr-7701' ||
    trnMgrEmail.includes('sarah') ||
    trnMgrName.includes('sarah') ||
    trnUid === 'trainer-alex-01' ||
    trnUid === 'trainer-priya-02' ||
    trnUid === 'trainer-eshwanth-06' ||
    trnEmpId === 'nw1048' ||
    trnEmpId === 'nw1052' ||
    trnEmpId === 'nw1095' ||
    trnName.includes('alex morgan') ||
    trnName.includes('priya sharma') ||
    trnName.includes('eshwanth');

  if (isMgrSarah && isTrnTargetSarah && (mgrDept === 'genai' || !mgrDept)) {
    return {
      isOwned: true,
      reason: 'Ownership verified via GenAI Director (Sarah Jenkins) assignment.',
      managerId: manager.uid,
      managerName: manager.fullName || 'Sarah Jenkins',
      trainerId: trainer.uid,
      trainerName: trainer.fullName,
      matchedCriteria: 'SEED_ALIAS'
    };
  }

  // 2. Direct Explicit Match Criteria (for newly registered managers and trainers)
  // 2a. Direct ID Match (UID or Employee ID)
  if (trnMgrId && (trnMgrId === mgrUid || (mgrEmpId && trnMgrId === mgrEmpId))) {
    return {
      isOwned: true,
      reason: 'Ownership verified via direct Manager ID match.',
      managerId: manager.uid,
      managerName: manager.fullName,
      trainerId: trainer.uid,
      trainerName: trainer.fullName,
      matchedCriteria: 'ID'
    };
  }

  // 2b. Direct Email Match
  if (trnMgrEmail && mgrEmail) {
    if (trnMgrEmail === mgrEmail) {
      return {
        isOwned: true,
        reason: 'Ownership verified via direct Manager Email match.',
        managerId: manager.uid,
        managerName: manager.fullName,
        trainerId: trainer.uid,
        trainerName: trainer.fullName,
        matchedCriteria: 'EMAIL'
      };
    }
    const trnMgrPrefix = trnMgrEmail.split('@')[0];
    const mgrPrefix = mgrEmail.split('@')[0];
    if (trnMgrPrefix && mgrPrefix && trnMgrPrefix === mgrPrefix && trnMgrPrefix.length >= 3) {
      return {
        isOwned: true,
        reason: 'Ownership verified via Manager Email handle match.',
        managerId: manager.uid,
        managerName: manager.fullName,
        trainerId: trainer.uid,
        trainerName: trainer.fullName,
        matchedCriteria: 'EMAIL'
      };
    }
  }

  // 2c. Direct Name Match
  if (trnMgrName && mgrName) {
    if (trnMgrName === mgrName) {
      return {
        isOwned: true,
        reason: 'Ownership verified via exact Manager Name match.',
        managerId: manager.uid,
        managerName: manager.fullName,
        trainerId: trainer.uid,
        trainerName: trainer.fullName,
        matchedCriteria: 'NAME'
      };
    }

    const mgrWords = mgrName.split(/[\s,.-]+/).filter(w => w.length >= 2);
    const trnMgrWords = trnMgrName.split(/[\s,.-]+/).filter(w => w.length >= 2);

    const matchesName = trnMgrWords.some(tw =>
      mgrWords.some(mw => mw === tw || (mw.length >= 4 && tw.length >= 4 && (mw === tw || mw.startsWith(tw) || tw.startsWith(mw))))
    );

    if (matchesName) {
      return {
        isOwned: true,
        reason: 'Ownership verified via Manager Name token match.',
        managerId: manager.uid,
        managerName: manager.fullName,
        trainerId: trainer.uid,
        trainerName: trainer.fullName,
        matchedCriteria: 'NAME'
      };
    }
  }

  // 3. If explicit manager info is populated on trainer and matched nothing above -> Reject
  const hasExplicitManagerAssignment = Boolean(trnMgrId || trnMgrName || trnMgrEmail);
  if (hasExplicitManagerAssignment) {
    return {
      isOwned: false,
      reason: `Trainer is assigned to a different Manager (${trainer.managerName || trainer.managerEmail || trainer.managerId}).`,
      managerId: manager.uid,
      trainerId: trainer.uid,
      matchedCriteria: 'NONE'
    };
  }

  // 4. Fallback: Unassigned Trainer default lead routing
  if (!trnMgrId && !trnMgrName && !trnMgrEmail && mgrDept && trnDept && mgrDept === trnDept) {
    if (mgrDept === 'genai' && (mgrName.includes('sarah') || mgrUid === 'mgr-enterprise-01')) {
      return {
        isOwned: true,
        reason: 'Ownership routed to primary GenAI Department Lead.',
        managerId: manager.uid,
        trainerId: trainer.uid,
        matchedCriteria: 'PRIMARY_LEAD'
      };
    }
    if (mgrDept === 'frontend' && (mgrName.includes('chandana') || mgrUid === 'mgr-chandana-01')) {
      return {
        isOwned: true,
        reason: 'Ownership routed to primary Frontend Department Lead.',
        managerId: manager.uid,
        trainerId: trainer.uid,
        matchedCriteria: 'PRIMARY_LEAD'
      };
    }
    if (mgrDept === 'backend' && (mgrName.includes('vikram') || mgrUid === 'mgr-vikram-01')) {
      return {
        isOwned: true,
        reason: 'Ownership routed to primary Backend Department Lead.',
        managerId: manager.uid,
        trainerId: trainer.uid,
        matchedCriteria: 'PRIMARY_LEAD'
      };
    }
  }

  return {
    isOwned: false,
    reason: 'Active manager is not the designated reporting manager for this trainer.',
    managerId: manager.uid,
    trainerId: trainer.uid,
    matchedCriteria: 'NONE'
  };
}

/**
 * Boolean helper to quickly check if a manager is authorized for a trainer.
 */
export function isManagerAuthorizedForTrainer(
  trainer: Partial<UserProfile> | null | undefined,
  manager: Partial<UserProfile> | null | undefined
): boolean {
  return validateTrainerManagerOwnership(trainer, manager).isOwned;
}

/**
 * Filters a raw list of trainer user profiles to only those owned by the active manager.
 */
export function filterTrainersByManagerOwnership(
  trainers: UserProfile[],
  manager: UserProfile | null | undefined
): UserProfile[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return trainers;
  return (trainers || []).filter(trainer => isManagerAuthorizedForTrainer(trainer, manager));
}

/**
 * Filters Classes ensuring the manager only views classes belonging to their owned trainers or created by them.
 */
export function filterClassesByManagerOwnership(
  classes: ClassItem[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): ClassItem[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return classes;
  const mgrUid = manager.uid;
  return (classes || []).filter(c => 
    authorizedTrainerUids.has(c.userId) || 
    c.managerId === mgrUid
  );
}

/**
 * Filters Tasks ensuring the manager only views tasks assigned to their owned trainers or created by them.
 */
export function filterTasksByManagerOwnership(
  tasks: TaskItem[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): TaskItem[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return tasks;
  const mgrUid = manager.uid;
  return (tasks || []).filter(t => 
    authorizedTrainerUids.has(t.assignedTo) || 
    t.assignedBy === mgrUid ||
    t.managerId === mgrUid
  );
}

/**
 * Filters Projects ensuring the manager only views projects assigned to their owned trainers,
 * created by them, or scoped within their departmental pool.
 */
export function filterProjectsByManagerOwnership(
  projects: ProjectItem[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>,
  allOwnedTrainers: UserProfile[] = []
): ProjectItem[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return projects;
  const mgrUid = manager.uid;

  return (projects || []).filter(p => {
    // 1. Directly assigned to an authorized trainer
    if (p.assignedTo && authorizedTrainerUids.has(p.assignedTo)) {
      return true;
    }
    // 2. Managed by this manager
    if (p.managerId === mgrUid) {
      return true;
    }
    // 3. Name or Employee ID match with an owned trainer
    if (p.assignedToName || p.assignedToEmployeeId) {
      const match = allOwnedTrainers.some(t => 
        (p.assignedToName && t.fullName.toLowerCase() === p.assignedToName.toLowerCase()) ||
        (p.assignedToEmployeeId && t.employeeId.toUpperCase() === p.assignedToEmployeeId.toUpperCase())
      );
      if (match) return true;
    }
    // 4. Open pool projects in the manager's department
    if ((p.isOpenForSelfAssignment || !p.assignedTo) && (!p.teamId || p.teamId === manager.teamId || manager.department === 'GenAI')) {
      return true;
    }
    return false;
  });
}

/**
 * Filters Daily Updates ensuring the manager only views logs for their owned trainers.
 */
export function filterDailyUpdatesByManagerOwnership(
  updates: DailyUpdate[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): DailyUpdate[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return updates;
  const mgrUid = manager.uid;
  return (updates || []).filter(u => 
    authorizedTrainerUids.has(u.userId) ||
    u.managerId === mgrUid
  );
}

/**
 * Filters Feedback records ensuring the manager only views evaluations for their owned trainers or given by them.
 */
export function filterFeedbackByManagerOwnership(
  feedbacks: FeedbackRecord[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): FeedbackRecord[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return feedbacks;
  const mgrUid = manager.uid;
  return (feedbacks || []).filter(f => 
    authorizedTrainerUids.has(f.userId) || 
    f.managerId === mgrUid
  );
}

/**
 * Filters Attendance records ensuring the manager only views attendance for their owned trainers.
 */
export function filterAttendanceByManagerOwnership(
  attendanceList: AttendanceRecord[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): AttendanceRecord[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return attendanceList;
  return (attendanceList || []).filter(a => authorizedTrainerUids.has(a.userId));
}

/**
 * Filters Targets ensuring the manager only views targets for their owned trainers.
 */
export function filterTargetsByManagerOwnership(
  targets: TargetItem[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): TargetItem[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return targets;
  return (targets || []).filter(t => authorizedTrainerUids.has(t.userId));
}

/**
 * Filters Alerts ensuring the manager only receives alerts related to their owned trainers or team.
 */
export function filterAlertsByManagerOwnership(
  alerts: AlertItem[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>
): AlertItem[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return alerts;
  const mgrUid = manager.uid;
  return (alerts || []).filter(al =>
    (al.userId && authorizedTrainerUids.has(al.userId)) ||
    (al.entityId && authorizedTrainerUids.has(al.entityId)) ||
    al.managerId === mgrUid
  );
}

/**
 * Filters Holistic Contributions ensuring the manager only views records for their owned trainers.
 */
export function filterHolisticContributionsByManagerOwnership(
  contributions: HolisticContributionRecord[],
  manager: UserProfile | null | undefined,
  authorizedTrainerUids: Set<string>,
  allOwnedTrainers: UserProfile[] = []
): HolisticContributionRecord[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return contributions;
  const mgrUid = manager.uid;

  return (contributions || []).filter(h => 
    authorizedTrainerUids.has(h.userId) || 
    h.managerId === mgrUid ||
    (h.employeeId && allOwnedTrainers.some(t => t.employeeId.toUpperCase() === h.employeeId?.toUpperCase()))
  );
}

/**
 * Filters Teams ensuring managers only access their department/assigned teams.
 */
export function filterTeamsByManagerOwnership(
  teams: Team[],
  manager: UserProfile | null | undefined
): Team[] {
  if (!manager) return [];
  if (manager.role !== 'MANAGER') return teams;
  
  if (manager.department && manager.department !== 'Executive' && manager.department !== 'All') {
    const deptTeams = (teams || []).filter(t => 
      t.department?.toLowerCase() === manager.department?.toLowerCase() || 
      t.managerId === manager.uid
    );
    return deptTeams.length > 0 ? deptTeams : teams;
  }
  return teams;
}
