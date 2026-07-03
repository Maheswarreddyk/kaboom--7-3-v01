import { useRef, useState, useEffect } from 'react';
import { VideoPlayer } from './VideoPlayer.js';
import { cn } from '../utils/index.js';

interface DraggableLocalVideoProps {
  stream: MediaStream | null;
  className?: string;
}

export function DraggableLocalVideo({ stream, className }: DraggableLocalVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const reset = () => setPosition({ x: 0, y: 0 });
    window.addEventListener('orientationchange', reset);
    window.addEventListener('resize', reset);
    return () => {
      window.removeEventListener('orientationchange', reset);
      window.removeEventListener('resize', reset);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    startPosition.current = { ...position };
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: startPosition.current.x + (e.clientX - dragStart.current.x),
      y: startPosition.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, touchAction: 'none' }}
      className={cn(
        'absolute z-20 cursor-grab active:cursor-grabbing select-none',
        'w-[26vw] max-w-[112px] min-w-[80px] aspect-[3/4]',
        'bottom-[calc(max(5.5rem,env(safe-area-inset-bottom))+0.5rem)] right-[max(0.75rem,env(safe-area-inset-right))]',
        'sm:w-36 sm:max-w-none sm:min-w-0 sm:aspect-video sm:bottom-5 sm:right-5',
        'md:w-44 lg:w-52',
        'rounded-2xl overflow-hidden',
        'border-2 border-white/20 shadow-soft-lg bg-surface',
        'transition-transform duration-100 ease-smooth',
        isDragging && 'scale-[1.03] opacity-95 shadow-soft-xl',
        className
      )}
      aria-label="Your video preview — drag to reposition"
    >
      <VideoPlayer stream={stream} muted mirrored className="w-full h-full object-cover" label="You" />
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent py-1.5 px-2.5 pointer-events-none">
        <span className="text-micro text-white/80 font-medium">You</span>
      </div>
    </div>
  );
}
