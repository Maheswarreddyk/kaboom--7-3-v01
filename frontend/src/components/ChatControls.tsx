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
  likeAnimating?: boolean;
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
  likeAnimating = false,
  onLike,
  onOpenPreferences,
  unreadCount = 0,
}: ChatControlsProps) {
  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3 max-w-lg mx-auto"
      role="toolbar"
      aria-label="Video call controls"
    >
      {onOpenPreferences && (
        <button
          onClick={onOpenPreferences}
          className="control-btn control-btn-sm"
          title="Preferences"
          aria-label="Match preferences"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      <button
        onClick={onToggleMute}
        disabled={disabled}
        className={cn('control-btn control-btn-sm', isMuted && 'control-btn-active')}
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        aria-pressed={isMuted}
      >
        {isMuted ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      <button
        onClick={onToggleCamera}
        disabled={disabled}
        className={cn('control-btn control-btn-sm', isCameraOff && 'control-btn-active')}
        title={isCameraOff ? 'Enable camera' : 'Disable camera'}
        aria-label={isCameraOff ? 'Enable camera' : 'Disable camera'}
        aria-pressed={isCameraOff}
      >
        {isCameraOff ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {onLike && (
        <button
          onClick={onLike}
          disabled={disabled || liked}
          className={cn(
            'control-btn control-btn-sm transition-all duration-300',
            liked && 'control-btn-like-active cursor-default',
            likeAnimating && 'animate-heart-beat animate-heart-glow',
            !liked && !disabled && 'hover:text-like hover:bg-like-muted hover:border-like/30'
          )}
          title={liked ? 'Liked' : 'Like partner'}
          aria-label={liked ? 'Liked' : 'Like partner'}
          aria-pressed={liked}
        >
          {liked ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
      )}

      {onToggleChat && (
        <button
          onClick={onToggleChat}
          disabled={disabled}
          className={cn('control-btn control-btn-sm relative', isChatOpen && 'control-btn-active')}
          title="Toggle chat"
          aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
          aria-expanded={isChatOpen}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-like text-[10px] font-bold text-white px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      <button
        onClick={onNext}
        disabled={disabled}
        className="control-btn control-btn-sm bg-brand-muted border-brand/30 text-brand hover:bg-brand/20"
        title="Next partner"
        aria-label="Skip to next partner"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      <button
        onClick={onReport}
        disabled={disabled}
        className="control-btn control-btn-sm"
        title="Report"
        aria-label="Report partner"
      >
        <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </button>

      <button
        onClick={onToggleFullscreen}
        disabled={disabled}
        className={cn('control-btn control-btn-sm hidden lg:flex', isFullscreen && 'control-btn-active')}
        title="Fullscreen"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        aria-pressed={isFullscreen}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>

      <button
        onClick={onLeave}
        className="control-btn control-btn-sm control-btn-danger"
        title="Leave chat"
        aria-label="Leave chat session"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}
