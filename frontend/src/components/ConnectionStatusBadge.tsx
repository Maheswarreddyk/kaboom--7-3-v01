import { cn } from '../utils/index.js';
import type { ConnectionStatus } from '../types/index.js';

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
  className?: string;
}

const statusConfig: Record<ConnectionStatus, { label: string; badgeClass: string }> = {
  disconnected: { label: 'Disconnected', badgeClass: 'badge bg-white/5 text-content-tertiary border-edge' },
  connecting: { label: 'Connecting…', badgeClass: 'badge-warning' },
  connected: { label: 'Connected', badgeClass: 'badge-success' },
  failed: { label: 'Connection failed', badgeClass: 'badge bg-danger-muted text-danger border-danger/25' },
  reconnecting: { label: 'Reconnecting…', badgeClass: 'badge-warning' },
};

export function ConnectionStatusBadge({ status, className }: ConnectionStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className={cn(config.badgeClass, className)} role="status" aria-live="polite">
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'connected' && 'bg-success',
          (status === 'connecting' || status === 'reconnecting') && 'bg-warning animate-pulse-soft',
          status === 'failed' && 'bg-danger',
          status === 'disconnected' && 'bg-content-tertiary'
        )}
        aria-hidden="true"
      />
      {config.label}
    </div>
  );
}
