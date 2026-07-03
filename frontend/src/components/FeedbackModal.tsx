import { useState } from 'react';
import { cn } from '../utils/index.js';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => Promise<void>;
}

export function FeedbackModal({ isOpen, onClose, onSubmit }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, feedback);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setRating(0);
    setFeedback('');
    onClose();
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={handleSkip} aria-hidden="true" />
      <div className="relative surface-elevated max-w-md w-full animate-scale-up shadow-soft-xl">
        <div className="p-6">
          <h2 id="feedback-title" className="text-heading text-content-primary mb-1">How was your chat?</h2>
          <p className="text-caption text-content-tertiary mb-6">Your feedback helps us improve IndiaTV.</p>

          <div className="flex justify-center gap-2 mb-6" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="w-11 h-11 rounded-xl hover:bg-white/8 transition-all duration-200 active:scale-95 flex items-center justify-center"
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                <span className={cn('text-2xl transition-colors duration-200', displayRating >= star ? 'text-warning' : 'text-content-tertiary/30')}>
                  ★
                </span>
              </button>
            ))}
          </div>

          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us more about your experience (optional)…"
            rows={3}
            className="textarea-field mb-6"
          />

          <div className="flex gap-3">
            <button onClick={handleSkip} className="btn-secondary flex-1" disabled={submitting}>
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="btn-primary flex-1"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
