import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  Lock, 
  Mail, 
  User, 
  BadgeCheck, 
  Building2, 
  Briefcase, 
  MapPin, 
  BookOpen, 
  ArrowRight, 
  ShieldAlert, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  Cpu,
  Code2,
  Server,
  Loader2,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  UserPlus,
  Building
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { UserRole, UserProfile, EnterpriseDepartment, ENTERPRISE_DEPARTMENTS } from '../../types';
import { NxtWaveLogo } from '../common/NxtWaveLogo';

export interface ManagerDirectoryItem {
  uid: string;
  fullName: string;
  companyEmail: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  location?: string;
  teamName?: string;
}

export const AuthPage: React.FC = () => {
  const { login, registerUser, quickDemoLogin, resetPassword, directUpdatePassword, loading: authLoading } = useAuth();

  // Top level mode: 'signin' | 'signup' | 'forgot_password'
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  
  // Role Selection for Registration: null means they are on the initial role selection screen, or 'TRAINER' | 'MANAGER'
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Common UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWrongPassword, setIsWrongPassword] = useState(false);
  const [showWrongPasswordModal, setShowWrongPasswordModal] = useState(false);
  const [accountAlreadyExists, setAccountAlreadyExists] = useState<{ emailOrId: string; message: string; role?: UserRole } | null>(null);
  const [showAccountExistsModal, setShowAccountExistsModal] = useState(false);
  
  // Role Restriction on Sign In (e.g. Trainer account trying to log into Manager portal)
  const [roleRestriction, setRoleRestriction] = useState<{ emailOrId: string; message: string; targetPortal: 'TRAINER' | 'MANAGER' } | null>(null);
  const [showRoleRestrictionModal, setShowRoleRestrictionModal] = useState(false);

  // Role Conflict on Sign Up (e.g. Manager trying to create Trainer account or vice versa)
  const [roleConflict, setRoleConflict] = useState<{ emailOrId: string; message: string; sourceRole: 'TRAINER' | 'MANAGER'; targetPortal: 'TRAINER' | 'MANAGER' } | null>(null);
  const [showRoleConflictModal, setShowRoleConflictModal] = useState(false);

  const [isUserNotFound, setIsUserNotFound] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Role filter on Sign In page (Trainer vs Manager only)
  const [signInRoleTab, setSignInRoleTab] = useState<'TRAINER' | 'MANAGER'>('TRAINER');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Forgot password & direct reset states
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'update_direct'>('request');
  const [matchedResetUser, setMatchedResetUser] = useState<UserProfile | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Trainer Sign Up State (No predefined mock data; fully user-entered)
  const [trainerForm, setTrainerForm] = useState({
    fullName: '',
    companyEmail: '',
    password: '',
    confirmPassword: '',
    employeeId: '',
    department: 'GenAI' as EnterpriseDepartment,
    designation: '',
    location: '',
    subject: '',
    managerId: '',
    managerName: '',
    managerEmail: '',
  });

  // Manager Sign Up State (No predefined mock data; fully user-entered)
  const [managerForm, setManagerForm] = useState({
    fullName: '',
    companyEmail: '',
    password: '',
    confirmPassword: '',
    employeeId: '',
    managerSecurityPasscode: '',
    department: 'GenAI' as EnterpriseDepartment,
    teamName: '',
    designation: '',
    location: '',
    subject: '',
  });

  // Live Manager Directory for Trainer Registration (Dropdown + Search)
  const [registeredManagers, setRegisteredManagers] = useState<ManagerDirectoryItem[]>([]);
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const [isManualManagerEntry, setIsManualManagerEntry] = useState(false);
  const managerDropdownRef = useRef<HTMLDivElement | null>(null);

  // Inactivity timeout notice state
  const [sessionTimeoutNotice, setSessionTimeoutNotice] = useState<string | null>(null);

  const instanceId = React.useRef(Math.random().toString(36).slice(2, 8)).current;

  // Real-time synchronization of registered managers
  useEffect(() => {
    // Helper to merge and deduplicate managers strictly from manager accounts
    const loadCachedManagers = (): ManagerDirectoryItem[] => {
      const items: ManagerDirectoryItem[] = [];
      try {
        const mgrAccountsRaw = localStorage.getItem('nxtwave_manager_accounts');
        if (mgrAccountsRaw) {
          const accounts = JSON.parse(mgrAccountsRaw);
          Object.values(accounts).forEach((acc: any) => {
            const p = acc?.profile || acc;
            const isManagerRole = (acc?.role === 'MANAGER' || p?.role === 'MANAGER') && acc?.role !== 'TRAINER' && p?.role !== 'TRAINER';
            if (acc && isManagerRole && (p?.companyEmail || acc?.email)) {
              items.push({
                uid: acc.uid || p.uid || '',
                fullName: p.fullName || acc.fullName || 'Manager',
                companyEmail: (p.companyEmail || acc.email || '').toLowerCase(),
                employeeId: p.employeeId || acc.employeeId,
                department: p.department || acc.department || 'GenAI',
                designation: p.designation || 'Capability Manager',
                location: p.location || '',
                teamName: p.teamName || '',
              });
            }
          });
        }

        const customAccountsRaw = localStorage.getItem('nxtwave_custom_accounts');
        if (customAccountsRaw) {
          const customAccounts = JSON.parse(customAccountsRaw);
          Object.values(customAccounts).forEach((acc: any) => {
            const p = acc?.profile || acc;
            const isManagerRole = (acc?.role === 'MANAGER' || p?.role === 'MANAGER') && acc?.role !== 'TRAINER' && p?.role !== 'TRAINER';
            if (acc && isManagerRole && (p?.companyEmail || acc?.email)) {
              items.push({
                uid: acc.uid || p.uid || '',
                fullName: p.fullName || acc.fullName || 'Manager',
                companyEmail: (p.companyEmail || acc.email || '').toLowerCase(),
                employeeId: p.employeeId || acc.employeeId,
                department: p.department || acc.department || 'GenAI',
                designation: p.designation || 'Capability Manager',
                location: p.location || '',
                teamName: p.teamName || '',
              });
            }
          });
        }
      } catch (err) {
        console.warn('Error reading cached manager accounts:', err);
      }
      return items;
    };

    const DEFAULT_KNOWN_MANAGERS: ManagerDirectoryItem[] = [
      {
        uid: 'mgr-yash-01',
        fullName: 'North Yashwan',
        companyEmail: 'yash@enterprise.com',
        employeeId: 'NW2015',
        department: 'Frontend',
        designation: 'Capability Manager',
        location: 'Chennai',
        teamName: 'Frontend Department',
      },
      {
        uid: 'mgr-chandana-01',
        fullName: 'Chandana',
        companyEmail: 'chandana@enterprise.com',
        employeeId: 'NW2008',
        department: 'Frontend',
        designation: 'Capability Manager',
        location: 'Chennai',
        teamName: 'Frontend Department',
      },
      {
        uid: 'mgr-nitin-01',
        fullName: 'Nitin',
        companyEmail: 'nitin@enterprise.com',
        employeeId: 'NW2018',
        department: 'Frontend',
        designation: 'Capability Manager',
        location: 'Chennai',
        teamName: 'Frontend Department',
      },
      {
        uid: 'mgr-vikram-01',
        fullName: 'Vikram Rao',
        companyEmail: 'vikram.rao@enterprise.com',
        employeeId: 'NW2022',
        department: 'Backend',
        designation: 'Capability Manager',
        location: 'Hyderabad Campus',
        teamName: 'Backend Department',
      },
      {
        uid: 'mgr-enterprise-01',
        fullName: 'Sarah Jenkins',
        companyEmail: 'sarah.jenkins@enterprise.com',
        employeeId: 'NW2001',
        department: 'GenAI',
        designation: 'Capability Manager',
        location: 'San Francisco, CA',
        teamName: 'GenAI Department',
      },
    ];

    let userManagerDocs: ManagerDirectoryItem[] = [];
    let credManagerDocs: ManagerDirectoryItem[] = [];

    const syncAllManagers = () => {
      const map = new Map<string, ManagerDirectoryItem>();

      // 0. Base Enterprise Managers
      DEFAULT_KNOWN_MANAGERS.forEach(m => {
        if (m.companyEmail) map.set(m.companyEmail.toLowerCase(), m);
      });

      // 1. Cached localStorage managers (created dynamically from manager portal)
      const cached = loadCachedManagers();
      cached.forEach(m => {
        if (m.companyEmail) map.set(m.companyEmail.toLowerCase(), m);
      });

      // 2. Credentials collection managers (Firestore manager_credentials)
      credManagerDocs.forEach(m => {
        if (m.companyEmail) map.set(m.companyEmail.toLowerCase(), m);
      });

      // 3. User collection managers (Firestore users collection - highest priority live state)
      userManagerDocs.forEach(m => {
        if (m.companyEmail) map.set(m.companyEmail.toLowerCase(), m);
      });

      const list = Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
      setRegisteredManagers(list);
    };

    // Initial sync
    syncAllManagers();

    // 1. Real-time Firestore users subscription for managers only (strictly role == 'MANAGER')
    const usersCol = collection(db, 'users');
    const mgrQuery = query(usersCol, where('role', '==', 'MANAGER'));
    const unsubUsers = onSnapshot(mgrQuery, (snapshot) => {
      const docs: ManagerDirectoryItem[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as UserProfile;
        // Strictly filter out any trainer accounts
        if (data && data.role === 'MANAGER' && (data as any).role !== 'TRAINER' && data.companyEmail) {
          docs.push({
            uid: data.uid || docSnap.id,
            fullName: data.fullName,
            companyEmail: data.companyEmail.toLowerCase(),
            employeeId: data.employeeId,
            department: data.department,
            designation: data.designation,
            location: data.location,
            teamName: data.teamName,
          });
        }
      });
      userManagerDocs = docs;
      syncAllManagers();
    }, (err) => {
      console.warn('Real-time manager users sync notice:', err);
    });

    // 2. Query manager_credentials collection (strictly role == 'MANAGER')
    const fetchCreds = async () => {
      try {
        const credCol = collection(db, 'manager_credentials');
        const snap = await getDocs(credCol);
        const docs: ManagerDirectoryItem[] = [];
        snap.forEach(d => {
          const data = d.data();
          const p = data.profile || data;
          const isManagerRole = (data.role === 'MANAGER' || p.role === 'MANAGER') && data.role !== 'TRAINER' && p.role !== 'TRAINER';
          if (p && isManagerRole && (p.companyEmail || data.email)) {
            docs.push({
              uid: data.uid || p.uid || d.id,
              fullName: p.fullName || data.fullName || 'Manager',
              companyEmail: (p.companyEmail || data.email).toLowerCase(),
              employeeId: p.employeeId || data.employeeId,
              department: p.department || data.department,
              designation: p.designation || data.designation,
              location: p.location || data.location,
              teamName: p.teamName || data.teamName,
            });
          }
        });
        credManagerDocs = docs;
        syncAllManagers();
      } catch (e) {
        console.warn('Error fetching manager_credentials:', e);
      }
    };
    fetchCreds();

    // 3. Storage event listener across tabs/windows
    const handleStorageChange = () => {
      syncAllManagers();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('nxtwave_manager_registered', handleStorageChange);

    return () => {
      unsubUsers();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('nxtwave_manager_registered', handleStorageChange);
    };
  }, []);

  // Click outside to close manager dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target as Node)) {
        setIsManagerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    console.log('[MODAL STATE TRACKER] instance:', instanceId, '| showWrongPasswordModal changed to:', showWrongPasswordModal);
  }, [showWrongPasswordModal]);

  useEffect(() => {
    console.log('[AUTHPAGE MOUNTED] instance:', instanceId);
    return () => console.log('[AUTHPAGE UNMOUNTED] instance:', instanceId);
  }, []);

  // Check if redirected due to automatic inactivity logout
  React.useEffect(() => {
    try {
      const expired = sessionStorage.getItem('nxtwave_session_expired_inactivity');
      if (expired === 'true') {
        setSessionTimeoutNotice('Session Timed Out: You were automatically signed out after 30 minutes of inactivity to protect your workspace. Please sign in again.');
        sessionStorage.removeItem('nxtwave_session_expired_inactivity');
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, []);

  // Handle department change for trainer
  const handleTrainerDepartmentChange = (dept: EnterpriseDepartment) => {
    setTrainerForm(prev => ({
      ...prev,
      department: dept,
    }));
  };

  // Handle selecting a manager from the registered managers dropdown
  const handleSelectManager = (mgr: ManagerDirectoryItem) => {
    setTrainerForm(prev => ({
      ...prev,
      managerName: mgr.fullName,
      managerEmail: mgr.companyEmail,
      managerId: mgr.uid || mgr.employeeId || '',
      // If manager has a recognized department, synchronize department
      department: (mgr.department && ENTERPRISE_DEPARTMENTS.includes(mgr.department as any))
        ? (mgr.department as EnterpriseDepartment)
        : prev.department,
    }));
    setIsManagerDropdownOpen(false);
    setManagerSearchQuery('');
    setIsManualManagerEntry(false);
  };

  // Handle clearing manager selection
  const handleClearManager = () => {
    setTrainerForm(prev => ({
      ...prev,
      managerName: '',
      managerEmail: '',
      managerId: '',
    }));
  };

  // Handle department change for manager
  const handleManagerDepartmentChange = (dept: EnterpriseDepartment) => {
    setManagerForm(prev => ({
      ...prev,
      department: dept,
    }));
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsWrongPassword(false);
    setIsUserNotFound(false);
    setRoleRestriction(null);
    setSuccessMessage(null);

    const email = signInEmail.trim();
    if (!email) {
      setErrorMessage('Please enter your work email or employee ID.');
      return;
    }

    if (!signInPassword) {
      setIsWrongPassword(true);
      setShowWrongPasswordModal(true);
      setErrorMessage('You have entered a wrong password, type again');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, signInPassword, signInRoleTab);
    } catch (err: any) {
      console.log('[HANDLE SIGN IN] instance:', instanceId, '| Catch block entered:', err);
      const rawCode = err?.code || '';
      const errMsg = err?.message || '';

      // Check for Role Restriction Error (e.g. Trainer account trying to sign in under Manager Portal or vice versa)
      if (errMsg.startsWith('ROLE_RESTRICTION:')) {
        const cleanMsg = errMsg.replace('ROLE_RESTRICTION:', '').trim();
        // Determine the correct portal to switch to:
        let targetPortal: 'MANAGER' | 'TRAINER' = 'TRAINER';
        if (
          cleanMsg.toLowerCase().includes('instructor') ||
          cleanMsg.toLowerCase().includes('trainer') ||
          signInRoleTab === 'MANAGER'
        ) {
          targetPortal = 'TRAINER';
        } else if (
          cleanMsg.toLowerCase().includes('manager') ||
          signInRoleTab === 'TRAINER'
        ) {
          targetPortal = 'MANAGER';
        }

        setRoleRestriction({
          emailOrId: email,
          message: cleanMsg,
          targetPortal,
        });
        setShowRoleRestrictionModal(true);
        setErrorMessage(cleanMsg);
        return;
      }

      const isWrongPass = errMsg.includes('WRONG_PASSWORD') || 
                          rawCode === 'auth/wrong-password' || 
                          rawCode === 'auth/invalid-credential' || 
                          rawCode === 'auth/invalid-login-credentials' ||
                          errMsg.toLowerCase().includes('wrong password') ||
                          errMsg.toLowerCase().includes('password');

      if (isWrongPass) {
        console.info('[AuthPage] Caught WRONG_PASSWORD mismatch error from AuthContext');
        setIsWrongPassword(true);
        setErrorMessage('You have entered a wrong password, type again');
        setShowWrongPasswordModal(true);
      } else if (rawCode === 'auth/too-many-requests') {
        setIsWrongPassword(true);
        setErrorMessage('Too many failed sign-in attempts. Please try again later or reset your password.');
      } else {
        console.warn('[AuthPage] Sign in notice:', errMsg || err);
        setIsWrongPassword(true);
        setErrorMessage('You have entered a wrong password, type again');
        setShowWrongPasswordModal(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Forgot Password Handler - Verifies account in database and allows on-screen password update
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailOrId = resetEmail.trim();
    if (!emailOrId) {
      setErrorMessage('Please enter your registered work email address or employee ID.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword(emailOrId);
      setResetSent(true);
      if (result.user) {
        setMatchedResetUser(result.user);
      }
      setResetStep('update_direct');
      setSuccessMessage(`Account verified for ${result.user?.fullName || emailOrId}. Enter your new password below.`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMessage(err.message || 'Unable to locate account. Please verify your email or Employee ID.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Password Update Handler
  const handleDirectPasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newResetPassword || newResetPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setErrorMessage('Passwords do not match. Please verify your new password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetIdentifier = matchedResetUser?.companyEmail || matchedResetUser?.employeeId || resetEmail.trim();
      await directUpdatePassword(targetIdentifier, newResetPassword);
      setSuccessMessage('Password successfully updated! Logging into workspace...');
      await login(targetIdentifier, newResetPassword);
    } catch (err: any) {
      console.error('Direct password update error:', err);
      setErrorMessage('Failed to update password. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleTrainerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setRoleConflict(null);
    setAccountAlreadyExists(null);

    if (!trainerForm.fullName.trim()) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }
    if (!trainerForm.companyEmail.trim() || !trainerForm.companyEmail.includes('@')) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (!trainerForm.password || trainerForm.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (trainerForm.password !== trainerForm.confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password.');
      return;
    }

    // Strict validation: Trainer Employee ID must start with NW, no spaces, no hashtags
    let cleanEmpId = trainerForm.employeeId.trim().toUpperCase();
    if (cleanEmpId.includes(' ') || cleanEmpId.includes('#') || cleanEmpId.includes('-')) {
      cleanEmpId = cleanEmpId.replace(/[\s#-]/g, '');
    }
    if (!cleanEmpId.startsWith('NW')) {
      setErrorMessage('Trainer Employee ID must start with "NW" (e.g. NW1048) with no spaces or hashtags.');
      return;
    }
    if (cleanEmpId.length < 4) {
      setErrorMessage('Trainer Employee ID must be at least 4 characters long (e.g. NW1048).');
      return;
    }

    setIsSubmitting(true);
    setAccountAlreadyExists(null);
    try {
      const deptTeamMap: Record<EnterpriseDepartment, { teamId: string; teamName: string }> = {
        'Frontend': { teamId: 'team-frontend', teamName: 'Frontend Department' },
        'Backend': { teamId: 'team-backend', teamName: 'Backend Department' },
        'GenAI': { teamId: 'team-genai', teamName: 'GenAI Department' },
      };
      const deptConfig = deptTeamMap[trainerForm.department] || deptTeamMap['GenAI'];

      const selectedMgrName = (trainerForm.managerName || '').trim();
      const resolvedMgrEmail = (trainerForm.managerEmail || '').trim();
      const selectedMgrId = (trainerForm.managerId || '').trim();

      await registerUser({
        fullName: trainerForm.fullName.trim(),
        companyEmail: trainerForm.companyEmail.trim().toLowerCase(),
        password: trainerForm.password,
        employeeId: cleanEmpId,
        role: 'TRAINER',
        department: trainerForm.department,
        teamId: deptConfig.teamId,
        teamName: deptConfig.teamName,
        designation: trainerForm.designation.trim() || 'Technical Trainer',
        location: trainerForm.location.trim(),
        subject: trainerForm.subject.trim(),
        managerId: selectedMgrId || undefined,
        managerName: selectedMgrName,
        managerEmail: resolvedMgrEmail || undefined,
      });
      setSuccessMessage('Instructor profile created and verified! Entering workspace...');
    } catch (err: any) {
      const errMsg = err?.message || '';
      
      // Check for Role Conflict (e.g. account already registered as a Manager in manager_credentials table)
      if (errMsg.startsWith('ROLE_CONFLICT:')) {
        const cleanMsg = errMsg.replace('ROLE_CONFLICT:', '').trim();
        setRoleConflict({
          emailOrId: trainerForm.companyEmail.trim() || cleanEmpId,
          message: cleanMsg,
          sourceRole: 'MANAGER',
          targetPortal: 'MANAGER',
        });
        setShowRoleConflictModal(true);
        setErrorMessage(cleanMsg);
        return;
      }

      const isExists =
        err?.code === 'auth/email-already-in-use' ||
        errMsg.includes('already exists') ||
        errMsg.startsWith('ACCOUNT_EXISTS:');

      if (isExists) {
        console.info('Instructor registration validation: account already exists');
        const cleanMsg = errMsg.startsWith('ACCOUNT_EXISTS: ')
          ? errMsg.replace('ACCOUNT_EXISTS: ', '')
          : `An account with this email (${trainerForm.companyEmail.trim()}) or Employee ID (${cleanEmpId}) already exists. You can directly sign in to the Instructor Portal.`;
        setAccountAlreadyExists({
          emailOrId: trainerForm.companyEmail.trim() || cleanEmpId,
          message: cleanMsg,
          role: 'TRAINER',
        });
        setShowAccountExistsModal(true);
        setErrorMessage(cleanMsg);
      } else {
        console.warn('Instructor registration notice:', errMsg || err);
        setErrorMessage(errMsg || 'Failed to create instructor account. Please check your details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manager Sign Up Handler (Requires Security Passcode & Separate Credentials Table)
  const handleManagerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setRoleConflict(null);
    setAccountAlreadyExists(null);

    if (!managerForm.fullName.trim()) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }
    if (!managerForm.companyEmail.trim() || !managerForm.companyEmail.includes('@')) {
      setErrorMessage('Please enter a valid company executive email address.');
      return;
    }
    if (!managerForm.password || managerForm.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (managerForm.password !== managerForm.confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password.');
      return;
    }

    // MANDATORY SECURITY PASSCODE VERIFICATION
    const passcodeEntered = managerForm.managerSecurityPasscode.trim();
    if (!passcodeEntered) {
      setErrorMessage('Enterprise Manager Security Passcode is mandatory. Instructors cannot register as Managers without authorization.');
      return;
    }

    let cleanEmpId = managerForm.employeeId.trim().toUpperCase().replace(/[\s#-]/g, '');
    if (!cleanEmpId.startsWith('NW')) {
      cleanEmpId = `NW${cleanEmpId}`;
    }

    setIsSubmitting(true);
    try {
      const deptTeamMap: Record<EnterpriseDepartment, { teamId: string; teamName: string }> = {
        'Frontend': { teamId: 'team-frontend', teamName: 'Frontend Department' },
        'Backend': { teamId: 'team-backend', teamName: 'Backend Department' },
        'GenAI': { teamId: 'team-genai', teamName: 'GenAI Department' },
      };
      const deptConfig = deptTeamMap[managerForm.department] || deptTeamMap['GenAI'];

      await registerUser({
        fullName: managerForm.fullName.trim(),
        companyEmail: managerForm.companyEmail.trim().toLowerCase(),
        password: managerForm.password,
        employeeId: cleanEmpId,
        role: 'MANAGER',
        department: managerForm.department,
        teamId: deptConfig.teamId,
        teamName: `${managerForm.department} Department`,
        designation: managerForm.designation.trim() || 'Capability Manager',
        location: '',
        subject: managerForm.subject.trim(),
        managerId: 'exec-global-00',
        managerName: 'Executive Leadership',
        managerSecurityPasscode: passcodeEntered,
      });
      setSuccessMessage('Manager credentials authorized and registered! Accessing Manager Console...');
    } catch (err: any) {
      const errMsg = err?.message || '';

      // Check for Role Conflict (e.g. account already registered as a Trainer in trainer_credentials table)
      if (errMsg.startsWith('ROLE_CONFLICT:')) {
        const cleanMsg = errMsg.replace('ROLE_CONFLICT:', '').trim();
        setRoleConflict({
          emailOrId: managerForm.companyEmail.trim() || cleanEmpId,
          message: cleanMsg,
          sourceRole: 'TRAINER',
          targetPortal: 'TRAINER',
        });
        setShowRoleConflictModal(true);
        setErrorMessage(cleanMsg);
        return;
      }

      const isExists =
        err?.code === 'auth/email-already-in-use' ||
        errMsg.includes('already exists') ||
        errMsg.startsWith('ACCOUNT_EXISTS:');

      if (isExists) {
        console.info('Manager registration validation: account already exists');
        const cleanMsg = errMsg.startsWith('ACCOUNT_EXISTS: ')
          ? errMsg.replace('ACCOUNT_EXISTS: ', '')
          : `An account with this email (${managerForm.companyEmail.trim()}) or Employee ID (${cleanEmpId}) already exists. You can directly sign in to the Manager Portal.`;
        setAccountAlreadyExists({
          emailOrId: managerForm.companyEmail.trim() || cleanEmpId,
          message: cleanMsg,
          role: 'MANAGER',
        });
        setShowAccountExistsModal(true);
        setErrorMessage(cleanMsg);
      } else if (errMsg.includes('Passcode')) {
        setErrorMessage(errMsg);
      } else {
        console.warn('Manager registration notice:', errMsg || err);
        setErrorMessage(errMsg || 'Manager registration authorization failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-sky-100/60 via-blue-50/40 to-slate-50 text-slate-800 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full border-b border-sky-100 bg-white/95 backdrop-blur-md px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <NxtWaveLogo size="md" />
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl flex flex-col items-center">
          
          {/* Brand Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <NxtWaveLogo size="hero" />
          </div>

          {/* Card Container */}
          <div className="w-full rounded-3xl border border-sky-100 bg-white shadow-xl shadow-sky-900/5 backdrop-blur-xl overflow-hidden">
            
            {/* Top Navigation Tabs: Sign In vs Create Account */}
            <div className="grid grid-cols-2 border-b border-sky-100 bg-sky-50/50 p-1.5">
              <button
                type="button"
                id="tab-signin-btn"
                onClick={() => {
                  setActiveTab('signin');
                  setSelectedRole(null);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setAccountAlreadyExists(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all ${
                  activeTab === 'signin'
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Lock className="h-4 w-4" />
                Sign In
              </button>
              <button
                type="button"
                id="tab-signup-btn"
                onClick={() => {
                  setActiveTab('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setAccountAlreadyExists(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all ${
                  activeTab === 'signup'
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <UserCheck className="h-4 w-4" />
                Create Account
              </button>
            </div>

            {/* Error / Success / Inactivity Notifications */}
            {sessionTimeoutNotice && (
              <div className="mx-6 mt-6 p-4 rounded-2xl border border-amber-300 bg-amber-50/95 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                        Security Notice
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                        Auto-Logout (30m)
                      </span>
                    </div>
                    <p className="text-sm font-bold text-amber-900 mt-1">
                      Active Session Timed Out
                    </p>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      {sessionTimeoutNotice}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {roleRestriction ? (
              <div id="role-restriction-banner" className="mx-6 mt-6 p-4 rounded-2xl border-2 border-indigo-300 bg-indigo-50/95 text-indigo-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
                        Role Security Constraint
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-200/80 px-2.5 py-0.5 rounded-full border border-indigo-300">
                        Portal Isolation
                      </span>
                    </div>
                    <p className="text-sm font-bold text-indigo-950 mt-1">
                      Role Verification Required
                    </p>
                    <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                      {roleRestriction.message}
                    </p>
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        id="role-restriction-switch-portal-btn"
                        onClick={() => {
                          setSignInRoleTab(roleRestriction.targetPortal);
                          setSignInEmail(roleRestriction.emailOrId);
                          setRoleRestriction(null);
                          setErrorMessage(null);
                          setShowRoleRestrictionModal(false);
                          setTimeout(() => {
                            const passInput = document.getElementById('signin-password-input');
                            if (passInput) passInput.focus();
                          }, 100);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <span>Switch to {roleRestriction.targetPortal === 'MANAGER' ? 'Manager Portal' : 'Instructor Portal'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : roleConflict ? (
              <div id="role-conflict-banner" className="mx-6 mt-6 p-4 rounded-2xl border-2 border-rose-300 bg-rose-50/95 text-rose-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                        Role Conflict
                      </span>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-200/80 px-2.5 py-0.5 rounded-full border border-rose-300">
                        Separate Tables Enforced
                      </span>
                    </div>
                    <p className="text-sm font-bold text-rose-950 mt-1">
                      Cross-Role Account Creation Restricted
                    </p>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      {roleConflict.message}
                    </p>
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        id="role-conflict-signin-btn"
                        onClick={() => {
                          setActiveTab('signin');
                          setSignInRoleTab(roleConflict.targetPortal);
                          setSignInEmail(roleConflict.emailOrId);
                          setRoleConflict(null);
                          setErrorMessage(null);
                          setShowRoleConflictModal(false);
                          setTimeout(() => {
                            const passInput = document.getElementById('signin-password-input');
                            if (passInput) passInput.focus();
                          }, 100);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <span>Sign In to {roleConflict.targetPortal === 'MANAGER' ? 'Manager Portal' : 'Instructor Portal'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : accountAlreadyExists ? (
              <div id="account-already-exists-banner" className="mx-6 mt-6 p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/95 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                        Account Detected
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                        Already Registered
                      </span>
                    </div>
                    <p className="text-sm font-bold text-amber-950 mt-1">
                      This account already exists.
                    </p>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      {accountAlreadyExists.message || 'You can directly sign in; there is no need to create an account.'}
                    </p>
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        id="account-already-exists-signin-btn"
                        onClick={() => {
                          setActiveTab('signin');
                          setSignInEmail(accountAlreadyExists.emailOrId);
                          if (accountAlreadyExists.role) {
                            setSignInRoleTab(accountAlreadyExists.role as 'TRAINER' | 'MANAGER');
                          }
                          setAccountAlreadyExists(null);
                          setErrorMessage(null);
                          setShowAccountExistsModal(false);
                          setTimeout(() => {
                            const passInput = document.getElementById('signin-password-input');
                            if (passInput) passInput.focus();
                          }, 100);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <span>Sign In Directly</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('forgot_password');
                          setResetEmail(accountAlreadyExists.emailOrId);
                          setAccountAlreadyExists(null);
                          setErrorMessage(null);
                          setShowAccountExistsModal(false);
                        }}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                      >
                        Forgot Password? Reset Here
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : isWrongPassword ? (
              <div id="wrong-password-landing-alert" className="mx-6 mt-6 p-4 rounded-2xl border-2 border-rose-300 bg-rose-50/95 text-rose-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                        Authentication Failed
                      </span>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-200/80 px-2.5 py-0.5 rounded-full border border-rose-300">
                        Wrong Password
                      </span>
                    </div>
                    <p className="text-sm font-bold text-rose-900 mt-1">
                      You have entered a wrong password, type again
                    </p>
                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const passInput = document.getElementById('signin-password-input');
                          if (passInput) {
                            (passInput as HTMLInputElement).value = '';
                            setSignInPassword('');
                            passInput.focus();
                          }
                        }}
                        className="text-xs font-bold text-rose-800 hover:text-rose-950 underline cursor-pointer"
                      >
                        Type Password Again →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('forgot_password');
                          setResetEmail(signInEmail);
                          setErrorMessage(null);
                          setIsWrongPassword(false);
                        }}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : errorMessage ? (
              <div className="mx-6 mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-900">Authentication Alert</p>
                  <p className="mt-0.5 text-rose-700">{errorMessage}</p>
                </div>
              </div>
            ) : null}

            {successMessage && (
              <div className="mx-6 mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900">Success</p>
                  <p className="mt-0.5 text-emerald-700">{successMessage}</p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 1. SIGN IN VIEW (Unified with Role Selector & 1-Click Evaluation) */}
            {/* ========================================================================= */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignIn} className="p-6 sm:p-8 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sign In to Workspace</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select your intended portal or enter your credentials directly.
                  </p>
                </div>

                {/* Role Switcher Filter for Sign In (Trainer vs Manager only) */}
                <div>
                  <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-600">
                    <button
                      type="button"
                      id="signin-role-tab-trainer"
                      onClick={() => {
                        setSignInRoleTab('TRAINER');
                        setIsWrongPassword(false);
                        setIsUserNotFound(false);
                        setRoleRestriction(null);
                        setErrorMessage(null);
                      }}
                      className={`py-2 text-center rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        signInRoleTab === 'TRAINER' ? 'bg-white text-sky-700 shadow-xs font-bold ring-1 ring-slate-200' : 'hover:text-slate-900'
                      }`}
                    >
                      <UserCheck className="h-4 w-4 text-sky-600" />
                      <span>Instructor Sign-In</span>
                    </button>
                    <button
                      type="button"
                      id="signin-role-tab-manager"
                      onClick={() => {
                        setSignInRoleTab('MANAGER');
                        setIsWrongPassword(false);
                        setIsUserNotFound(false);
                        setRoleRestriction(null);
                        setErrorMessage(null);
                      }}
                      className={`py-2 text-center rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        signInRoleTab === 'MANAGER' ? 'bg-white text-blue-800 shadow-xs font-bold ring-1 ring-slate-200' : 'hover:text-slate-900'
                      }`}
                    >
                      <ShieldAlert className="h-4 w-4 text-blue-700" />
                      <span>Manager Sign-In</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {signInRoleTab === 'MANAGER' 
                        ? 'Manager Work Email or NW ID' 
                        : 'Instructor Email or NW ID (e.g. NW1048)'}
                    </label>
                    <div className="relative">
                      <Mail className={`absolute left-3.5 top-3.5 h-4 w-4 ${isUserNotFound ? 'text-rose-500' : 'text-sky-600/70'}`} />
                      <input
                        type="text"
                        required
                        id="signin-email-input"
                        value={signInEmail}
                        onChange={(e) => {
                          setSignInEmail(e.target.value);
                          if (isUserNotFound) {
                            setIsUserNotFound(false);
                            setErrorMessage(null);
                          }
                        }}
                        placeholder={
                          signInRoleTab === 'MANAGER'
                            ? 'sarah.jenkins@enterprise.com or NW2001'
                            : 'instructor.alex@enterprise.com or NW1048'
                        }
                        className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
                          isUserNotFound
                            ? 'border-rose-400 bg-rose-50/30 text-rose-950 focus:border-rose-500 focus:ring-rose-500/20'
                            : 'border-sky-200 bg-sky-50/30 text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-sky-500/20'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-semibold ${isWrongPassword ? 'text-rose-800 font-bold' : 'text-slate-700'}`}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('forgot_password');
                          setResetEmail(signInEmail);
                          setErrorMessage(null);
                          setIsWrongPassword(false);
                        }}
                        className="text-xs text-sky-600 hover:text-sky-800 font-medium hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className={`absolute left-3.5 top-3.5 h-4 w-4 ${isWrongPassword ? 'text-rose-600' : 'text-sky-600/70'}`} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        id="signin-password-input"
                        value={signInPassword}
                        onChange={(e) => {
                          setSignInPassword(e.target.value);
                          if (isWrongPassword) {
                            setIsWrongPassword(false);
                            setErrorMessage(null);
                          }
                        }}
                        placeholder="••••••••"
                        className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-colors ${
                          isWrongPassword
                            ? 'border-rose-400 bg-rose-50/50 text-rose-950 focus:border-rose-500 focus:ring-rose-500/20 ring-1 ring-rose-400'
                            : 'border-sky-200 bg-sky-50/30 text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-sky-500/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3.5 top-3 ${isWrongPassword ? 'text-rose-600 hover:text-rose-800' : 'text-slate-400 hover:text-slate-600'} cursor-pointer`}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {isWrongPassword && (
                      <div id="signin-inline-wrong-password-alert" className="mt-2.5 p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 shadow-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow-2xs mt-0.5">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider bg-rose-200/80 px-2 py-0.5 rounded-full border border-rose-300">
                              Authentication Notice
                            </span>
                          </div>
                          <p id="signin-password-error" className="text-xs font-bold text-rose-900 mt-1">
                            You have entered a wrong password, type again
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const passInput = document.getElementById('signin-password-input');
                                if (passInput) {
                                  (passInput as HTMLInputElement).value = '';
                                  setSignInPassword('');
                                  passInput.focus();
                                }
                              }}
                              className="text-xs font-bold text-rose-800 hover:text-rose-950 underline cursor-pointer"
                            >
                              Type Password Again →
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('forgot_password');
                                setResetEmail(signInEmail);
                                setErrorMessage(null);
                                setIsWrongPassword(false);
                              }}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                            >
                              Reset Password
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  id="signin-submit-btn"
                  disabled={isSubmitting || authLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-sky-600/25 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-white shrink-0" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ========================================================================= */}
            {/* 2. FORGOT PASSWORD & DIRECT RESET VIEW */}
            {/* ========================================================================= */}
            {activeTab === 'forgot_password' && (
              <div className="p-6 sm:p-8 space-y-5">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      setResetStep('request');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 font-semibold mb-3 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Sign In
                  </button>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {resetStep === 'request' ? 'Reset Your Password' : 'Set New Account Password'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {resetStep === 'request'
                      ? 'Enter your registered company email or Instructor ID (e.g. NW1048). We will locate your account and enable instant password restoration.'
                      : 'Create and confirm your new secure password to instantly regain access to your workspace.'}
                  </p>
                </div>

                {resetStep === 'request' ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Registered Company Email or Employee ID
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                        <input
                          type="text"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="e.g. instructor.alex@enterprise.com or NW1048"
                          className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-sky-600/25 transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-white shrink-0" />
                          <span>Verifying Account...</span>
                        </div>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4" />
                          <span>Verify Account & Reset Password</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleDirectPasswordUpdate} className="space-y-4 animate-in fade-in slide-in-from-right-2">
                    {/* Account Verified Header */}
                    <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {matchedResetUser?.fullName || 'Verified Account'}
                          </p>
                          <span className="text-[9px] font-bold bg-sky-200/80 text-sky-800 px-1.5 py-0.2 rounded-sm">
                            {matchedResetUser?.role || 'TRAINER'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          {matchedResetUser?.companyEmail || resetEmail} • ID: {matchedResetUser?.employeeId || 'Verified'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newResetPassword}
                          onChange={(e) => setNewResetPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={confirmResetPassword}
                          onChange={(e) => setConfirmResetPassword(e.target.value)}
                          placeholder="Re-enter your new password"
                          className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setResetStep('request');
                          setErrorMessage(null);
                        }}
                        className="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-sky-600/25 transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-white shrink-0" />
                            <span>Updating...</span>
                          </div>
                        ) : (
                          <>
                            <KeyRound className="h-4 w-4" />
                            <span>Save Password & Sign In</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 3. SIGN UP / CREATE ACCOUNT: STEP 1 - ROLE SELECTION GATE */}
            {/* ========================================================================= */}
            {activeTab === 'signup' && selectedRole === null && (
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Select Your Organization Role</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Choose whether you are registering as an <strong>Instructor</strong> or a <strong>Training Manager / Team Lead</strong>. You will be redirected to the dedicated registration portal.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Instructor Choice Card */}
                  <button
                    type="button"
                    id="select-role-trainer-btn"
                    onClick={() => {
                      setSelectedRole('TRAINER');
                      setErrorMessage(null);
                    }}
                    className="group flex flex-col justify-between p-5 rounded-2xl border-2 border-sky-200/80 bg-linear-to-b from-sky-50/50 to-white text-left hover:border-sky-500 hover:shadow-lg hover:shadow-sky-500/10 transition-all cursor-pointer"
                  >
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-600/20 mb-4 group-hover:scale-105 transition-transform">
                        <UserCheck className="h-6 w-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">Instructor Portal</h3>
                        <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5">
                          ID: NW...
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        For instructors, educators, and mentors. Log daily lectures, manage batches, track project milestones, and submit EOD reports.
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-sky-100 flex items-center justify-between text-xs font-bold text-sky-600 group-hover:text-sky-700">
                      <span>Register as Instructor</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Option 2: Manager Choice Card */}
                  <button
                    type="button"
                    id="select-role-manager-btn"
                    onClick={() => {
                      setSelectedRole('MANAGER');
                      setErrorMessage(null);
                    }}
                    className="group flex flex-col justify-between p-5 rounded-2xl border-2 border-blue-200/80 bg-linear-to-b from-blue-50/40 to-white text-left hover:border-blue-600 hover:shadow-lg hover:shadow-blue-600/10 transition-all cursor-pointer"
                  >
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-md shadow-blue-700/20 mb-4 group-hover:scale-105 transition-transform">
                        <ShieldAlert className="h-6 w-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">Manager Portal</h3>
                        <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5">
                          Protected
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        For team leads, department heads, and managers. Requires an <strong>Enterprise Manager Security Passcode</strong> to verify executive authority.
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-800">
                      <span>Register as Manager</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('signin')}
                      className="text-sky-600 font-semibold hover:underline"
                    >
                      Sign In here
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. DEDICATED TRAINER REGISTRATION FORM */}
            {/* ========================================================================= */}
            {activeTab === 'signup' && selectedRole === 'TRAINER' && (
              <form onSubmit={handleTrainerSignUp} className="p-6 sm:p-8 space-y-5">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(null);
                      setErrorMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 font-semibold mb-2"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Role Selection
                  </button>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Instructor Registration</h2>
                    <span className="rounded-full bg-sky-100 border border-sky-200 text-sky-800 text-[11px] font-bold px-3 py-0.5">
                      Instructor Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete your instructor profile. Employee ID must start with <strong>NW</strong> with no spaces or hashtags.
                  </p>
                </div>

                {/* Department Selection (Frontend, Backend, GenAI) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Select Assigned Department
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ENTERPRISE_DEPARTMENTS.map((dept) => {
                      const isSelected = trainerForm.department === dept.id;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => handleTrainerDepartmentChange(dept.id)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'border-sky-500 bg-sky-50 text-sky-900 font-bold ring-2 ring-sky-500/20'
                              : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {dept.id === 'Frontend' && <Code2 className={`h-4 w-4 mb-1 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />}
                          {dept.id === 'Backend' && <Server className={`h-4 w-4 mb-1 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />}
                          {dept.id === 'GenAI' && <Cpu className={`h-4 w-4 mb-1 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />}
                          <span className="text-xs">{dept.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Legal Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                      <input
                        type="text"
                        required
                        id="trainer-fullname-input"
                        value={trainerForm.fullName}
                        onChange={(e) => setTrainerForm({ ...trainerForm, fullName: e.target.value })}
                        placeholder="Enter your full name"
                        className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  {/* Instructor Employee ID (Must start with NW, no spaces, no hashtags) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Instructor ID (Starts with <span className="text-sky-600 font-bold">NW</span>)
                    </label>
                    <div className="relative">
                      <BadgeCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                      <input
                        type="text"
                        required
                        id="trainer-empid-input"
                        value={trainerForm.employeeId}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[\s#-]/g, '');
                          setTrainerForm({ ...trainerForm, employeeId: val });
                        }}
                        placeholder="e.g. NW1048"
                        className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 font-mono font-bold tracking-wide"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Must start with <strong>NW</strong> (e.g. NW1048). No spaces or hashtags.
                    </span>
                  </div>

                  {/* Work Email */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Company Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                      <input
                        type="email"
                        required
                        id="trainer-email-input"
                        value={trainerForm.companyEmail}
                        onChange={(e) => setTrainerForm({ ...trainerForm, companyEmail: e.target.value })}
                        placeholder="Enter your company work email (e.g. trainer@enterprise.com)"
                        className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        id="trainer-password-input"
                        value={trainerForm.password}
                        onChange={(e) => setTrainerForm({ ...trainerForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        id="trainer-confirmpassword-input"
                        value={trainerForm.confirmPassword}
                        onChange={(e) => setTrainerForm({ ...trainerForm, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  {/* Job Designation with Role-Based Options */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Job Designation (Role)
                      </label>
                      <span className="text-[10px] text-slate-400">Select a role or type your custom designation</span>
                    </div>
                    <div className="relative mb-2">
                      <Briefcase className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                      <input
                        type="text"
                        required
                        id="trainer-designation-input"
                        value={trainerForm.designation}
                        onChange={(e) => setTrainerForm({ ...trainerForm, designation: e.target.value })}
                        placeholder="e.g. Software Development Instructor, Lead Instructor, Mentor"
                        className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                    {/* Role Suggestion Pills */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] font-medium text-slate-500 mr-1">Role suggestions:</span>
                      {[
                        'Software Development Instructor',
                        'Lead Instructor',
                        'Mentor',
                      ].map((roleOption) => (
                        <button
                          key={roleOption}
                          type="button"
                          onClick={() => setTrainerForm({ ...trainerForm, designation: roleOption })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                            trainerForm.designation === roleOption
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800'
                          }`}
                        >
                          {roleOption}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Subject Domain */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Primary Subject / Specialization
                    </label>
                    <div className="relative mb-2">
                      <BookOpen className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                      <input
                        type="text"
                        value={trainerForm.subject}
                        onChange={(e) => setTrainerForm({ ...trainerForm, subject: e.target.value })}
                        placeholder="e.g. Software Development, Frontend Web Engineering"
                        className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                    {/* Subject Suggestion Pills */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] font-medium text-slate-500 mr-1">Subject suggestions:</span>
                      {[
                        'Software Development',
                        'Frontend Web Engineering',
                        'Backend & Distributed Systems',
                        'Generative AI & LLMs',
                      ].map((subjOption) => (
                        <button
                          key={subjOption}
                          type="button"
                          onClick={() => setTrainerForm({ ...trainerForm, subject: subjOption })}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                            trainerForm.subject === subjOption
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-800'
                          }`}
                        >
                          {subjOption}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Office Location / Deployment Location */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Office Location / Deployment Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-600/70" />
                      <input
                        type="text"
                        value={trainerForm.location}
                        onChange={(e) => setTrainerForm({ ...trainerForm, location: e.target.value })}
                        placeholder="e.g. Hyderabad, Bengaluru, Chennai, Remote (Office / Deployment Location)"
                        className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                      />
                    </div>
                  </div>

                  {/* Reporting Manager Dropdown Box & Auto-populated Fields */}
                  <div className="sm:col-span-2 rounded-2xl border border-sky-200 bg-sky-50/40 p-4 space-y-3.5">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-sky-600 shrink-0" />
                      <label className="block text-xs font-bold text-slate-800">
                        Reporting Manager (Direct Manager Assignment)
                      </label>
                    </div>

                    {/* Manager Dropdown Box */}
                    <div className="space-y-1.5" ref={managerDropdownRef}>
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Select Reporting Manager <span className="text-sky-600 font-normal">(Auto-fills Name & Work Email)</span>
                        </label>
                        {trainerForm.managerName && (
                          <button
                            type="button"
                            onClick={handleClearManager}
                            className="text-[10px] font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                          >
                            Clear Selection
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          id="trainer-manager-dropdown-trigger"
                          onClick={() => setIsManagerDropdownOpen(prev => !prev)}
                          className={`w-full text-left rounded-xl border px-3.5 py-2.5 text-xs transition-all flex items-center justify-between cursor-pointer ${
                            trainerForm.managerName
                              ? 'border-sky-300 bg-white shadow-xs'
                              : 'border-sky-200 bg-white hover:border-sky-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="h-7 w-7 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 font-bold text-xs shrink-0">
                              {trainerForm.managerName ? trainerForm.managerName.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
                            </div>
                            {trainerForm.managerName ? (
                              <div className="truncate">
                                <span className="font-bold text-slate-900">{trainerForm.managerName}</span>
                                {trainerForm.managerEmail && (
                                  <span className="ml-2 text-[11px] text-slate-500">({trainerForm.managerEmail})</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">Click to choose reporting manager from dropdown...</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {isManagerDropdownOpen ? (
                              <ChevronUp className="h-4 w-4 text-sky-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Dropdown Menu */}
                        {isManagerDropdownOpen && (
                          <div className="absolute z-30 mt-1.5 w-full rounded-2xl border border-sky-200 bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            {/* Search Box */}
                            <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
                              <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <input
                                  type="text"
                                  value={managerSearchQuery}
                                  onChange={(e) => setManagerSearchQuery(e.target.value)}
                                  placeholder="Search manager by name, email, or department..."
                                  className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden"
                                  autoFocus
                                />
                                {managerSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setManagerSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* List of Registered Managers from Database */}
                            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
                              {registeredManagers
                                .filter(m => {
                                  if (!managerSearchQuery.trim()) return true;
                                  const q = managerSearchQuery.toLowerCase();
                                  return (
                                    m.fullName.toLowerCase().includes(q) ||
                                    m.companyEmail.toLowerCase().includes(q) ||
                                    (m.department && m.department.toLowerCase().includes(q)) ||
                                    (m.employeeId && m.employeeId.toLowerCase().includes(q))
                                  );
                                })
                                .map((mgr) => {
                                  const isSelected = 
                                    trainerForm.managerEmail.toLowerCase() === mgr.companyEmail.toLowerCase() ||
                                    trainerForm.managerName.toLowerCase() === mgr.fullName.toLowerCase();

                                  return (
                                    <button
                                      key={mgr.uid || mgr.companyEmail}
                                      type="button"
                                      onClick={() => handleSelectManager(mgr)}
                                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                                        isSelected
                                          ? 'bg-sky-50 text-sky-900 font-medium'
                                          : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                          isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                          {mgr.fullName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 text-left">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-xs text-slate-900 truncate">
                                              {mgr.fullName}
                                            </span>
                                            {mgr.department && (
                                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">
                                                {mgr.department}
                                              </span>
                                            )}
                                            {mgr.employeeId && (
                                              <span className="text-[10px] text-slate-400 font-mono">
                                                {mgr.employeeId}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                                            <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                                            <span className="truncate">{mgr.companyEmail}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {isSelected && (
                                        <div className="h-5 w-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                                          <Check className="h-3 w-3" />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}

                              {registeredManagers.length === 0 && (
                                <div className="p-4 text-center text-xs text-slate-500">
                                  No registered managers found in database. You can type manager details manually below.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Auto-populated Manager Fields (reflecting selected manager data) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-600">
                            Manager Name
                          </label>
                          {trainerForm.managerName && (
                            <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Auto-populated
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-sky-600/70" />
                          <input
                            type="text"
                            id="trainer-manager-name-input"
                            value={trainerForm.managerName}
                            onChange={(e) => setTrainerForm({ ...trainerForm, managerName: e.target.value })}
                            placeholder="Selected manager's name"
                            className="w-full rounded-xl border border-sky-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-semibold text-slate-600">
                            Manager Work Email
                          </label>
                          {trainerForm.managerEmail && (
                            <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Auto-populated
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-sky-600/70" />
                          <input
                            type="email"
                            id="trainer-manager-email-input"
                            value={trainerForm.managerEmail}
                            onChange={(e) => setTrainerForm({ ...trainerForm, managerEmail: e.target.value })}
                            placeholder="Selected manager's work email (e.g. manager@enterprise.com)"
                            className="w-full rounded-xl border border-sky-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-sky-700/80">
                      Selecting your manager from the dropdown automatically maps your instructor workspace, classes, tasks, and performance updates to your manager&apos;s portal.
                    </p>
                  </div>
                </div>

                {accountAlreadyExists && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="font-semibold">Account already exists! You can directly sign in.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('signin');
                        setSignInEmail(accountAlreadyExists.emailOrId);
                        setSignInRoleTab('TRAINER');
                        setAccountAlreadyExists(null);
                        setErrorMessage(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      Sign In →
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  id="trainer-signup-submit-btn"
                  disabled={isSubmitting || authLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-sky-600/25 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-white shrink-0" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <>
                      <span>Complete Instructor Registration</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ========================================================================= */}
            {/* 5. DEDICATED MANAGER REGISTRATION FORM (With Security Passcode) */}
            {/* ========================================================================= */}
            {activeTab === 'signup' && selectedRole === 'MANAGER' && (
              <form onSubmit={handleManagerSignUp} className="p-6 sm:p-8 space-y-5">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(null);
                      setErrorMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 font-semibold mb-2"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Role Selection
                  </button>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manager Account Provisioning</h2>
                    <span className="rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-semibold px-2.5 py-0.5 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      Protected Console
                    </span>
                  </div>
                </div>

                {/* Manager Passcode */}
                <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-sky-600" />
                      Manager Passcode *
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Required
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showPasscode ? 'text' : 'password'}
                      required
                      id="manager-security-passcode-input"
                      value={managerForm.managerSecurityPasscode}
                      onChange={(e) => setManagerForm({ ...managerForm, managerSecurityPasscode: e.target.value })}
                      placeholder="Enter manager organization passcode"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500/20 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode(!showPasscode)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPasscode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Manager Department Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Managed Department Cohort
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ENTERPRISE_DEPARTMENTS.map((dept) => {
                      const isSelected = managerForm.department === dept.id;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => handleManagerDepartmentChange(dept.id)}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {dept.id === 'Frontend' && <Code2 className={`h-4 w-4 mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />}
                          {dept.id === 'Backend' && <Server className={`h-4 w-4 mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />}
                          {dept.id === 'GenAI' && <Cpu className={`h-4 w-4 mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />}
                          <span className="text-xs">{dept.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-blue-600/70" />
                      <input
                        type="text"
                        required
                        id="manager-fullname-input"
                        value={managerForm.fullName}
                        onChange={(e) => setManagerForm({ ...managerForm, fullName: e.target.value })}
                        placeholder="Enter your full name"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Manager ID */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Manager ID (Starts with <span className="text-blue-700 font-bold">NW</span>)
                    </label>
                    <div className="relative">
                      <BadgeCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-blue-600/70" />
                      <input
                        type="text"
                        required
                        id="manager-empid-input"
                        value={managerForm.employeeId}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[\s#-]/g, '');
                          setManagerForm({ ...managerForm, employeeId: val });
                        }}
                        placeholder="e.g. NW2001"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 font-mono font-bold"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Must start with <strong>NW</strong> (e.g. NW2001). No spaces or hashtags.
                    </span>
                  </div>

                  {/* Work Email */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Executive / Manager Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-blue-600/70" />
                      <input
                        type="email"
                        required
                        id="manager-email-input"
                        value={managerForm.companyEmail}
                        onChange={(e) => setManagerForm({ ...managerForm, companyEmail: e.target.value })}
                        placeholder="Enter your executive email (e.g. manager@enterprise.com)"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-blue-600/70" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        id="manager-password-input"
                        value={managerForm.password}
                        onChange={(e) => setManagerForm({ ...managerForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-blue-600/70" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        id="manager-confirmpassword-input"
                        value={managerForm.confirmPassword}
                        onChange={(e) => setManagerForm({ ...managerForm, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Management Designation (Role) with Suggestions */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Management Designation (Role)
                      </label>
                      <span className="text-[10px] text-slate-400">Select role suggestion or enter custom title</span>
                    </div>
                    <div className="relative mb-2">
                      <Briefcase className="absolute left-3.5 top-3.5 h-4 w-4 text-blue-600/70" />
                      <input
                        type="text"
                        required
                        id="manager-designation-input"
                        value={managerForm.designation}
                        onChange={(e) => setManagerForm({ ...managerForm, designation: e.target.value })}
                        placeholder="e.g. Capability Manager"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    {/* Manager Role Suggestion Pills */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] font-medium text-slate-500 mr-1">Role suggestions:</span>
                      {[
                        'Capability Manager',
                      ].map((roleOption) => (
                        <button
                          key={roleOption}
                          type="button"
                          onClick={() => setManagerForm({ ...managerForm, designation: roleOption })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                            managerForm.designation === roleOption
                              ? 'bg-blue-700 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800'
                          }`}
                        >
                          {roleOption}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {accountAlreadyExists && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="font-semibold">Account already exists! You can directly sign in.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('signin');
                        setSignInEmail(accountAlreadyExists.emailOrId);
                        setSignInRoleTab('MANAGER');
                        setAccountAlreadyExists(null);
                        setErrorMessage(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      Sign In →
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  id="manager-signup-submit-btn"
                  disabled={isSubmitting || authLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-700/25 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-white shrink-0" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4" />
                      <span>Authorize & Create Manager Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* INCORRECT PASSWORD POP-UP MODAL */}
      {/* ========================================================================= */}
      {showWrongPasswordModal && (
        <div 
          id="wrong-password-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wrong-password-modal-title"
        >
          <div 
            id="wrong-password-modal"
            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-rose-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
          >
            {/* Close button */}
            <button
              type="button"
              id="wrong-password-modal-close-btn"
              onClick={() => setShowWrongPasswordModal(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <span className="text-lg font-bold leading-none">&times;</span>
            </button>

            {/* Warning Shield Badge */}
            <div className="h-16 w-16 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mb-3.5 shadow-inner">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-2">
              <Lock className="h-3 w-3" />
              Authentication Alert
            </div>

            <h3 id="wrong-password-modal-title" className="text-xl font-bold text-slate-900">
              You have entered a wrong password, type again
            </h3>

            {signInEmail && (
              <div className="mt-3.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium flex items-center justify-center gap-2 max-w-xs truncate">
                <span className="text-slate-400 text-[11px]">Account:</span>
                <span className="font-bold text-slate-900 truncate">{signInEmail}</span>
              </div>
            )}

            {/* Actions */}
            <div className="w-full mt-6 space-y-2.5">
              <button
                type="button"
                id="wrong-password-try-again-btn"
                onClick={() => {
                  setShowWrongPasswordModal(false);
                  setSignInPassword('');
                  setTimeout(() => {
                    const passInput = document.getElementById('signin-password-input');
                    if (passInput) passInput.focus();
                  }, 50);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>

              <button
                type="button"
                id="wrong-password-reset-btn"
                onClick={() => {
                  setShowWrongPasswordModal(false);
                  setActiveTab('forgot_password');
                  setResetStep('request');
                  setResetEmail(signInEmail);
                  setErrorMessage(null);
                  setIsWrongPassword(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-sky-200 bg-sky-50/60 hover:bg-sky-100 text-sky-800 text-xs font-semibold transition-all cursor-pointer"
              >
                <KeyRound className="h-4 w-4 text-sky-600" />
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACCOUNT ALREADY EXISTS POP-UP MODAL */}
      {/* ========================================================================= */}
      {showAccountExistsModal && accountAlreadyExists && (
        <div 
          id="account-exists-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-exists-modal-title"
        >
          <div 
            id="account-exists-modal"
            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-200 flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
          >
            {/* Close button */}
            <button
              type="button"
              id="account-exists-modal-close-btn"
              onClick={() => setShowAccountExistsModal(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <span className="text-lg font-bold leading-none">&times;</span>
            </button>

            {/* Warning / Account Badge */}
            <div className="h-16 w-16 rounded-2xl bg-amber-100 text-amber-600 border border-amber-200 flex items-center justify-center mb-3.5 shadow-inner">
              <UserCheck className="h-8 w-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">
              <ShieldAlert className="h-3 w-3" />
              Account Exists
            </div>

            <h3 id="account-exists-modal-title" className="text-xl font-bold text-slate-900">
              Account Already Exists
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-xs">
              An account with these credentials is already registered in the system. You can directly sign in; there is no need to create an account.
            </p>

            {accountAlreadyExists.emailOrId && (
              <div className="mt-3.5 px-3.5 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 font-medium flex items-center justify-center gap-2 max-w-xs truncate">
                <span className="text-amber-700 text-[11px]">Registered ID/Email:</span>
                <span className="font-bold text-amber-950 truncate">{accountAlreadyExists.emailOrId}</span>
              </div>
            )}

            {/* Actions */}
            <div className="w-full mt-6 space-y-2.5">
              <button
                type="button"
                id="account-exists-modal-signin-btn"
                onClick={() => {
                  setShowAccountExistsModal(false);
                  setActiveTab('signin');
                  setSignInEmail(accountAlreadyExists.emailOrId);
                  if (accountAlreadyExists.role) {
                    setSignInRoleTab(accountAlreadyExists.role as 'TRAINER' | 'MANAGER');
                  }
                  setAccountAlreadyExists(null);
                  setErrorMessage(null);
                  setTimeout(() => {
                    const passInput = document.getElementById('signin-password-input');
                    if (passInput) passInput.focus();
                  }, 100);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer"
              >
                <span>Sign In Directly</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                id="account-exists-modal-reset-btn"
                onClick={() => {
                  setShowAccountExistsModal(false);
                  setActiveTab('forgot_password');
                  setResetStep('request');
                  setResetEmail(accountAlreadyExists.emailOrId);
                  setErrorMessage(null);
                  setAccountAlreadyExists(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-all cursor-pointer"
              >
                <KeyRound className="h-4 w-4 text-slate-600" />
                Forgot Password? Reset Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROLE RESTRICTION POP-UP MODAL (Portal Access Constraint) */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ROLE RESTRICTION POP-UP MODAL (Friendly Portal Access Guidance) */}
      {/* ========================================================================= */}
      {showRoleRestrictionModal && roleRestriction && (
        <div 
          id="role-restriction-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-restriction-modal-title"
        >
          <div 
            id="role-restriction-modal"
            className={`relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border flex flex-col items-center text-center animate-in zoom-in-95 duration-200 ${
              roleRestriction.targetPortal === 'TRAINER' ? 'border-sky-200' : 'border-indigo-200'
            }`}
          >
            {/* Close button */}
            <button
              type="button"
              id="role-restriction-modal-close-btn"
              onClick={() => setShowRoleRestrictionModal(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <span className="text-lg font-bold leading-none">&times;</span>
            </button>

            {/* Polite Friendly Badge Icon */}
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-3.5 shadow-inner ${
              roleRestriction.targetPortal === 'TRAINER' 
                ? 'bg-sky-100 text-sky-700 border border-sky-200' 
                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}>
              {roleRestriction.targetPortal === 'TRAINER' ? (
                <GraduationCap className="h-8 w-8 text-sky-600" />
              ) : (
                <UserCheck className="h-8 w-8 text-indigo-600" />
              )}
            </div>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 ${
              roleRestriction.targetPortal === 'TRAINER'
                ? 'bg-sky-50 border border-sky-200 text-sky-800'
                : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
            }`}>
              <Sparkles className="h-3 w-3" />
              {roleRestriction.targetPortal === 'TRAINER' ? 'Instructor Account' : 'Manager Account'}
            </div>

            <h3 id="role-restriction-modal-title" className="text-xl font-bold text-slate-900">
              {roleRestriction.targetPortal === 'TRAINER' ? 'Instructor Account' : 'Manager Portal Required'}
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-xs">
              {roleRestriction.message}
            </p>

            {roleRestriction.emailOrId && (
              <div className="mt-3.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium flex items-center justify-center gap-2 max-w-xs truncate">
                <span className="text-slate-500 text-[11px]">Account ID / Email:</span>
                <span className="font-bold text-slate-900 truncate">{roleRestriction.emailOrId}</span>
              </div>
            )}

            {/* Actions: Sign In, Register as Instructor, or Cancel */}
            <div className="w-full mt-6 space-y-2.5">
              <button
                type="button"
                id="role-restriction-modal-switch-btn"
                onClick={() => {
                  const target = roleRestriction.targetPortal;
                  const emailToCarry = roleRestriction.emailOrId;
                  setShowRoleRestrictionModal(false);
                  setActiveTab('signin');
                  setSignInRoleTab(target);
                  if (emailToCarry) {
                    setSignInEmail(emailToCarry);
                  }
                  setSignInPassword('');
                  setRoleRestriction(null);
                  setErrorMessage(null);
                  setIsWrongPassword(false);
                  setShowWrongPasswordModal(false);
                  setTimeout(() => {
                    const passInput = document.getElementById('signin-password-input');
                    if (passInput) passInput.focus();
                  }, 150);
                }}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer ${
                  roleRestriction.targetPortal === 'TRAINER'
                    ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                }`}
              >
                <span>Sign In via {roleRestriction.targetPortal === 'MANAGER' ? 'Manager Portal' : 'Instructor Portal'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {roleRestriction.targetPortal === 'TRAINER' && (
                <button
                  type="button"
                  id="role-restriction-modal-register-btn"
                  onClick={() => {
                    const emailToCarry = roleRestriction.emailOrId;
                    setShowRoleRestrictionModal(false);
                    setActiveTab('signup');
                    setSelectedRole('TRAINER');
                    if (emailToCarry) {
                      if (emailToCarry.includes('@')) {
                        setTrainerForm(prev => ({ ...prev, companyEmail: emailToCarry }));
                      } else {
                        setTrainerForm(prev => ({ ...prev, employeeId: emailToCarry }));
                      }
                    }
                    setRoleRestriction(null);
                    setErrorMessage(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-800 text-xs font-semibold transition-all cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5 text-sky-600" />
                  <span>Register as an Instructor</span>
                </button>
              )}

              <button
                type="button"
                id="role-restriction-modal-dismiss-btn"
                onClick={() => setShowRoleRestrictionModal(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROLE CONFLICT POP-UP MODAL (Account Registration Guidance) */}
      {/* ========================================================================= */}
      {showRoleConflictModal && roleConflict && (
        <div 
          id="role-conflict-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-conflict-modal-title"
        >
          <div 
            id="role-conflict-modal"
            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-sky-200 flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
          >
            {/* Close button */}
            <button
              type="button"
              id="role-conflict-modal-close-btn"
              onClick={() => setShowRoleConflictModal(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <span className="text-lg font-bold leading-none">&times;</span>
            </button>

            {/* Friendly Badge Icon */}
            <div className="h-16 w-16 rounded-2xl bg-sky-100 text-sky-600 border border-sky-200 flex items-center justify-center mb-3.5 shadow-inner">
              <GraduationCap className="h-8 w-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-bold text-sky-800 uppercase tracking-wider mb-2">
              <Sparkles className="h-3 w-3" />
              Instructor Account
            </div>

            <h3 id="role-conflict-modal-title" className="text-xl font-bold text-slate-900">
              Instructor Profile
            </h3>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-xs">
              {roleConflict.message}
            </p>

            {roleConflict.emailOrId && (
              <div className="mt-3.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium flex items-center justify-center gap-2 max-w-xs truncate">
                <span className="text-slate-500 text-[11px]">Account ID / Email:</span>
                <span className="font-bold text-slate-900 truncate">{roleConflict.emailOrId}</span>
              </div>
            )}

            {/* Actions */}
            <div className="w-full mt-6 space-y-2.5">
              <button
                type="button"
                id="role-conflict-modal-signin-btn"
                onClick={() => {
                  setShowRoleConflictModal(false);
                  setActiveTab('signin');
                  setSignInRoleTab(roleConflict.targetPortal);
                  setSignInEmail(roleConflict.emailOrId);
                  setRoleConflict(null);
                  setErrorMessage(null);
                  setTimeout(() => {
                    const passInput = document.getElementById('signin-password-input');
                    if (passInput) passInput.focus();
                  }, 100);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              >
                <span>Sign In to {roleConflict.targetPortal === 'MANAGER' ? 'Manager Portal' : 'Instructor Portal'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                id="role-conflict-modal-dismiss-btn"
                onClick={() => setShowRoleConflictModal(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-all cursor-pointer"
              >
                Back to Registration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-sky-100 bg-white/90 px-6 py-4 text-center text-xs font-medium text-slate-500">
        Performance Management System • Enterprise Talent & Training Operations
      </footer>
    </div>
  );
};
