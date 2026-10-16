import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  CheckSquare, 
  FileText, 
  FolderGit2, 
  Award, 
  Target, 
  Bell, 
  User, 
  Users, 
  UserSearch, 
  BarChart3, 
  AlertTriangle, 
  FileSpreadsheet, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Briefcase,
  GitCompare,
  X,
  Sparkles,
  ShieldAlert,
  GraduationCap,
  HeartHandshake,
  Calculator
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Tooltip } from './Tooltip';
import { NxtWaveLogo } from './NxtWaveLogo';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItemProps {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: React.ReactNode;
  isSub?: boolean;
  tooltip?: string;
  currentView: string;
  onNavigate: (view: string) => void;
  onClose?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  id,
  label,
  icon: Icon,
  badge,
  isSub = false,
  tooltip,
  currentView,
  onNavigate,
  onClose,
}) => {
  const active = currentView === id;
  const itemButton = (
    <button
      type="button"
      onClick={() => {
        onNavigate(id);
        if (onClose) onClose();
      }}
      aria-label={label}
      className={`group relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
        isSub ? 'pl-8' : ''
      } ${
        active
          ? 'bg-sky-600 text-white font-semibold shadow-xs shadow-sky-600/25'
          : 'text-slate-600 hover:bg-sky-50/80 hover:text-sky-900'
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            className={`h-4 w-4 shrink-0 transition-colors ${
              active
                ? 'text-white'
                : 'text-sky-500/80 group-hover:text-sky-700'
            }`}
          />
        )}
        <span className="truncate">{label}</span>
      </div>
      {badge}
    </button>
  );

  if (tooltip) {
    return (
      <Tooltip content={tooltip} placement="right" className="w-full">
        {itemButton}
      </Tooltip>
    );
  }

  return itemButton;
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen = false, onClose }) => {
  const { isManager, isTrainer } = useAuth();
  const { alerts = [], notifications = [], managerChangeRequests = [] } = useData();
  const [dailyWorkExpanded, setDailyWorkExpanded] = useState(true);

  const activeAlertsCount = (alerts || []).filter(a => a.status === 'NEW').length;
  const unreadNotifsCount = (notifications || []).filter(n => !n.read).length;
  const pendingRequestsCount = (managerChangeRequests || []).filter(r => r.status === 'PENDING').length;

  const renderNav = (id: string, label: string, icon?: React.ElementType, tooltip?: string, badge?: React.ReactNode, isSub = false) => (
    <NavItem
      key={id}
      id={id}
      label={label}
      icon={icon}
      tooltip={tooltip}
      badge={badge}
      isSub={isSub}
      currentView={currentView}
      onNavigate={onNavigate}
      onClose={onClose}
    />
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-sky-100 bg-white p-4 shadow-xl transition-transform duration-200 ease-in-out lg:static lg:w-64 lg:shadow-none lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Mobile Close Button */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <div className="flex flex-col gap-1.5">
              <NxtWaveLogo size="sm" />
              <div className="pl-10.5">
                <span className="inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200/80">
                  {isManager ? 'Manager Workspace' : 'Instructor Workspace'}
                </span>
              </div>
            </div>

            {onClose && (
              <Tooltip content="Close navigation menu" placement="left">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-slate-600 lg:hidden cursor-pointer"
                  aria-label="Close navigation sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </Tooltip>
            )}
          </div>

          {/* Navigation Group Header */}
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-bold text-sky-800 uppercase tracking-wider mb-2">
              {isManager ? 'Management Navigation' : 'Workspace Navigation'}
            </p>

            {isManager ? (
              /* Manager Navigation Menu */
              <nav className="space-y-1">
                {renderNav("dashboard", "Dashboard Overview", LayoutDashboard, "High-level executive metrics and alerts")}
                {renderNav("team-performance", "Team Performance", Users, "Team scorecards, rankings & distribution")}
                {renderNav("individual-performance", "Individual 360°", UserSearch, "Comprehensive 360° instructor scorecards")}
                {renderNav("manager-change-requests", "Change Requests", GitCompare, "Review and manage instructor manager transfer requests", pendingRequestsCount > 0 ? (
                  <span className="rounded-full bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 shadow-xs">
                    {pendingRequestsCount}
                  </span>
                ) : undefined)}
                {renderNav("reports", "Reports & Excel Export", FileSpreadsheet, "Individual & full team instructor attendance & Excel export hub")}
                {renderNav("settings", "Profile & Settings", Settings, "Manager profile, domain scope & weight settings")}
              </nav>
            ) : (
              /* Instructor Navigation Menu */
              <nav className="space-y-1">
                {renderNav("dashboard", "Dashboard", LayoutDashboard, "Personal scorecard, attendance & daily metrics")}
                {renderNav("daily-work", "Daily Work & Attendance", FileText, "Log daily hours, attendance, class delivery & burnout report")}
                {renderNav("profile", "Profile & Settings", User, "View & edit instructor profile, campus & qualifications")}
              </nav>
            )}
          </div>
        </div>

        {/* Footer Info Box */}
        <div className="mt-auto pt-4">
          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-sky-900">
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              <span>{isManager ? 'Manager Workspace' : 'Instructor Workspace'}</span>
            </div>
            <p className="text-[10px] text-sky-600/80 mt-0.5">
              Performance Management System
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
;

