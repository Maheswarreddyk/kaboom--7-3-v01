import { cn } from '../utils/index.js';

interface ChatControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onNext: () => void;
  onReport: () => void;
  onLeave: () => void;
  onToggleFullscreen: () => void;
  disabled?: boolean;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
  liked?: boolean;
  onLike?: () => void;
  onOpenPreferences?: () => void;
  unreadCount?: number;
}

export function ChatControls({
  isMuted,
  isCameraOff,
  isFullscreen,
  onToggleMute,
  onToggleCamera,
  onNext,
  onReport,
  onLeave,
  onToggleFullscreen,
  disabled = false,
  isChatOpen = false,
  onToggleChat,
  liked = false,
  onLike,
  onOpenPreferences,
  unreadCount = 0,
}: ChatControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
      {onOpenPreferences && (
        <button
          onClick={onOpenPreferences}
          className="control-btn border-accent/20 hover:bg-white/5"
          title="Preferences"
          aria-label="Match Preferences"
        >
          ⚙️
        </button>
      )}

      <button
        onClick={onToggleMute}
        disabled={disabled}
        className={cn('control-btn', isMuted && 'control-btn-active')}
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        aria-pressed={isMuted}
      >
        {isMuted ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      <button
        onClick={onToggleCamera}
        disabled={disabled}
        className={cn('control-btn', isCameraOff && 'control-btn-active')}
        title={isCameraOff ? 'Enable Camera' : 'Disable Camera'}
        aria-label={isCameraOff ? 'Enable Camera' : 'Disable Camera'}
        aria-pressed={isCameraOff}
      >
        {isCameraOff ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {onLike && (
        <button
          onClick={() => {
            if (!liked) {
              if ('vibrate' in navigator) navigator.vibrate(50);
              onLike();
            }
          }}
          disabled={disabled || liked}
          className={cn(
            "control-btn transition-all duration-300", 
            liked 
              ? "bg-red-500/20 border-red-500/50 text-red-500 scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)] cursor-default" 
              : "hover:text-red-400 hover:scale-105"
          )}
          title="Like Partner"
          aria-label="Like Partner"
          aria-pressed={liked}
        >
          {liked ? (
            <svg className="w-6 h-6 animate-pulse drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
      )}

      {onToggleChat && (
        <button
          onClick={onToggleChat}
          disabled={disabled}
          className={cn('control-btn relative', isChatOpen && 'control-btn-active')}
          title="Toggle Chat"
          aria-label={isChatOpen ? 'Close Chat' : 'Open Chat'}
          aria-expanded={isChatOpen}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-550 text-[10px] font-bold text-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      <button
        onClick={onNext}
        disabled={disabled}
        className="control-btn bg-accent/20 border-accent/40 hover:bg-accent/30 animate-pulse"
        title="Next"
        aria-label="Skip to Next Partner"
      >
        <svg className="w-5 h-5 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      <button onClick={onReport} disabled={disabled} className="control-btn" title="Report" aria-label="Report Partner">
        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </button>

      <button
        onClick={onToggleFullscreen}
        disabled={disabled}
        className={cn('control-btn hidden sm:flex', isFullscreen && 'control-btn-active')}
        title="Fullscreen"
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        aria-pressed={isFullscreen}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>

      <button
        onClick={onLeave}
        className="control-btn control-btn-danger"
        title="Leave Chat"
        aria-label="Leave Chat Session"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}
