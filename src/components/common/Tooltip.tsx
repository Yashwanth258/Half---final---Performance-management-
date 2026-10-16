import React, { useState, useRef, useEffect, useId } from 'react';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  disabled?: boolean;
  className?: string;
  shortcut?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  delay = 150,
  disabled = false,
  className = '',
  shortcut,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const showTooltip = () => {
    if (disabled || !content) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  // Close on ESC key for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        hideTooltip();
      }
    };
    if (isVisible) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVisible]);

  // Placement class mappings
  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent border-t-[5px] border-x-[5px] border-b-0',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent border-b-[5px] border-x-[5px] border-t-0',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent border-l-[5px] border-y-[5px] border-r-0',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent border-r-[5px] border-y-[5px] border-l-0',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && !disabled && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none absolute z-50 flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xl shadow-slate-950/40 animate-in fade-in zoom-in-95 duration-100 ${placementClasses[placement]}`}
        >
          <span>{content}</span>
          {shortcut && (
            <kbd className="rounded border border-slate-600 bg-slate-800 px-1 py-0.2 text-[9px] font-mono text-slate-300">
              {shortcut}
            </kbd>
          )}
          {/* Arrow */}
          <div className={`absolute h-0 w-0 ${arrowClasses[placement]}`} />
        </div>
      )}
    </div>
  );
};
