interface SearchingAnimationProps {
  message?: string;
  queuePosition?: number;
}

export function SearchingAnimation({
  message = 'Finding someone to chat with…',
  queuePosition,
}: SearchingAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-8 px-6 animate-fade-in" role="status" aria-live="polite">
      {/* Concentric search rings */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-brand/20 animate-search-ring" />
        <div
          className="absolute inset-3 rounded-full border border-brand/30 animate-search-ring"
          style={{ animationDelay: '0.4s' }}
        />
        <div className="w-16 h-16 rounded-full bg-brand-muted flex items-center justify-center">
          <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="text-center space-y-3">
        <p className="text-subheading text-content-primary font-medium">{message}</p>
        {queuePosition !== undefined && queuePosition > 0 && (
          <p className="text-caption text-content-tertiary">
            Position in queue: {queuePosition}
          </p>
        )}
        {/* Animated dots */}
        <div className="flex items-center justify-center gap-2 pt-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-brand animate-search-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
