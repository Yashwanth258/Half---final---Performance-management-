import React, { useState } from 'react';
import { 
  LogOut, 
  UserCheck, 
  ChevronDown, 
  Menu, 
  RefreshCw 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Tooltip } from './Tooltip';
import { NxtWaveLogo } from './NxtWaveLogo';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onNavigate: (view: string) => void;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate, onOpenNotifications }) => {
  const { 
    userProfile, 
    isManager, 
    isTrainer, 
    logout 
  } = useAuth();
  
  const { alerts = [], notifications = [], reseedData, isSeeding } = useData();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-sky-100 bg-white/95 px-4 backdrop-blur-md sm:px-6 shadow-xs">
      {/* Left: Mobile Toggle & Brand (Mobile only) / Department Context (Desktop) */}
      <div className="flex items-center gap-3">
        <Tooltip content="Toggle Navigation Menu" placement="bottom">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-sky-700 hover:bg-sky-50 hover:text-sky-900 lg:hidden transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </Tooltip>

        {/* Mobile-Only Logo (Sidebar is hidden on mobile) */}
        <div className="lg:hidden">
          <NxtWaveLogo size="sm" />
        </div>

        {/* Desktop Context (Sidebar is already visible on the left with the Logo) */}
        <div className="hidden lg:flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 border border-sky-200/70">
            <span className="h-2 w-2 rounded-full bg-sky-600"></span>
            {userProfile?.department || 'GenAI'} Department
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs font-semibold text-slate-600">
            {userProfile?.designation || (isManager ? 'Capability Lead' : 'Technical Instructor')}
          </span>
        </div>
      </div>

      {/* Right: Database Sync, Profile & Sign Out */}
      <div className="flex items-center gap-2.5">
        {/* Sync Data Button */}
        <Tooltip content="Sync Firestore records & refresh data" placement="bottom">
          <button
            type="button"
            onClick={() => reseedData()}
            disabled={isSeeding}
            className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50/60 px-2.5 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100 hover:text-sky-900 transition-colors cursor-pointer"
            aria-label="Sync Workspace Records"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSeeding ? 'animate-spin text-sky-600' : 'text-sky-500'}`} />
            <span>{isSeeding ? 'Syncing...' : 'Sync Workspace'}</span>
          </button>
        </Tooltip>

        {/* User Profile Menu & Sign Out */}
        <div className="relative">
          <Tooltip content="User Profile & Preferences" placement="bottom">
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 rounded-xl border border-sky-100 bg-white p-1.5 hover:bg-sky-50 transition-colors shadow-xs"
              aria-label="User profile settings menu"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white uppercase bg-sky-600">
                {userProfile?.fullName ? userProfile.fullName.slice(0, 2) : 'TW'}
              </div>
              <div className="hidden md:block text-left text-xs pr-1">
                <p className="font-semibold text-slate-900 leading-tight">
                  {userProfile?.fullName || 'User Profile'}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
            </button>
          </Tooltip>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-sky-100 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="border-b border-sky-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">
                      {userProfile?.fullName}
                    </p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase bg-sky-100 text-sky-800">
                      {userProfile?.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {userProfile?.companyEmail}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-100">
                      {userProfile?.employeeId}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {userProfile?.teamName}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(isManager ? 'settings' : 'profile');
                      setProfileDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-sky-50 transition-colors cursor-pointer"
                  >
                    <UserCheck className="h-4 w-4 text-sky-600" />
                    <span>Profile & Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setProfileDropdownOpen(false);
                      await logout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Direct Sign Out button for quick exit */}
        <Tooltip content="Sign out of your session" placement="bottom">
          <button
            type="button"
            onClick={async () => {
              await logout();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-sky-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors shadow-xs"
            aria-label="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </Tooltip>
      </div>
    </header>
  );
};

