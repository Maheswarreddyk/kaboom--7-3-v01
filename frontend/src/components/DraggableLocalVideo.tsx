import { useRef, useState } from 'react';
import { VideoPlayer } from './VideoPlayer.js';
import { cn } from '../utils/index.js';

interface DraggableLocalVideoProps {
  stream: MediaStream | null;
}

export function DraggableLocalVideo({ stream }: DraggableLocalVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startPosition = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    startPosition.current = { ...position };
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({
      x: startPosition.current.x + dx,
      y: startPosition.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: 'none'
      }}
      className={cn(
        "absolute bottom-4 right-4 w-32 sm:w-48 aspect-video rounded-xl overflow-hidden border border-white/20 shadow-2xl z-20 bg-slate-900 cursor-move transition-transform duration-75 ease-out",
        isDragging.current ? "scale-105" : "scale-100"
      )}
    >
      <div className="absolute inset-0 pointer-events-none z-10" />
      <VideoPlayer
        stream={stream}
        muted
        mirrored
        className="w-full h-full"
        label="You"
      />
    </div>
  );
}
