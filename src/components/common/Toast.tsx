import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Bell, 
  X, 
  ArrowRight,
  FolderGit2
} from 'lucide-react';
import { ToastMessage, ToastType } from '../../types/toast';
import { useToast } from '../../context/ToastContext';

const getToastIcon = (type?: ToastType, category?: ToastMessage['category']) => {
  if (category === 'task') return CheckSquare;
  if (category === 'project') return FolderGit2;
  switch (type) {
    case 'urgent':
      return AlertOctagon;
    case 'warning':
      return AlertTriangle;
    case 'success':
      return CheckCircle2;
    case 'info':
    default:
      return Bell;
  }
};

const getToastStyles = (type?: ToastType) => {
  switch (type) {
    case 'urgent':
      return {
        cardBorder: 'border-rose-300 shadow-rose-500/10',
        iconBg: 'bg-rose-100 text-rose-700 ring-4 ring-rose-50',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        progressBar: 'bg-rose-500',
        actionBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20',
      };
    case 'warning':
      return {
        cardBorder: 'border-amber-300 shadow-amber-500/10',
        iconBg: 'bg-amber-100 text-amber-800 ring-4 ring-amber-50',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        progressBar: 'bg-amber-500',
        actionBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20',
      };
    case 'success':
      return {
        cardBorder: 'border-emerald-300 shadow-emerald-500/10',
        iconBg: 'bg-emerald-100 text-emerald-800 ring-4 ring-emerald-50',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        progressBar: 'bg-emerald-500',
        actionBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20',
      };
    case 'info':
    default:
      return {
        cardBorder: 'border-sky-300 shadow-sky-500/10',
        iconBg: 'bg-sky-100 text-sky-800 ring-4 ring-sky-50',
        badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
        progressBar: 'bg-sky-500',
        actionBtn: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20',
      };
  }
};

const ToastItem: React.FC<{ toast: ToastMessage }> = ({ toast }) => {
  const { removeToast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = toast.duration ?? 6000;
  const remainingTimeRef = useRef(duration);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    if (duration <= 0) return;

    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      if (!isHovered) {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - delta);
        setProgress((remainingTimeRef.current / duration) * 100);

        if (remainingTimeRef.current <= 0) {
          clearInterval(interval);
          removeToast(toast.id);
        }
      }
      lastTickRef.current = Date.now();
    }, 50);

    return () => clearInterval(interval);
  }, [duration, isHovered, removeToast, toast.id]);

  const IconComponent = getToastIcon(toast.type, toast.category);
  const styles = getToastStyles(toast.type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={toast.type === 'urgent' ? 'alert' : 'status'}
      aria-live="polite"
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border bg-white/95 backdrop-blur-md p-4 shadow-xl transition-all ${styles.cardBorder} hover:shadow-2xl`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
          <IconComponent className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-tight">
              {toast.title}
            </h4>
            {toast.category && (
              <span className={`inline-block shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${styles.badgeBg}`}>
                {toast.category}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed break-words">
            {toast.message}
          </p>

          {/* Action button */}
          {toast.action && (
            <div className="mt-2.5 flex items-center">
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  removeToast(toast.id);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-xs transition-colors ${styles.actionBtn}`}
              >
                <span>{toast.action.label}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => removeToast(toast.id)}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
          <div
            className={`h-full transition-all duration-75 ${styles.progressBar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5 pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
