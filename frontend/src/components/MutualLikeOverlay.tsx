import { useEffect } from 'react';

interface MutualLikeOverlayProps {
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function MutualLikeOverlay({ onDismiss, autoDismissMs = 6000 }: MutualLikeOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [onDismiss, autoDismissMs]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-glass overflow-hidden animate-fade-in"
      role="dialog"
      aria-labelledby="mutual-like-title"
      aria-modal="true"
    >
      {/* Soft floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="absolute text-xl sm:text-2xl animate-float-particle opacity-60"
            style={{
              left: `${10 + (i * 8) % 80}%`,
              animationDelay: `${i * 0.35}s`,
              animationDuration: `${3 + (i % 2)}s`,
            }}
          >
            {i % 2 === 0 ? '❤️' : '✨'}
          </span>
        ))}
      </div>

      <div className="relative z-10 p-8 sm:p-10 surface-elevated text-center shadow-soft-xl max-w-sm w-[90%] animate-scale-up">
        <div className="flex justify-center mb-6">
          <span className="text-5xl animate-heart-beat" role="img" aria-label="Heart">❤️</span>
        </div>

        <h3
          id="mutual-like-title"
          className="text-display font-bold text-content-primary tracking-tight"
        >
          Hurray ❤️
        </h3>

        <p className="text-subheading text-content-secondary mt-3 leading-relaxed">
          You both enjoyed talking to each other.
        </p>

        <p className="text-caption text-content-tertiary mt-2 leading-relaxed">
          Keep chatting and enjoy the conversation.
        </p>

        <button
          onClick={onDismiss}
          className="btn-primary w-full mt-8"
        >
          Continue Chatting
        </button>
      </div>
    </div>
  );
}
