import React from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw, UserCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ActiveSessionTimeoutModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onExtendSession: () => void;
  onLogoutNow: () => void;
}

export const ActiveSessionTimeoutModal: React.FC<ActiveSessionTimeoutModalProps> = ({
  isOpen,
  remainingSeconds,
  onExtendSession,
  onLogoutNow,
}) => {
  const { userProfile, isManager } = useAuth();

  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      id="active-session-warning-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-session-warning-title"
    >
      <div
        id="active-session-warning-modal"
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-200 text-center animate-in zoom-in-95 duration-200"
      >
        {/* Animated Clock / Security Icon */}
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner border border-amber-200">
          <Clock className="h-8 w-8 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-bold text-white items-center justify-center">!</span>
          </span>
        </div>

        {/* Security Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>Active Session Timeout</span>
        </div>

        <h3 id="active-session-warning-title" className="text-xl font-bold text-slate-900">
          Are you still working?
        </h3>

        <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">
          You have been inactive for over <strong className="text-slate-800 font-semibold">28 minutes</strong>. For enterprise data security, your session will automatically log out in:
        </p>

        {/* Countdown Timer Display */}
        <div className="my-5 py-3 px-6 rounded-2xl bg-amber-50/80 border-2 border-amber-200/90 inline-block shadow-inner">
          <div className="flex items-baseline justify-center gap-1.5 font-mono">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-900 tracking-tight">
              {formattedTime}
            </span>
            <span className="text-xs font-semibold text-amber-700 uppercase">
              Remaining
            </span>
          </div>
          <p className="text-[10px] font-medium text-amber-800/80 mt-1">
            Auto-lock threshold: 30 minutes total inactivity
          </p>
        </div>

        {/* User identification badge */}
        {userProfile && (
          <div className="mb-6 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2.5 text-xs text-slate-700">
            {isManager ? (
              <ShieldAlert className="h-4 w-4 text-blue-600 shrink-0" />
            ) : (
              <UserCheck className="h-4 w-4 text-sky-600 shrink-0" />
            )}
            <span className="font-semibold text-slate-900 truncate">
              {userProfile.fullName}
            </span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-[11px] text-slate-500">
              {userProfile.employeeId}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            id="session-extend-button"
            onClick={onExtendSession}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/25 transition-all cursor-pointer hover:shadow-lg"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Stay Logged In (Extend Session)</span>
          </button>

          <button
            type="button"
            id="session-logout-button"
            onClick={onLogoutNow}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-slate-500" />
            <span>Log Out Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
