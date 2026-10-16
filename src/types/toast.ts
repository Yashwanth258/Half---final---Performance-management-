export type ToastType = 'info' | 'success' | 'warning' | 'urgent';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: ToastType;
  duration?: number; // Duration in milliseconds, default 6000ms
  action?: ToastAction;
  timestamp?: number;
  category?: 'task' | 'project' | 'alert' | 'system';
}
