import { useToast } from '../contexts/ToastContext.js';
import { cn } from '../utils/index.js';

const toastIcons = {
  success: (
    <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const toastStyles = {
  success: 'border-success/25 bg-success-muted/30',
  error: 'border-danger/25 bg-danger-muted/30',
  warning: 'border-warning/25 bg-warning-muted/30',
  info: 'border-brand/25 bg-brand-muted/30',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-[max(5rem,calc(4rem+env(safe-area-inset-top)))] right-4 z-[100] flex flex-col gap-2 max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'glass rounded-xl px-4 py-3 flex items-start gap-3 animate-slide-up cursor-pointer border',
            toastStyles[toast.type]
          )}
          onClick={() => removeToast(toast.id)}
          role="alert"
        >
          <span className="mt-0.5 flex-shrink-0">{toastIcons[toast.type]}</span>
          <p className="text-caption text-content-primary leading-relaxed">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
