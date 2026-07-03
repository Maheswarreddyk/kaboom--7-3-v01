import { useState } from 'react';
import { REPORT_REASONS, type ReportReason } from '../types/index.js';
import { cn } from '../utils/index.js';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, notes: string) => Promise<void>;
}

export function ReportModal({ isOpen, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(reason, notes);
      setReason('spam');
      setNotes('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative surface-elevated w-full max-w-md animate-slide-up shadow-soft-xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 id="report-title" className="text-heading text-content-primary">Report User</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-white/8 flex items-center justify-center text-content-tertiary hover:text-content-primary transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-caption font-medium text-content-secondary mb-3">Reason</label>
              <div className="grid grid-cols-2 gap-2">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={cn(
                      'px-3 py-2.5 rounded-xl text-caption font-medium transition-all duration-200',
                      reason === r.value
                        ? 'bg-danger-muted text-danger border border-danger/35'
                        : 'bg-surface-glass border border-edge text-content-secondary hover:bg-white/8 hover:text-content-primary'
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-caption font-medium text-content-secondary mb-2">
                Additional notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe what happened…"
                rows={3}
                className="textarea-field"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn-danger flex-1">
                {isSubmitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
