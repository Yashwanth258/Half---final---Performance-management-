import React from 'react';
import { 
  TaskStatus, 
  TaskPriority, 
  ClassStatus, 
  ProjectStatus, 
  PerformanceCategory, 
  AlertSeverity,
  AlertStatus 
} from '../../types';

interface StatusBadgeProps {
  type: 'taskStatus' | 'taskPriority' | 'classStatus' | 'projectStatus' | 'performance' | 'alertSeverity' | 'alertStatus';
  value: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, className = '', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'performance') {
    switch (value as PerformanceCategory) {
      case 'Excellent':
        colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-600/20';
        break;
      case 'Good':
        colorClasses = 'bg-blue-50 text-blue-800 border-blue-200 ring-1 ring-blue-600/20';
        break;
      case 'Needs Improvement':
        colorClasses = 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-600/20';
        break;
      case 'Critical':
        colorClasses = 'bg-rose-50 text-rose-800 border-rose-200 ring-1 ring-rose-600/20';
        break;
    }
  } else if (type === 'taskStatus') {
    switch (value as TaskStatus) {
      case 'Completed':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'In Progress':
        colorClasses = 'bg-sky-50 text-sky-700 border-sky-200';
        break;
      case 'Delayed':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'Blocked':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'Not Started':
      default:
        colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }
  } else if (type === 'taskPriority') {
    switch (value as TaskPriority) {
      case 'Urgent':
        colorClasses = 'bg-rose-100 text-rose-800 border-rose-300 font-semibold';
        break;
      case 'High':
        colorClasses = 'bg-orange-50 text-orange-700 border-orange-200';
        break;
      case 'Medium':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'Low':
      default:
        colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }
  } else if (type === 'classStatus') {
    switch (value as ClassStatus) {
      case 'Completed':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'Ongoing':
        colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse';
        break;
      case 'Scheduled':
        colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'Cancelled':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
      case 'Rescheduled':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
    }
  } else if (type === 'projectStatus') {
    switch (value as ProjectStatus) {
      case 'Completed':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'On Track':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
      case 'At Risk':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'Delayed':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
        break;
    }
  } else if (type === 'alertSeverity') {
    switch (value as AlertSeverity) {
      case 'Critical':
        colorClasses = 'bg-rose-100 text-rose-900 border-rose-300 font-semibold';
        break;
      case 'High':
        colorClasses = 'bg-orange-50 text-orange-800 border-orange-200';
        break;
      case 'Medium':
        colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
        break;
      case 'Low':
      default:
        colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
        break;
    }
  } else if (type === 'alertStatus') {
    switch (value as AlertStatus) {
      case 'NEW':
        colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
        break;
      case 'ACKNOWLEDGED':
        colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'RESOLVED':
        colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border tracking-tight ${sizeClasses} ${colorClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {value}
    </span>
  );
};
