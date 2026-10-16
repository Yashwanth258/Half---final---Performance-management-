import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastMessage } from '../types/toast';

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'> & { id?: string }) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastMessage, 'id'> & { id?: string }) => {
      const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessage = {
        ...toast,
        id,
        timestamp: toast.timestamp || Date.now(),
        duration: toast.duration ?? 6000,
        type: toast.type || 'info',
      };

      setToasts((prev) => {
        // Prevent duplicate IDs or replace existing
        const filtered = prev.filter((t) => t.id !== id);
        // Limit max toasts on screen to 4
        const updated = [newToast, ...filtered].slice(0, 4);
        return updated;
      });

      return id;
    },
    []
  );

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
