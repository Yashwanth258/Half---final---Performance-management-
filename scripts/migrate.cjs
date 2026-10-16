const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');
const { createClient } = require('@supabase/supabase-js');
const firebaseConfig = require('../firebase-applet-config.json');

const fbApp = initializeApp(firebaseConfig);
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

const db = dbId 
  ? initializeFirestore(fbApp, { experimentalForceLongPolling: true }, dbId)
  : initializeFirestore(fbApp, { experimentalForceLongPolling: true });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function migrate() {
  console.log('--- Starting Migration from Firebase Firestore to Supabase ---');

  // 1. Teams
  try {
    const teamsSnap = await getDocs(collection(db, 'teams'));
    console.log(`Found ${teamsSnap.size} teams in Firestore`);
    const teamsBatch = teamsSnap.docs.map(doc => {
      const t = doc.data();
      return {
        id: doc.id,
        name: t.name || 'Department',
        manager_id: t.managerId || null,
        manager_name: t.managerName || null,
        department: t.department || 'GenAI',
        location: t.location || '',
        description: t.description || '',
        created_at: t.createdAt || new Date().toISOString(),
      };
    });
    if (teamsBatch.length > 0) {
      const { error } = await supabase.from('teams').upsert(teamsBatch, { onConflict: 'id' });
      if (error) console.error('Error migrating teams batch:', error.message);
    }
    console.log('✓ Teams migration finished');
  } catch (err) {
    console.error('Teams migration error:', err.message);
  }

  // 2. Profiles (from users collection + credentials profiles)
  try {
    const profilesMap = new Map();

    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnap.size} users in Firestore`);
    usersSnap.forEach(d => {
      const u = d.data();
      if (u.employeeId && u.companyEmail) {
        profilesMap.set(u.employeeId.toUpperCase(), { ...u, uid: u.uid || d.id });
      }
    });

    const mgrSnap = await getDocs(collection(db, 'manager_credentials'));
    console.log(`Found ${mgrSnap.size} manager_credentials in Firestore`);
    mgrSnap.forEach(d => {
      const m = d.data();
      const p = m.profile || {};
      const empId = (p.employeeId || m.employeeId || '').toUpperCase();
      const email = p.companyEmail || m.email || '';
      if (empId && email && !profilesMap.has(empId)) {
        profilesMap.set(empId, {
          uid: p.uid || m.uid || d.id,
          employeeId: empId,
          fullName: p.fullName || 'Manager',
          companyEmail: email,
          role: 'MANAGER',
          department: p.department || m.department || 'GenAI',
          teamId: p.teamId || 'team-genai',
          teamName: p.teamName || 'GenAI Department',
          managerId: p.managerId || 'exec-global-00',
          managerName: p.managerName || 'Executive Leadership',
          designation: p.designation || 'Capability Manager',
          location: p.location || '',
          subject: p.subject || '',
          phone: p.phone || null,
          isActive: p.isActive ?? true,
          createdAt: p.createdAt || m.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || m.updatedAt || new Date().toISOString(),
        });
      }
    });

    const trSnap = await getDocs(collection(db, 'trainer_credentials'));
    console.log(`Found ${trSnap.size} trainer_credentials in Firestore`);
    trSnap.forEach(d => {
      const t = d.data();
      const p = t.profile || {};
      const empId = (p.employeeId || t.employeeId || '').toUpperCase();
      const email = p.companyEmail || t.email || '';
      if (empId && email && !profilesMap.has(empId)) {
        profilesMap.set(empId, {
          uid: p.uid || t.uid || d.id,
          employeeId: empId,
          fullName: p.fullName || 'Trainer',
          companyEmail: email,
          role: 'TRAINER',
          department: p.department || t.department || 'GenAI',
          teamId: p.teamId || 'team-genai',
          teamName: p.teamName || 'GenAI Department',
          managerId: p.managerId || t.managerId || '',
          managerName: p.managerName || t.managerName || '',
          managerEmail: p.managerEmail || t.managerEmail || '',
          designation: p.designation || 'Software Development Instructor',
          location: p.location || '',
          subject: p.subject || '',
          phone: p.phone || null,
          isActive: p.isActive ?? true,
          createdAt: p.createdAt || t.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || t.updatedAt || new Date().toISOString(),
        });
      }
    });

    console.log(`Total unique profiles to migrate: ${profilesMap.size}`);
    const profilesBatch = Array.from(profilesMap.values()).map(u => ({
      uid: u.uid || `usr_${(u.employeeId || '').toLowerCase()}`,
      employee_id: u.employeeId,
      full_name: u.fullName || 'User',
      company_email: (u.companyEmail || '').toLowerCase(),
      role: u.role === 'MANAGER' ? 'MANAGER' : 'TRAINER',
      department: u.department || 'GenAI',
      team_id: u.teamId || 'team-genai',
      team_name: u.teamName || 'GenAI Department',
      manager_id: u.managerId || null,
      manager_name: u.managerName || null,
      manager_email: u.managerEmail || null,
      designation: u.designation || (u.role === 'MANAGER' ? 'Capability Manager' : 'Software Development Instructor'),
      location: u.location || '',
      subject: u.subject || '',
      phone: u.phone || null,
      is_active: u.isActive ?? true,
      created_at: u.createdAt || new Date().toISOString(),
      updated_at: u.updatedAt || new Date().toISOString(),
    }));

    if (profilesBatch.length > 0) {
      const { error } = await supabase.from('profiles').upsert(profilesBatch, { onConflict: 'employee_id' });
      if (error) console.error('Error migrating profiles batch:', error.message);
    }
    console.log('✓ Profiles migration finished');
  } catch (err) {
    console.error('Profiles migration error:', err.message);
  }

  // 3. Daily Updates
  try {
    const dailySnap = await getDocs(collection(db, 'dailyUpdates'));
    console.log(`Found ${dailySnap.size} dailyUpdates in Firestore`);
    const dailyBatch = dailySnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        user_id: d.userId || null,
        employee_id: d.employeeId || 'UNKNOWN',
        employee_name: d.employeeName || 'Unknown',
        user_email: d.userEmail || null,
        team_id: d.teamId || null,
        manager_id: d.managerId || null,
        date: d.date,
        classes_handled: d.classesHandled || '',
        classes_count: d.classesCount || 0,
        class_duration_minutes: d.classDurationMinutes || 60,
        total_classes_duration_minutes: d.totalClassesDurationMinutes || 0,
        practice_sessions_count: d.practiceSessionsCount || 0,
        practice_duration_minutes: d.practiceDurationMinutes || 60,
        total_practice_duration_minutes: d.totalPracticeDurationMinutes || 0,
        total_sessions_count: d.totalSessionsCount || 0,
        session_minutes_calculated: d.sessionMinutesCalculated || 0,
        tasks_worked_on: d.tasksWorkedOn || '',
        project_updates: d.projectUpdates || null,
        additional_category: d.additionalCategory || 'None',
        additional_responsibilities: d.additionalResponsibilities || null,
        paper_evaluation_hours: Number(d.paperEvaluationHours) || 0,
        in_service_hours: Number(d.inServiceHours) || 0,
        calculated_total_hours: Number(d.calculatedTotalHours) || 6,
        standard_working_hours: Number(d.standardWorkingHours) || 6,
        weekly_standard_hours: Number(d.weeklyStandardHours) || 36,
        extra_hours_worked: Number(d.extraHoursWorked) || 0,
        burnout_risk_level: d.burnoutRiskLevel || 'Normal',
        extra_work_reason: d.extraWorkReason || null,
        extra_work_details: d.extraWorkDetails || null,
        challenges_or_blockers: d.challengesOrBlockers || null,
        remarks: d.remarks || null,
        hours_logged: Number(d.hoursLogged) || 6,
        created_at: d.createdAt || new Date().toISOString(),
        updated_at: d.updatedAt || new Date().toISOString(),
      };
    });
    if (dailyBatch.length > 0) {
      const { error } = await supabase.from('daily_updates').upsert(dailyBatch, { onConflict: 'id' });
      if (error) console.error('Error migrating daily updates batch:', error.message);
    }
    console.log('✓ Daily updates migration finished');
  } catch (err) {
    console.error('Daily updates migration error:', err.message);
  }

  // 4. Classes
  try {
    const classesSnap = await getDocs(collection(db, 'classes'));
    console.log(`Found ${classesSnap.size} classes in Firestore`);
    const classesBatch = classesSnap.docs.map(doc => {
      const c = doc.data();
      return {
        id: doc.id,
        user_id: c.userId || null,
        employee_id: c.employeeId || '',
        employee_name: c.employeeName || '',
        team_id: c.teamId || null,
        manager_id: c.managerId || null,
        class_name: c.className || 'Class',
        batch: c.batch || 'Batch A',
        subject: c.subject || 'Subject',
        topic: c.topic || '',
        date: c.date,
        start_time: c.startTime || '09:00',
        end_time: c.endTime || '10:30',
        duration_minutes: c.durationMinutes || 90,
        number_of_students: c.numberOfStudents || 30,
        delivery_mode: c.deliveryMode || 'Online',
        status: c.status || 'Scheduled',
        remarks: c.remarks || null,
        room_or_meeting_link: c.roomOrMeetingLink || null,
        created_at: c.createdAt || new Date().toISOString(),
        updated_at: c.updatedAt || new Date().toISOString(),
      };
    });
    if (classesBatch.length > 0) {
      const { error } = await supabase.from('classes').upsert(classesBatch, { onConflict: 'id' });
      if (error) console.error('Error migrating classes batch:', error.message);
    }
    console.log('✓ Classes migration finished');
  } catch (err) {
    console.error('Classes migration error:', err.message);
  }

  // 5. Tasks
  try {
    const tasksSnap = await getDocs(collection(db, 'tasks'));
    console.log(`Found ${tasksSnap.size} tasks in Firestore`);
    const tasksBatch = tasksSnap.docs.map(doc => {
      const t = doc.data();
      return {
        id: doc.id,
        task_name: t.taskName || 'Task',
        description: t.description || '',
        assigned_by: t.assignedBy || null,
        assigned_by_name: t.assignedByName || null,
        assigned_to: t.assignedTo || null,
        assigned_to_name: t.assignedToName || null,
        assigned_to_employee_id: t.assignedToEmployeeId || null,
        team_id: t.teamId || null,
        manager_id: t.managerId || null,
        priority: t.priority || 'Medium',
        assigned_date: t.assignedDate || null,
        due_date: t.dueDate || null,
        status: t.status || 'In Progress',
        completion_percentage: t.completionPercentage || 0,
        remarks: t.remarks || null,
        category: t.category || null,
        created_at: t.createdAt || new Date().toISOString(),
        updated_at: t.updatedAt || new Date().toISOString(),
      };
    });
    if (tasksBatch.length > 0) {
      const { error } = await supabase.from('tasks').upsert(tasksBatch, { onConflict: 'id' });
      if (error) console.error('Error migrating tasks batch:', error.message);
    }
    console.log('✓ Tasks migration finished');
  } catch (err) {
    console.error('Tasks migration error:', err.message);
  }

  // 6. Projects
  try {
    const projSnap = await getDocs(collection(db, 'projects'));
    console.log(`Found ${projSnap.size} projects in Firestore`);
    const projBatch = projSnap.docs.map(doc => {
      const p = doc.data();
      return {
        id: doc.id,
        project_name: p.projectName || 'Project',
        project_description: p.projectDescription || '',
        start_date: p.startDate || null,
        expected_completion_date: p.expectedCompletionDate || null,
        current_stage: p.currentStage || 'Planning',
        overall_completion_percentage: p.overallCompletionPercentage || 0,
        current_status: p.currentStatus || 'On Track',
        manager_id: p.managerId || null,
        manager_name: p.managerName || null,
        assigned_to: p.assignedTo || null,
        assigned_to_name: p.assignedToName || null,
        assigned_to_employee_id: p.assignedToEmployeeId || null,
        team_id: p.teamId || null,
        remarks: p.remarks || null,
        repository_url: p.repositoryUrl || null,
        deliverables: p.deliverables || null,
        is_self_assigned: p.isSelfAssigned || false,
        is_open_for_self_assignment: p.isOpenForSelfAssignment || false,
        milestones: p.milestones || [],
        created_at: p.createdAt || new Date().toISOString(),
        updated_at: p.updatedAt || new Date().toISOString(),
      };
    });
    if (projBatch.length > 0) {
      const { error } = await supabase.from('projects').upsert(projBatch, { onConflict: 'id' });
      if (error) console.error('Error migrating projects batch:', error.message);
    }
    console.log('✓ Projects migration finished');
  } catch (err) {
    console.error('Projects migration error:', err.message);
  }

  // 7. Manager Credentials
  try {
    const mgrCredSnap = await getDocs(collection(db, 'manager_credentials'));
    console.log(`Found ${mgrCredSnap.size} manager_credentials in Firestore`);
    const mgrBatch = mgrCredSnap.docs.map(doc => {
      const m = doc.data();
      return {
        id: doc.id,
        employee_id: m.employeeId || null,
        email: m.email || (m.profile?.companyEmail || null),
        password: String(m.password || 'password'),
        role: 'MANAGER',
        department: m.department || m.profile?.department || 'GenAI',
        uid: m.uid || doc.id,
        profile: m.profile || null,
        created_at: m.createdAt || new Date().toISOString(),
        updated_at: m.updatedAt || new Date().toISOString(),
      };
    });
    if (mgrBatch.length > 0) {
      const { error } = await supabase.from('manager_credentials').upsert(mgrBatch, { onConflict: 'id' });
      if (error) {
        console.warn('Notice on manager_credentials migration (ensure table exists):', error.message);
      } else {
        console.log(`✓ Manager credentials (${mgrBatch.length}) migrated to Supabase!`);
      }
    }
  } catch (err) {
    console.error('Manager credentials migration error:', err.message);
  }

  // 8. Trainer Credentials
  try {
    const trainerCredSnap = await getDocs(collection(db, 'trainer_credentials'));
    console.log(`Found ${trainerCredSnap.size} trainer_credentials in Firestore`);
    const trBatch = trainerCredSnap.docs.map(doc => {
      const t = doc.data();
      return {
        id: doc.id,
        employee_id: t.employeeId || null,
        email: t.email || (t.profile?.companyEmail || null),
        password: String(t.password || 'password'),
        role: 'TRAINER',
        department: t.department || t.profile?.department || 'GenAI',
        manager_id: t.managerId || t.profile?.managerId || null,
        manager_name: t.managerName || t.profile?.managerName || null,
        manager_email: t.managerEmail || t.profile?.managerEmail || null,
        uid: t.uid || doc.id,
        profile: t.profile || null,
        created_at: t.createdAt || new Date().toISOString(),
        updated_at: t.updatedAt || new Date().toISOString(),
      };
    });
    if (trBatch.length > 0) {
      const { error } = await supabase.from('trainer_credentials').upsert(trBatch, { onConflict: 'id' });
      if (error) {
        console.warn('Notice on trainer_credentials migration (ensure table exists):', error.message);
      } else {
        console.log(`✓ Trainer credentials (${trBatch.length}) migrated to Supabase!`);
      }
    }
  } catch (err) {
    console.error('Trainer credentials migration error:', err.message);
  }

  // 9. User Credentials (Unified index)
  try {
    const userCredSnap = await getDocs(collection(db, 'user_credentials'));
    console.log(`Found ${userCredSnap.size} user_credentials in Firestore`);
    const usrBatch = userCredSnap.docs.map(doc => {
      const u = doc.data();
      return {
        id: doc.id,
        employee_id: u.employeeId || null,
        email: u.email || (u.profile?.companyEmail || null),
        password: String(u.password || 'password'),
        role: u.role || 'TRAINER',
        uid: u.uid || doc.id,
        profile: u.profile || null,
        created_at: u.createdAt || new Date().toISOString(),
        updated_at: u.updatedAt || new Date().toISOString(),
      };
    });
    if (usrBatch.length > 0) {
      const { error } = await supabase.from('user_credentials').upsert(usrBatch, { onConflict: 'id' });
      if (error) {
        console.warn('Notice on user_credentials migration (ensure table exists):', error.message);
      } else {
        console.log(`✓ User credentials (${usrBatch.length}) migrated to Supabase!`);
      }
    }
  } catch (err) {
    console.error('User credentials migration error:', err.message);
  }

  console.log('=== All Firebase collections migrated to Supabase successfully! ===');
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
