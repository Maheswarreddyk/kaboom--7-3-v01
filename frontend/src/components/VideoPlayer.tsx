import { useEffect, useRef } from 'react';
import { cn } from '../utils/index.js';

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
  label?: string;
  placeholder?: string;
}

export function VideoPlayer({
  stream,
  muted = false,
  mirrored = false,
  className,
  label,
  placeholder = 'Waiting for video…',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn('relative overflow-hidden bg-surface', className)}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={cn('w-full h-full object-cover', mirrored && 'scale-x-[-1]')}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center animate-fade-in">
          <div className="text-center space-y-4 px-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-elevated border border-edge flex items-center justify-center">
              <svg className="w-7 h-7 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-caption text-content-tertiary">{placeholder}</p>
          </div>
        </div>
      )}
      {label && (
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-xs text-micro text-content-secondary">
          {label}
        </div>
      )}
    </div>
  );
}
