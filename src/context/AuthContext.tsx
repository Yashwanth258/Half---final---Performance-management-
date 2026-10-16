import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { seedEnterpriseDatabaseIfEmpty, SEED_TRAINERS, DEFAULT_MANAGER_SECURITY_PASSCODE } from '../lib/seedDatabase';
import { cleanFirestoreData } from '../lib/firestoreErrors';
import { upsertProfile, lookupCredentialsSupa, saveCredentialSupa } from '../lib/supabaseDb';

export interface RegisterUserData {
  fullName: string;
  companyEmail: string;
  employeeId: string;
  password?: string;
  role: UserRole;
  department?: string;
  teamId?: string;
  teamName?: string;
  designation: string;
  location?: string;
  subject?: string;
  managerId?: string;
  managerName?: string;
  managerEmail?: string;
  managerSecurityPasscode?: string; // Mandatory when role === 'MANAGER'
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  role: UserRole | null;
  isManager: boolean;
  isTrainer: boolean;
  login: (email: string, pass: string, portalRole?: 'MANAGER' | 'TRAINER' | 'TRAINEE') => Promise<void>;
  registerUser: (data: RegisterUserData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (emailOrEmpId: string) => Promise<{ success: boolean; emailSent: boolean; userFound: boolean; user?: UserProfile; message?: string }>;
  directUpdatePassword: (emailOrEmpId: string, newPass: string) => Promise<boolean>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  quickDemoLogin: (targetRole: 'MANAGER' | 'TRAINER' | 'TRAINEE') => void;
  isDemoMode: boolean;
}

const LOCAL_STORAGE_USER_KEY = 'trainer_workspace_active_uid';
const LOCAL_STORAGE_PROFILE_KEY = 'trainer_workspace_active_profile';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const savedProfileStr = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (savedProfileStr) {
        return JSON.parse(savedProfileStr);
      }
    } catch {
      // Ignore
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Default demo manager profile
  const DEMO_MANAGER_PROFILE: UserProfile = {
    uid: 'mgr-enterprise-01',
    employeeId: 'MGR-7701',
    fullName: 'Sarah Jenkins',
    companyEmail: 'sarah.jenkins@enterprise.com',
    role: 'MANAGER',
    teamId: 'team-cloud-ai',
    teamName: 'Enterprise Training & Talent Org',
    managerId: 'exec-global-00',
    managerName: 'Executive Leadership',
    designation: 'VP of Technical Enablement & Training',
    location: 'San Francisco, CA (HQ)',
    subject: 'Enterprise Curriculum Leadership',
    isActive: true,
    createdAt: '2025-01-10T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
  };

  useEffect(() => {
    // Seed initial enterprise records if empty
    seedEnterpriseDatabaseIfEmpty().catch(console.error);

    let unsubSnapshot: (() => void) | null = null;

    // 1. Check local storage for persistent session
    const restoreSavedSession = async () => {
      try {
        const savedUid = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        const savedProfileStr = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);

        if (savedUid) {
          // Listen to live user profile from Firestore
          const userRef = doc(db, 'users', savedUid);
          unsubSnapshot = onSnapshot(
            userRef,
            (snap) => {
              if (snap.exists()) {
                const profile = snap.data() as UserProfile;
                setUserProfile(profile);
                localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
              } else if (savedProfileStr) {
                try {
                  setUserProfile(JSON.parse(savedProfileStr));
                } catch {
                  // Ignore
                }
              }
              setLoading(false);
            },
            (err) => {
              console.warn('Live profile sync notice:', err);
              if (savedProfileStr) {
                try {
                  setUserProfile(JSON.parse(savedProfileStr));
                } catch {
                  // Ignore
                }
              }
              setLoading(false);
            }
          );
          return;
        }
      } catch (err) {
        console.warn('Session restoration notice:', err);
      }
      setLoading(false);
    };

    restoreSavedSession();

    // 2. Also listen for Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsDemoMode(false);
        try {
          // First check by uid
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const profile = snap.data() as UserProfile;
            setUserProfile(profile);
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, user.uid);
            localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
          } else if (user.email) {
            // Check by email in users collection
            const cleanEmail = user.email.trim().toLowerCase();
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('companyEmail', '==', cleanEmail));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              const profile = querySnap.docs[0].data() as UserProfile;
              setUserProfile(profile);
              localStorage.setItem(LOCAL_STORAGE_USER_KEY, querySnap.docs[0].id);
              localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
            } else {
              // Create default profile for authenticated user
              const newProf: UserProfile = {
                uid: user.uid,
                employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                fullName: user.displayName || user.email.split('@')[0],
                companyEmail: cleanEmail,
                role: 'TRAINER',
                teamId: 'team-cloud-ai',
                teamName: 'Cloud & AI Engineering',
                managerId: 'mgr-enterprise-01',
                managerName: 'Sarah Jenkins',
                designation: 'Technical Trainer',
                location: 'San Francisco, CA',
                subject: 'Engineering Enablement',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              await setDoc(doc(db, 'users', user.uid), cleanFirestoreData(newProf));
              setUserProfile(newProf);
              localStorage.setItem(LOCAL_STORAGE_USER_KEY, user.uid);
              localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(newProf));
            }
          }
        } catch (authSyncErr) {
          console.warn('Auth state changed sync notice:', authSyncErr);
        }
      }
      setLoading(false);
    });

    return () => {
      if (unsubSnapshot) unsubSnapshot();
      unsubscribeAuth();
    };
  }, []);

  const login = async (emailOrId: string, pass: string, portalRole?: 'MANAGER' | 'TRAINER' | 'TRAINEE') => {
    setLoading(true);
    const cleanInput = (emailOrId || '').trim();
    const cleanPass = (pass || '').trim();

    console.log('[Auth Login Entry] Attempting sign-in for:', cleanInput, '| Portal Role:', portalRole);

    if (!cleanInput) {
      setLoading(false);
      throw new Error('NO_ACCOUNT_FOUND: Please enter your work email or employee ID.');
    }

    if (!cleanPass) {
      setLoading(false);
      throw new Error('WRONG_PASSWORD: You have entered a wrong password, type again');
    }

    try {
      const lowerInput = cleanInput.toLowerCase();
      const upperInput = cleanInput.toUpperCase();
      const lookupKeys = [lowerInput, upperInput, cleanInput];

      let credData: any = null;
      let foundUid: string | null = null;
      let userProfileData: UserProfile | null = null;
      let isVerified = false;
      let detectedRole: UserRole | null = null;

      // =========================================================================
      // STEP 1: FAST-PATH SYNCHRONOUS CHECKS (Local Cache & Seed Registry)
      // =========================================================================

      // 1A. Check dedicated local cache tables
      try {
        const mgrAccountsRaw = localStorage.getItem('nxtwave_manager_accounts');
        const trainerAccountsRaw = localStorage.getItem('nxtwave_trainer_accounts');
        const genericAccountsRaw = localStorage.getItem('nxtwave_custom_accounts');

        const mgrAccounts = mgrAccountsRaw ? JSON.parse(mgrAccountsRaw) : {};
        const trainerAccounts = trainerAccountsRaw ? JSON.parse(trainerAccountsRaw) : {};
        const genericAccounts = genericAccountsRaw ? JSON.parse(genericAccountsRaw) : {};

        const cachedMgr = mgrAccounts[lowerInput] || mgrAccounts[upperInput] || mgrAccounts[cleanInput];
        const cachedTrainer = trainerAccounts[lowerInput] || trainerAccounts[upperInput] || trainerAccounts[cleanInput];
        const cachedGeneric = genericAccounts[lowerInput] || genericAccounts[upperInput] || genericAccounts[cleanInput];

        if (portalRole === 'MANAGER') {
          if (cachedTrainer) {
            throw new Error('ROLE_RESTRICTION: This account is registered as an Instructor. Please sign in through the Instructor Portal, or register as an Instructor.');
          }
          if (cachedMgr) {
            credData = cachedMgr;
            foundUid = cachedMgr.uid;
            detectedRole = 'MANAGER';
            if (cachedMgr.profile) userProfileData = cachedMgr.profile as UserProfile;
          }
        } else if (portalRole === 'TRAINER' || portalRole === 'TRAINEE') {
          if (cachedMgr) {
            throw new Error('ROLE_RESTRICTION: This account is registered as a Manager. Please switch to the Manager Sign In portal to log in.');
          }
          if (cachedTrainer) {
            credData = cachedTrainer;
            foundUid = cachedTrainer.uid;
            detectedRole = 'TRAINER';
            if (cachedTrainer.profile) userProfileData = cachedTrainer.profile as UserProfile;
          }
        } else {
          const cached = cachedMgr || cachedTrainer || cachedGeneric;
          if (cached) {
            credData = cached;
            foundUid = cached.uid;
            detectedRole = cached.role || (cachedMgr ? 'MANAGER' : 'TRAINER');
            if (cached.profile) userProfileData = cached.profile as UserProfile;
          }
        }
      } catch (cacheErr: any) {
        if (cacheErr?.message?.startsWith('ROLE_RESTRICTION:')) throw cacheErr;
        console.warn('[Auth Login Step 1A Warning] Local account cache lookup notice:', cacheErr);
      }

      // 1B. Check Static Seed Trainers & Demo Manager Profiles
      if (!credData && !foundUid) {
        const isDemoManager =
          lowerInput === 'sarah.jenkins@enterprise.com' ||
          lowerInput === 'manager@enterprise.com' ||
          upperInput === 'MGR-7701' ||
          upperInput === 'NW2001' ||
          lowerInput === 'nw2001';

        const matchedTrainer = SEED_TRAINERS.find(
          t => t.companyEmail.toLowerCase() === lowerInput || t.employeeId.toUpperCase() === upperInput
        );

        if (portalRole === 'MANAGER') {
          if (matchedTrainer) {
            throw new Error('ROLE_RESTRICTION: This account is registered as an Instructor. Please sign in through the Instructor Portal, or register as an Instructor.');
          }
          if (isDemoManager) {
            foundUid = DEMO_MANAGER_PROFILE.uid;
            userProfileData = DEMO_MANAGER_PROFILE;
            detectedRole = 'MANAGER';
            credData = {
              uid: DEMO_MANAGER_PROFILE.uid,
              email: DEMO_MANAGER_PROFILE.companyEmail,
              employeeId: DEMO_MANAGER_PROFILE.employeeId,
              password: 'password',
              role: 'MANAGER',
              profile: DEMO_MANAGER_PROFILE,
            };
          }
        } else if (portalRole === 'TRAINER' || portalRole === 'TRAINEE') {
          if (isDemoManager) {
            throw new Error('ROLE_RESTRICTION: This account is registered as a Manager. Please switch to the Manager Sign In portal to log in.');
          }
          if (matchedTrainer) {
            foundUid = matchedTrainer.uid;
            userProfileData = matchedTrainer;
            detectedRole = 'TRAINER';
            credData = {
              uid: matchedTrainer.uid,
              email: matchedTrainer.companyEmail,
              employeeId: matchedTrainer.employeeId,
              password: 'password',
              role: 'TRAINER',
              profile: matchedTrainer,
            };
          }
        } else {
          if (isDemoManager) {
            foundUid = DEMO_MANAGER_PROFILE.uid;
            userProfileData = DEMO_MANAGER_PROFILE;
            detectedRole = 'MANAGER';
            credData = {
              uid: DEMO_MANAGER_PROFILE.uid,
              email: DEMO_MANAGER_PROFILE.companyEmail,
              employeeId: DEMO_MANAGER_PROFILE.employeeId,
              password: 'password',
              role: 'MANAGER',
              profile: DEMO_MANAGER_PROFILE,
            };
          } else if (matchedTrainer) {
            foundUid = matchedTrainer.uid;
            userProfileData = matchedTrainer;
            detectedRole = 'TRAINER';
            credData = {
              uid: matchedTrainer.uid,
              email: matchedTrainer.companyEmail,
              employeeId: matchedTrainer.employeeId,
              password: 'password',
              role: 'TRAINER',
              profile: matchedTrainer,
            };
          }
        }
      }

      // 1C. Verify password against fast-path credentials record if loaded
      if (credData && credData.password !== undefined) {
        if (cleanPass === String(credData.password).trim()) {
          isVerified = true;
        }
      }

      // =========================================================================
      // STEP 2A: SUPABASE SEPARATE TABLE LOOKUPS (manager_credentials & trainer_credentials)
      // =========================================================================
      if (!isVerified && !credData) {
        try {
          if (portalRole === 'MANAGER') {
            const foundTrainerSupa = await lookupCredentialsSupa('trainer_credentials', lookupKeys);
            if (foundTrainerSupa) {
              throw new Error('ROLE_RESTRICTION: This account is registered as an Instructor. Please sign in through the Instructor Portal, or register as an Instructor.');
            }
            const foundMgrSupa = await lookupCredentialsSupa('manager_credentials', lookupKeys);
            if (foundMgrSupa) {
              credData = {
                uid: foundMgrSupa.uid || foundMgrSupa.id,
                email: foundMgrSupa.email,
                employeeId: foundMgrSupa.employee_id,
                password: foundMgrSupa.password,
                role: 'MANAGER',
                profile: foundMgrSupa.profile,
              };
              foundUid = credData.uid;
              detectedRole = 'MANAGER';
              if (credData.profile) userProfileData = credData.profile as UserProfile;
            }
          } else if (portalRole === 'TRAINER' || portalRole === 'TRAINEE') {
            const foundMgrSupa = await lookupCredentialsSupa('manager_credentials', lookupKeys);
            if (foundMgrSupa) {
              throw new Error('ROLE_RESTRICTION: This account is registered as a Manager. Please switch to the Manager Sign In portal to log in.');
            }
            const foundTrainerSupa = await lookupCredentialsSupa('trainer_credentials', lookupKeys);
            if (foundTrainerSupa) {
              credData = {
                uid: foundTrainerSupa.uid || foundTrainerSupa.id,
                email: foundTrainerSupa.email,
                employeeId: foundTrainerSupa.employee_id,
                password: foundTrainerSupa.password,
                role: 'TRAINER',
                profile: foundTrainerSupa.profile,
              };
              foundUid = credData.uid;
              detectedRole = 'TRAINER';
              if (credData.profile) userProfileData = credData.profile as UserProfile;
            }
          } else {
            const foundMgrSupa = await lookupCredentialsSupa('manager_credentials', lookupKeys);
            const foundTrainerSupa = !foundMgrSupa ? await lookupCredentialsSupa('trainer_credentials', lookupKeys) : null;
            const foundUserSupa = (!foundMgrSupa && !foundTrainerSupa) ? await lookupCredentialsSupa('user_credentials', lookupKeys) : null;

            const matchedSupa = foundMgrSupa || foundTrainerSupa || foundUserSupa;
            if (matchedSupa) {
              const matchedRole = (matchedSupa.role === 'MANAGER' || foundMgrSupa) ? 'MANAGER' : 'TRAINER';
              credData = {
                uid: matchedSupa.uid || matchedSupa.id,
                email: matchedSupa.email,
                employeeId: matchedSupa.employee_id,
                password: matchedSupa.password,
                role: matchedRole,
                profile: matchedSupa.profile,
              };
              foundUid = credData.uid;
              detectedRole = matchedRole;
              if (credData.profile) userProfileData = credData.profile as UserProfile;
            }
          }
        } catch (supaErr: any) {
          if (supaErr?.message?.startsWith('ROLE_RESTRICTION:')) throw supaErr;
          console.warn('[Auth Login Step 2A Notice] Supabase lookup:', supaErr?.message || supaErr);
        }
      }

      // =========================================================================
      // STEP 2B: FIRESTORE SEPARATE TABLE LOOKUPS (manager_credentials & trainer_credentials)
      // =========================================================================
      if (!isVerified && !credData) {
        try {
          if (portalRole === 'MANAGER') {
            // First check if user belongs to trainer_credentials
            const trainerDocPromises = lookupKeys.map(k => getDoc(doc(db, 'trainer_credentials', k)));
            const trainerDocSnaps = await Promise.all(trainerDocPromises);
            const foundTrainer = trainerDocSnaps.find(s => s.exists());
            if (foundTrainer) {
              throw new Error('ROLE_RESTRICTION: This account is registered as an Instructor. Please sign in through the Instructor Portal, or register as an Instructor.');
            }

            // Query manager_credentials table
            const mgrDocPromises = lookupKeys.map(k => getDoc(doc(db, 'manager_credentials', k)));
            const mgrDocSnaps = await Promise.all(mgrDocPromises);
            for (const snap of mgrDocSnaps) {
              if (snap.exists()) {
                credData = snap.data();
                foundUid = credData.uid;
                detectedRole = 'MANAGER';
                if (credData.profile) userProfileData = credData.profile as UserProfile;
                break;
              }
            }
          } else if (portalRole === 'TRAINER' || portalRole === 'TRAINEE') {
            // First check if user belongs to manager_credentials
            const mgrDocPromises = lookupKeys.map(k => getDoc(doc(db, 'manager_credentials', k)));
            const mgrDocSnaps = await Promise.all(mgrDocPromises);
            const foundMgr = mgrDocSnaps.find(s => s.exists());
            if (foundMgr) {
              throw new Error('ROLE_RESTRICTION: This account is registered as a Manager. Please switch to the Manager Sign In portal to log in.');
            }

            // Query trainer_credentials table
            const trainerDocPromises = lookupKeys.map(k => getDoc(doc(db, 'trainer_credentials', k)));
            const trainerDocSnaps = await Promise.all(trainerDocPromises);
            for (const snap of trainerDocSnaps) {
              if (snap.exists()) {
                credData = snap.data();
                foundUid = credData.uid;
                detectedRole = 'TRAINER';
                if (credData.profile) userProfileData = credData.profile as UserProfile;
                break;
              }
            }
          } else {
            // Generic lookup: check manager_credentials first, then trainer_credentials, then user_credentials
            const [mgrSnaps, trainerSnaps, userSnaps] = await Promise.all([
              Promise.all(lookupKeys.map(k => getDoc(doc(db, 'manager_credentials', k)))),
              Promise.all(lookupKeys.map(k => getDoc(doc(db, 'trainer_credentials', k)))),
              Promise.all(lookupKeys.map(k => getDoc(doc(db, 'user_credentials', k)))),
            ]);

            const mMatch = mgrSnaps.find(s => s.exists());
            const tMatch = trainerSnaps.find(s => s.exists());
            const uMatch = userSnaps.find(s => s.exists());

            if (mMatch) {
              credData = mMatch.data();
              foundUid = credData.uid;
              detectedRole = 'MANAGER';
              if (credData.profile) userProfileData = credData.profile as UserProfile;
            } else if (tMatch) {
              credData = tMatch.data();
              foundUid = credData.uid;
              detectedRole = 'TRAINER';
              if (credData.profile) userProfileData = credData.profile as UserProfile;
            } else if (uMatch) {
              credData = uMatch.data();
              foundUid = credData.uid;
              detectedRole = credData.role || 'TRAINER';
              if (credData.profile) userProfileData = credData.profile as UserProfile;
            }
          }

          // Fallback search in 'users' collection
          if (!foundUid && !credData) {
            const usersRef = collection(db, 'users');
            const qEmail = query(usersRef, where('companyEmail', '==', lowerInput));
            const snapEmail = await getDocs(qEmail);

            if (!snapEmail.empty) {
              userProfileData = snapEmail.docs[0].data() as UserProfile;
              foundUid = snapEmail.docs[0].id;
              detectedRole = userProfileData.role;
            } else {
              const qEmp = query(usersRef, where('employeeId', '==', upperInput));
              const snapEmp = await getDocs(qEmp);
              if (!snapEmp.empty) {
                userProfileData = snapEmp.docs[0].data() as UserProfile;
                foundUid = snapEmp.docs[0].id;
                detectedRole = userProfileData.role;
              }
            }

            // Role boundary check on fetched user profile
            if (userProfileData && portalRole) {
              if (portalRole === 'MANAGER' && userProfileData.role !== 'MANAGER') {
                throw new Error('ROLE_RESTRICTION: This account is registered as an Instructor. Please sign in through the Instructor Portal, or register as an Instructor.');
              }
              if ((portalRole === 'TRAINER' || portalRole === 'TRAINEE') && userProfileData.role === 'MANAGER') {
                throw new Error('ROLE_RESTRICTION: This account is registered as a Manager. Please switch to the Manager Sign In portal to log in.');
              }
            }
          }
        } catch (fsErr: any) {
          if (fsErr?.message?.startsWith('ROLE_RESTRICTION:')) throw fsErr;
          console.warn('[Auth Login Step 2 Warning] Firestore lookup notice:', fsErr?.message || fsErr);
        }
      }

      // Check against Firestore credData password if retrieved
      if (!isVerified && credData && credData.password !== undefined) {
        if (cleanPass === String(credData.password).trim()) {
          isVerified = true;
        }
      }

      // =========================================================================
      // STEP 3: FIREBASE AUTH SIGN-IN (If email provided and not yet verified)
      // =========================================================================
      if (!isVerified && lowerInput.includes('@')) {
        try {
          const fbCred = await signInWithEmailAndPassword(auth, lowerInput, cleanPass);
          if (fbCred?.user) {
            isVerified = true;
            if (!foundUid) foundUid = fbCred.user.uid;
          }
        } catch (fbErr: any) {
          console.log('[Auth Login Step 3] Firebase Auth fallback sign-in note:', fbErr?.code);
        }
      }

      // Step 3B: Fallback default password check for seed/demo profiles
      if (!isVerified && (userProfileData || foundUid) && (!credData || credData.password === undefined || credData.password === 'password')) {
        if (cleanPass === 'password') {
          isVerified = true;
        }
      }

      // =========================================================================
      // STEP 4: VERIFICATION OUTCOME
      // =========================================================================
      if (!isVerified) {
        throw new Error('WRONG_PASSWORD: You have entered a wrong password, type again');
      }

      // =========================================================================
      // STEP 5: LOAD USER PROFILE & INITIALIZE SESSION
      // =========================================================================
      if (!userProfileData && foundUid) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', foundUid));
          if (userDocSnap.exists()) {
            userProfileData = userDocSnap.data() as UserProfile;
          } else if (credData?.profile) {
            userProfileData = credData.profile as UserProfile;
            await setDoc(doc(db, 'users', foundUid), cleanFirestoreData(userProfileData));
          }
        } catch (e: any) {
          console.warn('[Auth Login Step 5 Warning] Users document lookup notice:', e);
        }
      }

      if (!userProfileData && credData?.profile) {
        userProfileData = credData.profile as UserProfile;
      }

      if (!userProfileData) {
        const isMgr = (detectedRole === 'MANAGER') || (portalRole === 'MANAGER') || lowerInput.includes('manager') || upperInput.startsWith('MGR');
        const defaultName = cleanInput.includes('@')
          ? cleanInput.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          : `${isMgr ? 'Manager' : 'Trainer'} ${cleanInput}`;

        userProfileData = {
          uid: foundUid || `usr-${Date.now()}`,
          employeeId: upperInput.startsWith('NW') ? upperInput : `NW${upperInput}`,
          fullName: defaultName,
          companyEmail: lowerInput.includes('@') ? lowerInput : `${lowerInput}@nxtwave.tech`,
          role: isMgr ? 'MANAGER' : 'TRAINER',
          department: 'GenAI',
          teamId: isMgr ? 'team-genai' : 'team-genai',
          teamName: isMgr ? 'GenAI Department' : 'GenAI Department',
          managerId: isMgr ? 'exec-global-00' : 'mgr-enterprise-01',
          managerName: isMgr ? 'Executive Leadership' : 'Sarah Jenkins',
          designation: isMgr ? 'Training Manager' : 'Technical Trainer',
          location: 'San Francisco, CA',
          subject: 'Generative AI & LLM Systems',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'users', userProfileData.uid), cleanFirestoreData(userProfileData), { merge: true });
        } catch (saveProfileErr) {
          console.warn('[Auth Login Step 5 Warning] Profile persistence notice:', saveProfileErr);
        }
      }

      // Sync verified credentials into dedicated collection for rapid subsequent access
      try {
        const targetCollection = userProfileData.role === 'MANAGER' ? 'manager_credentials' : 'trainer_credentials';
        const updatedRecord = {
          uid: userProfileData.uid,
          email: userProfileData.companyEmail.toLowerCase(),
          employeeId: userProfileData.employeeId,
          password: cleanPass,
          role: userProfileData.role,
          department: userProfileData.department,
          profile: userProfileData,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, targetCollection, userProfileData.companyEmail.toLowerCase()), cleanFirestoreData(updatedRecord), { merge: true });
        await setDoc(doc(db, targetCollection, userProfileData.employeeId.toLowerCase()), cleanFirestoreData(updatedRecord), { merge: true });
        await setDoc(doc(db, targetCollection, userProfileData.employeeId.toUpperCase()), cleanFirestoreData(updatedRecord), { merge: true });
        await setDoc(doc(db, 'user_credentials', userProfileData.companyEmail.toLowerCase()), cleanFirestoreData(updatedRecord), { merge: true });
      } catch (syncErr) {
        console.warn('Credential sync notice:', syncErr);
      }

      // Successfully authenticated
      console.log('[Auth Login Complete] User authenticated successfully:', userProfileData.fullName, `(${userProfileData.role})`);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, userProfileData.uid);
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(userProfileData));
      setUserProfile(userProfileData);
      setIsDemoMode(false);
      setLoading(false);
    } catch (err: any) {
      console.log('[Auth Login Error Handler] Caught error:', err?.message || err);
      setLoading(false);
      throw err;
    }
  };

  const registerUser = async (data: RegisterUserData) => {
    setLoading(true);
    const cleanEmail = data.companyEmail.trim().toLowerCase();
    const cleanPass = data.password ? data.password.trim() : '';

    try {
      const isMgr = data.role === 'MANAGER';

      // Strict Enterprise Security Validation: When registering as Manager, verify passcode
      if (isMgr) {
        let expectedPasscode = DEFAULT_MANAGER_SECURITY_PASSCODE;
        try {
          const configSnap = await getDoc(doc(db, 'system_config', 'auth_security'));
          if (configSnap.exists() && configSnap.data()?.managerSecurityPasscode) {
            expectedPasscode = String(configSnap.data().managerSecurityPasscode).trim();
          }
        } catch (confErr) {
          console.warn('System config fetch notice:', confErr);
        }

        const enteredPasscode = (data.managerSecurityPasscode || '').trim();
        if (!enteredPasscode || enteredPasscode !== expectedPasscode) {
          throw new Error('Invalid Enterprise Manager Security Passcode. Manager account creation requires a valid leadership authorization key.');
        }
      }

      // Format & Validate Employee ID: Both Trainers and Managers must start with NW (no spaces, no hashtags)
      let rawEmpId = data.employeeId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!rawEmpId.startsWith('NW')) {
        rawEmpId = `NW${rawEmpId}`;
      }

      const lookupKeys = [cleanEmail, rawEmpId.toLowerCase(), rawEmpId.toUpperCase()];

      // =========================================================================
      // STEP 1: CROSS-ROLE RESTRICTIONS & SEPARATE TABLE VERIFICATION
      // - If signing up as TRAINER: must NOT exist in manager_credentials (or be a registered Manager)
      // - If signing up as MANAGER: must NOT exist in trainer_credentials (or be a registered Trainer)
      // =========================================================================

      if (isMgr) {
        // A Manager is attempting registration: Check trainer_credentials first!
        try {
          // Check local trainer cache
          const trainerAccountsRaw = localStorage.getItem('nxtwave_trainer_accounts');
          if (trainerAccountsRaw) {
            const trainerMap = JSON.parse(trainerAccountsRaw);
            if (trainerMap[cleanEmail] || trainerMap[rawEmpId.toLowerCase()] || trainerMap[rawEmpId.toUpperCase()]) {
              throw new Error('ROLE_CONFLICT: This account is already registered as an Instructor. Please sign in or register through the Instructor Portal.');
            }
          }

          // Check static seed trainers
          const matchedSeedTrainer = SEED_TRAINERS.find(
            t => t.companyEmail.toLowerCase() === cleanEmail || t.employeeId.toUpperCase() === rawEmpId
          );
          if (matchedSeedTrainer) {
            throw new Error('ROLE_CONFLICT: This account is already registered as an Instructor. Please sign in or register through the Instructor Portal.');
          }

          // Query Firestore trainer_credentials table
          const trainerDocPromises = lookupKeys.map(k => getDoc(doc(db, 'trainer_credentials', k)));
          const trainerDocSnaps = await Promise.all(trainerDocPromises);
          if (trainerDocSnaps.some(s => s.exists())) {
            throw new Error('ROLE_CONFLICT: This account is already registered as an Instructor. Please sign in or register through the Instructor Portal.');
          }

          // Query users collection for role === 'TRAINER'
          const usersRef = collection(db, 'users');
          const qEmail = query(usersRef, where('companyEmail', '==', cleanEmail));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty && snapEmail.docs[0].data()?.role === 'TRAINER') {
            throw new Error('ROLE_CONFLICT: This account is already registered as an Instructor. Please sign in or register through the Instructor Portal.');
          }
        } catch (crossCheckErr: any) {
          if (crossCheckErr?.message?.startsWith('ROLE_CONFLICT:')) throw crossCheckErr;
        }

        // Now check if already registered in manager_credentials
        try {
          const mgrAccountsRaw = localStorage.getItem('nxtwave_manager_accounts');
          if (mgrAccountsRaw) {
            const mgrMap = JSON.parse(mgrAccountsRaw);
            if (mgrMap[cleanEmail] || mgrMap[rawEmpId.toLowerCase()] || mgrMap[rawEmpId.toUpperCase()]) {
              throw new Error(`ACCOUNT_EXISTS: An account with this email ("${cleanEmail}") or Employee ID ("${rawEmpId}") already exists. You can directly sign in to your Manager account.`);
            }
          }

          const mgrDocPromises = lookupKeys.map(k => getDoc(doc(db, 'manager_credentials', k)));
          const mgrDocSnaps = await Promise.all(mgrDocPromises);
          if (mgrDocSnaps.some(s => s.exists())) {
            throw new Error(`ACCOUNT_EXISTS: An account with this email ("${cleanEmail}") or Employee ID ("${rawEmpId}") already exists. You can directly sign in to your Manager account.`);
          }
        } catch (dupMgrErr: any) {
          if (dupMgrErr?.message?.startsWith('ACCOUNT_EXISTS:')) throw dupMgrErr;
        }
      } else {
        // A Trainer is attempting registration: Check manager_credentials first!
        try {
          // Check local manager cache
          const mgrAccountsRaw = localStorage.getItem('nxtwave_manager_accounts');
          if (mgrAccountsRaw) {
            const mgrMap = JSON.parse(mgrAccountsRaw);
            if (mgrMap[cleanEmail] || mgrMap[rawEmpId.toLowerCase()] || mgrMap[rawEmpId.toUpperCase()]) {
              throw new Error('ROLE_CONFLICT: This account is already registered as a Manager. Please sign in through the Manager Portal.');
            }
          }

          // Check static demo manager
          if (
            cleanEmail === 'sarah.jenkins@enterprise.com' ||
            cleanEmail === 'manager@enterprise.com' ||
            rawEmpId === 'MGR-7701' ||
            rawEmpId === 'NW2001'
          ) {
            throw new Error('ROLE_CONFLICT: This account is already registered as a Manager. Please sign in through the Manager Portal.');
          }

          // Query Firestore manager_credentials table
          const mgrDocPromises = lookupKeys.map(k => getDoc(doc(db, 'manager_credentials', k)));
          const mgrDocSnaps = await Promise.all(mgrDocPromises);
          if (mgrDocSnaps.some(s => s.exists())) {
            throw new Error('ROLE_CONFLICT: This account is already registered as a Manager. Please sign in through the Manager Portal.');
          }

          // Query users collection for role === 'MANAGER'
          const usersRef = collection(db, 'users');
          const qEmail = query(usersRef, where('companyEmail', '==', cleanEmail));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty && snapEmail.docs[0].data()?.role === 'MANAGER') {
            throw new Error('ROLE_CONFLICT: This account is already registered as a Manager. Please sign in through the Manager Portal.');
          }
        } catch (crossCheckErr: any) {
          if (crossCheckErr?.message?.startsWith('ROLE_CONFLICT:')) throw crossCheckErr;
        }

        // Now check if already registered in trainer_credentials
        try {
          const trainerAccountsRaw = localStorage.getItem('nxtwave_trainer_accounts');
          if (trainerAccountsRaw) {
            const trainerMap = JSON.parse(trainerAccountsRaw);
            if (trainerMap[cleanEmail] || trainerMap[rawEmpId.toLowerCase()] || trainerMap[rawEmpId.toUpperCase()]) {
              throw new Error(`ACCOUNT_EXISTS: An account with this email ("${cleanEmail}") or Employee ID ("${rawEmpId}") already exists. You can directly sign in to your Instructor account.`);
            }
          }

          const matchedSeedTrainer = SEED_TRAINERS.find(
            t => t.companyEmail.toLowerCase() === cleanEmail || t.employeeId.toUpperCase() === rawEmpId
          );
          if (matchedSeedTrainer) {
            throw new Error(`ACCOUNT_EXISTS: An account with this email ("${cleanEmail}") or Employee ID ("${rawEmpId}") already exists. You can directly sign in to your Instructor account.`);
          }

          const trainerDocPromises = lookupKeys.map(k => getDoc(doc(db, 'trainer_credentials', k)));
          const trainerDocSnaps = await Promise.all(trainerDocPromises);
          if (trainerDocSnaps.some(s => s.exists())) {
            throw new Error(`ACCOUNT_EXISTS: An account with this email ("${cleanEmail}") or Employee ID ("${rawEmpId}") already exists. You can directly sign in to your Instructor account.`);
          }
        } catch (dupTrainerErr: any) {
          if (dupTrainerErr?.message?.startsWith('ACCOUNT_EXISTS:')) throw dupTrainerErr;
        }
      }

      // Deterministic UID
      const sanitizedEmailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '-');
      let uid = `usr-${sanitizedEmailKey}-${Date.now().toString().slice(-4)}`;

      // Attempt Firebase Auth user creation gracefully
      if (cleanPass) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
          uid = userCredential.user.uid;
        } catch (authErr: any) {
          if (authErr?.code === 'auth/email-already-in-use') {
            throw new Error(`ACCOUNT_EXISTS: An account with the email "${cleanEmail}" already exists. You can directly sign in; there is no need to create an account.`);
          }
          console.warn('Firebase Auth provider fallback to Firestore permanent storage:', authErr?.message || authErr);
        }
      }

      const department = data.department || 'GenAI';
      const deptTeamMap: Record<string, { teamId: string; teamName: string; defaultSubject: string }> = {
        'Frontend': { teamId: 'team-frontend', teamName: 'Frontend Department', defaultSubject: 'React & Modern Frontend Systems' },
        'Backend': { teamId: 'team-backend', teamName: 'Backend Department', defaultSubject: 'Node.js & Distributed Systems' },
        'GenAI': { teamId: 'team-genai', teamName: 'GenAI Department', defaultSubject: 'Generative AI & LLM Systems' },
      };

      const deptConfig = deptTeamMap[department] || deptTeamMap['GenAI'];

      const trimmedManagerName = data.managerName?.trim() || '';
      const trimmedManagerEmail = data.managerEmail?.trim() || '';
      const trimmedManagerId = data.managerId?.trim() || '';

      const resolvedManagerId = isMgr
        ? 'exec-global-00'
        : (trimmedManagerId || (trimmedManagerName ? `mgr-${trimmedManagerName.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : ''));

      const resolvedManagerName = isMgr
        ? 'Executive Leadership'
        : trimmedManagerName;

      const resolvedManagerEmail = isMgr
        ? undefined
        : (trimmedManagerEmail || (trimmedManagerName ? `${trimmedManagerName.toLowerCase().replace(/\s+/g, '.')}@enterprise.com` : undefined));

      const newProfile: UserProfile = {
        uid,
        employeeId: rawEmpId,
        fullName: data.fullName.trim(),
        companyEmail: cleanEmail,
        role: data.role,
        department,
        teamId: data.teamId || deptConfig.teamId,
        teamName: data.teamName || (isMgr ? `${department} Department` : deptConfig.teamName),
        managerId: resolvedManagerId,
        managerName: resolvedManagerName,
        managerEmail: resolvedManagerEmail,
        designation: data.designation.trim() || (isMgr ? 'Manager' : 'Trainer'),
        location: data.location?.trim() || '',
        subject: data.subject?.trim() || '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Permanently store user profile in 'users' collection in Firestore
      await setDoc(doc(db, 'users', uid), cleanFirestoreData(newProfile));

      // 2. Permanently store authentication credentials record in dedicated separate table:
      // - manager_credentials for Manager accounts
      // - trainer_credentials for Trainer / Trainee accounts
      const credRecord = {
        uid,
        email: cleanEmail,
        employeeId: rawEmpId,
        password: cleanPass,
        role: data.role,
        department,
        ...(isMgr ? {} : {
          managerId: resolvedManagerId,
          managerName: resolvedManagerName,
          managerEmail: resolvedManagerEmail,
        }),
        profile: newProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const primaryTable = isMgr ? 'manager_credentials' : 'trainer_credentials';

      // Save in dedicated table under email, lowercase empId, and uppercase empId
      await setDoc(doc(db, primaryTable, cleanEmail), cleanFirestoreData(credRecord));
      await setDoc(doc(db, primaryTable, rawEmpId.toLowerCase()), cleanFirestoreData(credRecord));
      await setDoc(doc(db, primaryTable, rawEmpId.toUpperCase()), cleanFirestoreData(credRecord));

      // Also save in user_credentials for backward compatibility
      await setDoc(doc(db, 'user_credentials', cleanEmail), cleanFirestoreData(credRecord));
      await setDoc(doc(db, 'user_credentials', rawEmpId.toLowerCase()), cleanFirestoreData(credRecord));
      await setDoc(doc(db, 'user_credentials', rawEmpId.toUpperCase()), cleanFirestoreData(credRecord));

      // Persist to Supabase credentials tables
      try {
        const supaKeys = [cleanEmail, rawEmpId.toLowerCase(), rawEmpId.toUpperCase()];
        await saveCredentialSupa(primaryTable, supaKeys, credRecord);
        await saveCredentialSupa('user_credentials', supaKeys, credRecord);
      } catch (supaErr) {
        console.warn('Notice saving credentials to Supabase tables:', supaErr);
      }

      // 3. Cache in local storage registry tables
      try {
        const cacheKey = isMgr ? 'nxtwave_manager_accounts' : 'nxtwave_trainer_accounts';
        const existingCacheRaw = localStorage.getItem(cacheKey);
        const cacheMap = existingCacheRaw ? JSON.parse(existingCacheRaw) : {};
        cacheMap[cleanEmail] = credRecord;
        cacheMap[rawEmpId.toLowerCase()] = credRecord;
        cacheMap[rawEmpId.toUpperCase()] = credRecord;
        localStorage.setItem(cacheKey, JSON.stringify(cacheMap));

        // Also update generic accounts cache
        const localAccountsRaw = localStorage.getItem('nxtwave_custom_accounts');
        const accountsMap = localAccountsRaw ? JSON.parse(localAccountsRaw) : {};
        accountsMap[cleanEmail] = credRecord;
        accountsMap[rawEmpId.toLowerCase()] = credRecord;
        accountsMap[rawEmpId.toUpperCase()] = credRecord;
        localStorage.setItem('nxtwave_custom_accounts', JSON.stringify(accountsMap));

        if (isMgr) {
          try {
            window.dispatchEvent(new CustomEvent('nxtwave_manager_registered', { detail: newProfile }));
          } catch {}
        }
      } catch (cacheSaveErr) {
        console.warn('Local account cache save error:', cacheSaveErr);
      }

      // 4. Persist session in browser local storage
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, uid);
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(newProfile));

      // 4B. Synchronize profile to Supabase
      try {
        await upsertProfile(newProfile);
      } catch (supaErr) {
        console.info('[Supabase] Registration sync notice:', supaErr);
      }

      // 5. Update state to immediately enter workspace
      setUserProfile(newProfile);
      setIsDemoMode(false);
    } catch (err: any) {
      if (err?.message?.startsWith('ACCOUNT_EXISTS:') || err?.message?.startsWith('ROLE_CONFLICT:')) {
        console.info('Registration validation status:', err.message);
      } else {
        console.warn('Registration notice:', err?.message || err);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
      await signOut(auth);
    } catch (err) {
      console.warn('Logout notice:', err);
    } finally {
      setUserProfile(null);
      setCurrentUser(null);
      setIsDemoMode(false);
    }
  };

  const resetPassword = async (emailOrEmpId: string): Promise<{ success: boolean; emailSent: boolean; userFound: boolean; user?: UserProfile; message?: string }> => {
    const cleanInput = emailOrEmpId.trim();
    const lowerInput = cleanInput.toLowerCase();
    const upperInput = cleanInput.toUpperCase();
    const lookupKeys = [lowerInput, upperInput, cleanInput];
    let emailToSend = lowerInput.includes('@') ? lowerInput : '';
    let foundProfile: UserProfile | undefined;

    // 1. Search for existing profile in separate tables (manager_credentials, trainer_credentials, user_credentials)
    try {
      // Check manager_credentials
      const mgrDocPromises = lookupKeys.map(k => getDoc(doc(db, 'manager_credentials', k)));
      const mgrDocSnaps = await Promise.all(mgrDocPromises);
      const mSnap = mgrDocSnaps.find(s => s.exists());
      if (mSnap) {
        const cData = mSnap.data();
        if (cData.email) emailToSend = cData.email;
        if (cData.profile) foundProfile = cData.profile as UserProfile;
      }

      // Check trainer_credentials
      if (!foundProfile) {
        const trainerDocPromises = lookupKeys.map(k => getDoc(doc(db, 'trainer_credentials', k)));
        const trainerDocSnaps = await Promise.all(trainerDocPromises);
        const tSnap = trainerDocSnaps.find(s => s.exists());
        if (tSnap) {
          const cData = tSnap.data();
          if (cData.email) emailToSend = cData.email;
          if (cData.profile) foundProfile = cData.profile as UserProfile;
        }
      }

      // Check user_credentials
      if (!foundProfile) {
        const userDocPromises = lookupKeys.map(k => getDoc(doc(db, 'user_credentials', k)));
        const userDocSnaps = await Promise.all(userDocPromises);
        const uSnap = userDocSnaps.find(s => s.exists());
        if (uSnap) {
          const cData = uSnap.data();
          if (cData.email) emailToSend = cData.email;
          if (cData.profile) foundProfile = cData.profile as UserProfile;
        }
      }

      // Check users collection
      if (!foundProfile) {
        const usersRef = collection(db, 'users');
        const q1 = query(usersRef, where('companyEmail', '==', lowerInput));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          foundProfile = snap1.docs[0].data() as UserProfile;
          emailToSend = foundProfile.companyEmail;
        } else {
          const q2 = query(usersRef, where('employeeId', '==', upperInput));
          const snap2 = await getDocs(q2);
          if (!snap2.empty) {
            foundProfile = snap2.docs[0].data() as UserProfile;
            emailToSend = foundProfile.companyEmail;
          }
        }
      }

      // Check seed trainers fallback
      if (!foundProfile) {
        const matched = SEED_TRAINERS.find(
          t => t.companyEmail.toLowerCase() === lowerInput || t.employeeId.toUpperCase() === upperInput
        );
        if (matched) {
          foundProfile = matched;
          emailToSend = matched.companyEmail;
        } else if (
          lowerInput === 'sarah.jenkins@enterprise.com' ||
          lowerInput === 'manager@enterprise.com' ||
          upperInput === 'MGR-7701' ||
          upperInput === 'NW2001'
        ) {
          foundProfile = DEMO_MANAGER_PROFILE;
          emailToSend = DEMO_MANAGER_PROFILE.companyEmail;
        }
      }
    } catch (lookupErr) {
      console.warn('Account lookup during reset notice:', lookupErr);
    }

    // Default emailToSend if user typed an email directly
    if (!emailToSend && lowerInput.includes('@')) {
      emailToSend = lowerInput;
    }

    // Return verified account info directly for on-screen password update
    if (!foundProfile && !lowerInput.includes('@') && !upperInput.startsWith('NW')) {
      throw new Error('Account not found. Please enter a valid registered work email or Employee ID (e.g. NW1048 or NW2001).');
    }

    return {
      success: true,
      emailSent: false,
      userFound: !!foundProfile,
      user: foundProfile,
      message: `Account verified for ${foundProfile?.fullName || cleanInput}. You can set your new password directly below.`
    };
  };

  const directUpdatePassword = async (emailOrEmpId: string, newPass: string): Promise<boolean> => {
    const cleanInput = emailOrEmpId.trim();
    const lowerInput = cleanInput.toLowerCase();
    const upperInput = cleanInput.toUpperCase();
    const lookupKeys = [lowerInput, upperInput, cleanInput];
    const cleanPass = newPass.trim();

    try {
      let foundUid = '';
      let existingProfile: UserProfile | undefined;
      let email = lowerInput.includes('@') ? lowerInput : '';
      let empId = upperInput.startsWith('NW') || upperInput.startsWith('EMP') ? upperInput : '';
      let isMgr = false;

      // 1. Check manager_credentials
      const mgrDocPromises = lookupKeys.map(k => getDoc(doc(db, 'manager_credentials', k)));
      const mgrDocSnaps = await Promise.all(mgrDocPromises);
      const mSnap = mgrDocSnaps.find(s => s.exists());
      if (mSnap) {
        const d = mSnap.data();
        foundUid = d.uid;
        email = d.email || email;
        empId = d.employeeId || empId;
        existingProfile = d.profile;
        isMgr = true;
      }

      // 2. Check trainer_credentials
      if (!foundUid) {
        const trainerDocPromises = lookupKeys.map(k => getDoc(doc(db, 'trainer_credentials', k)));
        const trainerDocSnaps = await Promise.all(trainerDocPromises);
        const tSnap = trainerDocSnaps.find(s => s.exists());
        if (tSnap) {
          const d = tSnap.data();
          foundUid = d.uid;
          email = d.email || email;
          empId = d.employeeId || empId;
          existingProfile = d.profile;
          isMgr = false;
        }
      }

      // 3. Check user_credentials
      if (!foundUid) {
        const snap1 = await getDoc(doc(db, 'user_credentials', lowerInput));
        if (snap1.exists()) {
          const d = snap1.data();
          foundUid = d.uid;
          email = d.email || email;
          empId = d.employeeId || empId;
          existingProfile = d.profile;
          isMgr = d.role === 'MANAGER';
        }
      }

      if (!foundUid) {
        const matched = SEED_TRAINERS.find(
          t => t.companyEmail.toLowerCase() === lowerInput || t.employeeId.toUpperCase() === upperInput
        );
        if (matched) {
          foundUid = matched.uid;
          email = matched.companyEmail;
          empId = matched.employeeId;
          existingProfile = matched;
          isMgr = false;
        }
      }

      if (!foundUid) {
        foundUid = `usr_${Date.now()}`;
        isMgr = lowerInput.includes('manager') || upperInput.startsWith('MGR');
      }

      const credRecord = {
        uid: foundUid,
        email: email || cleanInput,
        employeeId: empId || cleanInput.toUpperCase(),
        password: cleanPass,
        role: isMgr ? 'MANAGER' : 'TRAINER',
        profile: existingProfile || null,
        updatedAt: new Date().toISOString(),
      };

      const primaryTable = isMgr ? 'manager_credentials' : 'trainer_credentials';

      // Save to primaryTable and user_credentials under all relevant lookup keys
      if (email) {
        await setDoc(doc(db, primaryTable, email.toLowerCase()), cleanFirestoreData(credRecord), { merge: true });
        await setDoc(doc(db, 'user_credentials', email.toLowerCase()), cleanFirestoreData(credRecord), { merge: true });
      }
      if (empId) {
        await setDoc(doc(db, primaryTable, empId.toLowerCase()), cleanFirestoreData(credRecord), { merge: true });
        await setDoc(doc(db, primaryTable, empId.toUpperCase()), cleanFirestoreData(credRecord), { merge: true });
        await setDoc(doc(db, 'user_credentials', empId.toLowerCase()), cleanFirestoreData(credRecord), { merge: true });
        await setDoc(doc(db, 'user_credentials', empId.toUpperCase()), cleanFirestoreData(credRecord), { merge: true });
      }
      await setDoc(doc(db, primaryTable, cleanInput.toLowerCase()), cleanFirestoreData(credRecord), { merge: true });
      await setDoc(doc(db, 'user_credentials', cleanInput.toLowerCase()), cleanFirestoreData(credRecord), { merge: true });

      // Update Supabase credentials tables
      try {
        const supaKeys = [
          email ? email.toLowerCase() : '',
          empId ? empId.toLowerCase() : '',
          empId ? empId.toUpperCase() : '',
          cleanInput.toLowerCase()
        ].filter(Boolean);
        await saveCredentialSupa(primaryTable, supaKeys, credRecord);
        await saveCredentialSupa('user_credentials', supaKeys, credRecord);
      } catch (supaErr) {
        console.warn('Notice updating password in Supabase tables:', supaErr);
      }

      // Update local storage cache
      try {
        const cacheKey = isMgr ? 'nxtwave_manager_accounts' : 'nxtwave_trainer_accounts';
        const rawCache = localStorage.getItem(cacheKey);
        const map = rawCache ? JSON.parse(rawCache) : {};
        if (email) map[email.toLowerCase()] = credRecord;
        if (empId) {
          map[empId.toLowerCase()] = credRecord;
          map[empId.toUpperCase()] = credRecord;
        }
        localStorage.setItem(cacheKey, JSON.stringify(map));

        const localAccountsRaw = localStorage.getItem('nxtwave_custom_accounts');
        const genericMap = localAccountsRaw ? JSON.parse(localAccountsRaw) : {};
        if (email) genericMap[email.toLowerCase()] = credRecord;
        if (empId) {
          genericMap[empId.toLowerCase()] = credRecord;
          genericMap[empId.toUpperCase()] = credRecord;
        }
        localStorage.setItem('nxtwave_custom_accounts', JSON.stringify(genericMap));
      } catch (cacheErr) {
        console.warn('Local account cache update warning:', cacheErr);
      }

      return true;
    } catch (err) {
      console.error('Failed to direct update password:', err);
      throw err;
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated: UserProfile = { ...userProfile, ...data, updatedAt: new Date().toISOString() };
    setUserProfile(updated);
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updated));

    // 1. Update users collection in Firestore
    try {
      await setDoc(doc(db, 'users', userProfile.uid), cleanFirestoreData(updated), { merge: true });
    } catch (e) {
      console.warn('Profile sync to users collection warning:', e);
    }

    // 1B. Synchronize profile to Supabase
    try {
      await upsertProfile(updated);
    } catch (supaErr) {
      console.info('[Supabase] Profile update sync notice:', supaErr);
    }

    // 2. Update dedicated credentials tables
    const isMgr = (updated.role || '').toUpperCase() === 'MANAGER';
    const targetCollection = isMgr ? 'manager_credentials' : 'trainer_credentials';
    const email = updated.companyEmail ? updated.companyEmail.toLowerCase() : '';
    const empId = updated.employeeId ? updated.employeeId.trim() : '';

    const credUpdate: any = {
      profile: updated,
      updatedAt: updated.updatedAt,
      ...(data.managerId !== undefined ? { managerId: data.managerId } : {}),
      ...(data.managerName !== undefined ? { managerName: data.managerName } : {}),
      ...(data.managerEmail !== undefined ? { managerEmail: data.managerEmail } : {}),
      ...(data.department !== undefined ? { department: data.department } : {}),
    };

    try {
      if (email) {
        await setDoc(doc(db, targetCollection, email), cleanFirestoreData(credUpdate), { merge: true });
        await setDoc(doc(db, 'user_credentials', email), cleanFirestoreData(credUpdate), { merge: true });
      }
      if (empId) {
        await setDoc(doc(db, targetCollection, empId.toLowerCase()), cleanFirestoreData(credUpdate), { merge: true });
        await setDoc(doc(db, targetCollection, empId.toUpperCase()), cleanFirestoreData(credUpdate), { merge: true });
        await setDoc(doc(db, 'user_credentials', empId.toLowerCase()), cleanFirestoreData(credUpdate), { merge: true });
        await setDoc(doc(db, 'user_credentials', empId.toUpperCase()), cleanFirestoreData(credUpdate), { merge: true });
      }
    } catch (e) {
      console.warn('Profile sync to credentials tables warning:', e);
    }

    // 3. Update localStorage caches
    try {
      const cacheKey = isMgr ? 'nxtwave_manager_accounts' : 'nxtwave_trainer_accounts';
      const rawCache = localStorage.getItem(cacheKey);
      if (rawCache) {
        const cacheMap = JSON.parse(rawCache);
        if (email && cacheMap[email]) {
          cacheMap[email].profile = updated;
          if (data.managerId) cacheMap[email].managerId = data.managerId;
          if (data.managerName) cacheMap[email].managerName = data.managerName;
          if (data.managerEmail) cacheMap[email].managerEmail = data.managerEmail;
        }
        if (empId) {
          if (cacheMap[empId.toLowerCase()]) cacheMap[empId.toLowerCase()].profile = updated;
          if (cacheMap[empId.toUpperCase()]) cacheMap[empId.toUpperCase()].profile = updated;
        }
        localStorage.setItem(cacheKey, JSON.stringify(cacheMap));
      }

      const rawGeneric = localStorage.getItem('nxtwave_custom_accounts');
      if (rawGeneric) {
        const genMap = JSON.parse(rawGeneric);
        if (email && genMap[email]) genMap[email].profile = updated;
        if (empId) {
          if (genMap[empId.toLowerCase()]) genMap[empId.toLowerCase()].profile = updated;
          if (genMap[empId.toUpperCase()]) genMap[empId.toUpperCase()].profile = updated;
        }
        localStorage.setItem('nxtwave_custom_accounts', JSON.stringify(genMap));
      }
    } catch (cacheErr) {
      console.warn('Local account cache update warning:', cacheErr);
    }
  };

  const quickDemoLogin = (targetRole: 'MANAGER' | 'TRAINER' | 'TRAINEE') => {
    setIsDemoMode(true);
    let selectedProfile: UserProfile;

    if (targetRole === 'MANAGER') {
      selectedProfile = DEMO_MANAGER_PROFILE;
    } else if (targetRole === 'TRAINEE') {
      selectedProfile = SEED_TRAINERS.find(t => t.employeeId === 'EMP-1089') || SEED_TRAINERS[4] || SEED_TRAINERS[0];
    } else {
      selectedProfile = SEED_TRAINERS[0];
    }

    localStorage.setItem(LOCAL_STORAGE_USER_KEY, selectedProfile.uid);
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(selectedProfile));
    setUserProfile(selectedProfile);
  };

  const role: UserRole | null = userProfile?.role || null;
  const isManager = (userProfile?.role || '').toUpperCase() === 'MANAGER';
  const isTrainer = !isManager;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        role,
        isManager,
        isTrainer,
        login,
        registerUser,
        logout,
        resetPassword,
        directUpdatePassword,
        updateProfileData,
        quickDemoLogin,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

