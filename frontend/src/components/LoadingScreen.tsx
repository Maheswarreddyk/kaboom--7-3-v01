import { cn } from '../utils/index.js';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ message = 'Loading…', fullScreen = true }: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-6 page-enter',
        fullScreen ? 'min-h-screen' : 'py-16'
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-2 border-brand/15" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand animate-spin" />
      </div>
      <p className="text-caption text-content-secondary animate-shimmer">{message}</p>
    </div>
  );
}
