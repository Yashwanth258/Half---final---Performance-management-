import React from 'react';
import { ShieldAlert, UserX, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { UserProfile } from '../../types';
import { validateTrainerManagerOwnership } from '../../lib/permissionChecker';

interface PermissionGuardProps {
  trainer: Partial<UserProfile> | null | undefined;
  manager: UserProfile | null | undefined;
  children: React.ReactNode;
  fallbackTrainer?: UserProfile | null;
  onSelectFallbackTrainer?: (trainerId: string) => void;
  customDeniedMessage?: string;
}

/**
 * PermissionGuard: Enforces explicit trainer-manager ownership before rendering any sensitive trainer data.
 * If ownership validation fails, child components are blocked from rendering and a security card is presented.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  trainer,
  manager,
  children,
  fallbackTrainer,
  onSelectFallbackTrainer,
  customDeniedMessage
}) => {
  // If not a manager (e.g. trainer viewing own data), pass through
  if (manager?.role !== 'MANAGER') {
    return <>{children}</>;
  }

  // If no trainer is selected yet, render children (e.g. empty or loading state handles it)
  if (!trainer) {
    return <>{children}</>;
  }

  const validation = validateTrainerManagerOwnership(trainer, manager);

  if (!validation.isOwned) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 sm:p-8 text-center my-6 shadow-xs max-w-2xl mx-auto">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4 shadow-xs">
          <ShieldAlert className="h-7 w-7" />
        </div>
        
        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 mb-3 border border-rose-200">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Access Restricted • Manager Scope Boundary</span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-2">
          Trainer Ownership Validation Failed
        </h3>

        <p className="text-sm text-slate-600 max-w-md mx-auto mb-4 leading-relaxed">
          {customDeniedMessage || validation.reason || `You are not designated as the reporting manager for ${trainer.fullName || 'this trainer'}. Direct access to this profile and operational records is restricted.`}
        </p>

        <div className="rounded-xl border border-rose-200/70 bg-white p-3.5 text-xs text-left max-w-md mx-auto mb-6 text-slate-600 space-y-1">
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Trainer Profile:</span>
            <span className="font-semibold text-slate-800">{trainer.fullName || 'Unknown'} ({trainer.employeeId || trainer.uid})</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Trainer Department:</span>
            <span className="font-semibold text-slate-800">{trainer.department || 'Not Assigned'}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Active Manager Scope:</span>
            <span className="font-semibold text-slate-800">{manager?.fullName} ({manager?.department} Department)</span>
          </div>
        </div>

        {fallbackTrainer && onSelectFallbackTrainer && (
          <button
            type="button"
            onClick={() => onSelectFallbackTrainer(fallbackTrainer.uid)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-sky-700 transition-colors cursor-pointer"
          >
            <span>Switch to Authorized Trainer ({fallbackTrainer.fullName})</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
