import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  progress?: {
    current: number;
    max: number;
    color?: string;
  };
  badge?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  progress,
  badge,
  variant = 'default',
  className = '',
  onClick,
}) => {
  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return 'text-sky-600 bg-sky-50 border border-sky-100';
      case 'success':
        return 'text-emerald-600 bg-emerald-50 border border-emerald-100';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border border-amber-100';
      case 'danger':
        return 'text-rose-600 bg-rose-50 border border-rose-100';
      default:
        return 'text-sky-700 bg-sky-50/80 border border-sky-100';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-5 shadow-xs transition-all hover:border-sky-200 hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </h3>
            {badge}
          </div>
        </div>

        <div className={`rounded-xl p-2.5 shadow-2xs ${getIconColor()}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {progress && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Progress</span>
            <span className="font-semibold text-slate-700">{Math.round((progress.current / progress.max) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-sky-100/70">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress.color || 'bg-sky-500'
              }`}
              style={{
                width: `${Math.min(100, (progress.current / progress.max) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          {subtitle && <span className="font-medium">{subtitle}</span>}
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                trend.isNeutral
                  ? 'text-slate-500'
                  : trend.isPositive
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              {trend.isNeutral ? (
                <Minus className="h-3 w-3" />
              ) : trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
