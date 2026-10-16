import React from 'react';
import { Layers } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  showTagline?: boolean;
}

export const NxtWaveLogo: React.FC<LogoProps> = ({
  size = 'md',
  className = '',
  showTagline = false,
}) => {
  if (size === 'hero') {
    return (
      <div className={`flex items-center justify-center gap-3.5 ${className}`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white shadow-md shadow-sky-600/20">
          <Layers className="h-6 w-6 stroke-[2.2]" />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            Performance Management System
          </span>
          {showTagline && (
            <span className="text-xs font-semibold text-slate-500 mt-1">
              Sign in to access your workspace
            </span>
          )}
        </div>
      </div>
    );
  }

  if (size === 'sm') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white shadow-xs">
          <Layers className="h-4 w-4 stroke-[2.2]" />
        </div>
        <span className="text-sm font-bold text-slate-900 tracking-tight">
          Performance Management System
        </span>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white shadow-sm shadow-sky-600/20">
          <Layers className="h-5 w-5 stroke-[2.2]" />
        </div>
        <span className="text-lg font-bold text-slate-900 tracking-tight">
          Performance Management System
        </span>
      </div>
    );
  }

  // size === 'md' default
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white shadow-xs">
        <Layers className="h-4.5 w-4.5 stroke-[2.2]" />
      </div>
      <span className="text-base font-bold text-slate-900 tracking-tight">
        Performance Management System
      </span>
    </div>
  );
};

export const BrandLogo = NxtWaveLogo;
export const AppLogo = NxtWaveLogo;

