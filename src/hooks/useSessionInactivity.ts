import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// Default durations in milliseconds
const DEFAULT_INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_WINDOW_MS = 2 * 60 * 1000; // 2 minutes (prompt at 28 minutes of inactivity)
const LAST_ACTIVITY_KEY = 'nxtwave_last_activity_time';
const SESSION_EXPIRED_FLAG_KEY = 'nxtwave_session_expired_inactivity';

export interface UseSessionInactivityOptions {
  inactivityLimitMs?: number;
  warningWindowMs?: number;
  onLogout?: () => void;
}

export const useSessionInactivity = (options?: UseSessionInactivityOptions) => {
  const { userProfile, logout } = useAuth();
  const inactivityLimit = options?.inactivityLimitMs ?? DEFAULT_INACTIVITY_LIMIT_MS;
  const warningWindow = options?.warningWindowMs ?? WARNING_WINDOW_MS;
  const warningThreshold = Math.max(0, inactivityLimit - warningWindow);

  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(Math.floor(warningWindow / 1000));
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoggingOutRef = useRef<boolean>(false);

  // Check if there was a previous session expiration notice
  useEffect(() => {
    try {
      const expiredFlag = sessionStorage.getItem(SESSION_EXPIRED_FLAG_KEY);
      if (expiredFlag && !userProfile) {
        setSessionExpiredNotice('Your session expired after 30 minutes of inactivity to protect your workspace. Please sign in again.');
        sessionStorage.removeItem(SESSION_EXPIRED_FLAG_KEY);
      }
    } catch (e) {
      console.warn('Session storage read notice:', e);
    }
  }, [userProfile]);

  // Record user activity
  const recordActivity = useCallback(() => {
    if (!userProfile || isLoggingOutRef.current) return;
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // Ignore storage errors
    }

    // If warning is currently open and user performed explicit activity, auto-resolve
    // (Explicit button click is preferred, but this keeps state accurate)
  }, [userProfile]);

  // Manual extend session handler
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // Ignore storage errors
    }
    setShowWarningModal(false);
    setRemainingSeconds(Math.floor(warningWindow / 1000));
  }, [warningWindow]);

  // Perform automatic logout
  const performAutoLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setShowWarningModal(false);

    try {
      sessionStorage.setItem(SESSION_EXPIRED_FLAG_KEY, 'true');
    } catch {
      // Ignore storage errors
    }

    if (options?.onLogout) {
      options.onLogout();
    } else {
      await logout();
    }
    isLoggingOutRef.current = false;
  }, [logout, options]);

  // Manual logout now from warning prompt
  const handleLogoutNow = useCallback(async () => {
    setShowWarningModal(false);
    await logout();
  }, [logout]);

  // Set up event listeners for user interactions
  useEffect(() => {
    if (!userProfile) {
      setShowWarningModal(false);
      return;
    }

    // Initialize activity timestamp
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // Ignore storage errors
    }

    // Debounced activity handler
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleUserInteraction = () => {
      if (showWarningModal) return; // When warning modal is showing, require button confirmation
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        recordActivity();
        debounceTimer = null;
      }, 500);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(evt => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // Cross-tab synchronization via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        const remoteTime = Number(e.newValue);
        if (!isNaN(remoteTime)) {
          lastActivityRef.current = remoteTime;
          if (showWarningModal) {
            const idleTime = Date.now() - remoteTime;
            if (idleTime < warningThreshold) {
              setShowWarningModal(false);
            }
          }
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // Periodic heartbeat check every 1 second
    timerRef.current = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const currentTime = Date.now();
      const lastActive = lastActivityRef.current;
      const idleDuration = currentTime - lastActive;

      if (idleDuration >= inactivityLimit) {
        // Exceeded 30 minutes -> Auto logout
        performAutoLogout();
      } else if (idleDuration >= warningThreshold) {
        // Between 28 and 30 minutes -> Show warning prompt with countdown
        const msRemaining = Math.max(0, inactivityLimit - idleDuration);
        const secondsLeft = Math.ceil(msRemaining / 1000);
        setRemainingSeconds(secondsLeft);
        setShowWarningModal(true);
      } else {
        if (showWarningModal) {
          setShowWarningModal(false);
        }
      }
    }, 1000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      events.forEach(evt => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      window.removeEventListener('storage', handleStorage);
    };
  }, [userProfile, showWarningModal, warningThreshold, inactivityLimit, recordActivity, performAutoLogout]);

  return {
    showWarningModal,
    remainingSeconds,
    extendSession,
    logoutNow: handleLogoutNow,
    sessionExpiredNotice,
    clearExpiredNotice: () => setSessionExpiredNotice(null),
  };
};
