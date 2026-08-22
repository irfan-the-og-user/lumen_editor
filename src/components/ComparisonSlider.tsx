import React, { useState, useRef, useCallback } from 'react';
import { Eye, SplitSquareHorizontal } from 'lucide-react';

interface ComparisonSliderProps {
  originalImage: string;
  processedImage: string;
  className?: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  originalImage,
  processedImage,
  className = ''
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage (0 to 100)
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (rawX / rect.width) * 100));
      setSliderPos(percentage);
    },
    []
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handlePointerMove(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handlePointerMove(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      handlePointerMove(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className={`flex flex-col items-center gap-3 w-full max-w-3xl mx-auto ${className}`}>
      {/* Comparison Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[480px] rounded-2xl overflow-hidden select-none cursor-ew-resize border border-zinc-800 bg-zinc-950 shadow-2xl touch-none"
      >
        {/* Layer 1: Processed / After Image (Full width background) */}
        <img
          src={isHoldingOriginal ? originalImage : processedImage}
          alt="Transformed"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />

        {/* Layer 2: Original / Before Image (Clipped by slider position) */}
        {!isHoldingOriginal && (
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ width: `${sliderPos}%` }}
          >
            <img
              src={originalImage}
              alt="Original Before"
              className="absolute top-0 left-0 max-w-none h-full w-[100cqi] object-contain"
              style={{
                width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                height: containerRef.current ? `${containerRef.current.clientHeight}px` : '100%'
              }}
            />
          </div>
        )}

        {/* Slider Divider Line & Thumb */}
        {!isHoldingOriginal && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.8)] pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-900/90 border-2 border-white shadow-xl flex items-center justify-center text-zinc-100 backdrop-blur-md">
              <SplitSquareHorizontal className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-zinc-950/80 border border-zinc-800 text-[10px] font-mono text-zinc-300 backdrop-blur-md pointer-events-none">
          Before (Original)
        </div>
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 backdrop-blur-md pointer-events-none">
          After (Styled)
        </div>
      </div>

      {/* Comparison Controls Toolbar */}
      <div className="flex items-center justify-between w-full px-2 text-xs">
        <div className="flex items-center gap-2 font-mono text-zinc-400 text-[11px]">
          <span>Drag slider or</span>
        </div>

        {/* Hold to View Original Button */}
        <button
          onMouseDown={() => setIsHoldingOriginal(true)}
          onMouseUp={() => setIsHoldingOriginal(false)}
          onMouseLeave={() => setIsHoldingOriginal(false)}
          onTouchStart={() => setIsHoldingOriginal(true)}
          onTouchEnd={() => setIsHoldingOriginal(false)}
          className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-750 text-zinc-200 text-xs font-medium hover:bg-zinc-800 select-none cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hold for Original</span>
        </button>
      </div>
    </div>
  );
};
