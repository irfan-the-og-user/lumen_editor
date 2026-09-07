import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Undo2, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sliders, 
  Sparkles,
  Palette
} from 'lucide-react';
import { loadImage, calculateFitDimensions } from '../utils/canvasUtils';
import type { Point, Stroke } from '../utils/canvasUtils';
import type { ColorSpace } from '../types';

interface CanvasWorkspaceProps {
  imageUrl: string;
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  isDrawingEnabled: boolean;
  maskColor?: string;
  isProcessing?: boolean;
  colorSpace?: ColorSpace;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  imageUrl,
  strokes,
  onStrokesChange,
  brushSize,
  onBrushSizeChange,
  isDrawingEnabled,
  maskColor = 'rgba(244, 63, 94, 0.45)', // High-visibility rose mask
  isProcessing = false,
  colorSpace = 'srgb'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [nativeImage, setNativeImage] = useState<HTMLImageElement | null>(null);
  const [displayDimensions, setDisplayDimensions] = useState<{ width: number; height: number; scale: number }>({
    width: 360,
    height: 270,
    scale: 1
  });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  // Load image whenever source changes
  useEffect(() => {
    let isMounted = true;
    loadImage(imageUrl)
      .then((img) => {
        if (isMounted) {
          setNativeImage(img);
        }
      })
      .catch((err) => {
        console.error('Failed to load image into canvas:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  // Recalculate dimensions on resize or image load
  const updateDimensions = useCallback(() => {
    if (!containerRef.current || !nativeImage) return;

    const containerWidth = containerRef.current.clientWidth - 24; // padding buffer
    // On mobile screens, provide adequate vertical workspace
    const maxViewportHeight = Math.min(window.innerHeight * 0.55, 600);

    const fit = calculateFitDimensions(
      nativeImage.naturalWidth,
      nativeImage.naturalHeight,
      containerWidth,
      maxViewportHeight
    );

    setDisplayDimensions(fit);
  }, [nativeImage]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Render base image to image canvas
  useEffect(() => {
    const canvas = imageCanvasRef.current;
    if (!canvas || !nativeImage) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayDimensions.width * dpr;
    canvas.height = displayDimensions.height * dpr;

    const ctx = (canvas.getContext('2d', { colorSpace }) || canvas.getContext('2d')) as CanvasRenderingContext2D | null;
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayDimensions.width, displayDimensions.height);
    ctx.drawImage(nativeImage, 0, 0, displayDimensions.width, displayDimensions.height);
  }, [nativeImage, displayDimensions, colorSpace]);

  // Render strokes to mask overlay canvas
  const redrawMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayDimensions.width * dpr;
    canvas.height = displayDimensions.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayDimensions.width, displayDimensions.height);

    // Draw all confirmed strokes
    const allStrokes = [...strokes];
    if (currentStroke.length > 0) {
      allStrokes.push({
        points: currentStroke,
        size: brushSize,
        color: maskColor
      });
    }

    for (const stroke of allStrokes) {
      if (stroke.points.length === 0) continue;

      ctx.fillStyle = stroke.color;
      ctx.strokeStyle = stroke.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size;

      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    }
  }, [strokes, currentStroke, brushSize, maskColor, displayDimensions]);

  useEffect(() => {
    redrawMask();
  }, [redrawMask]);

  // Helper to extract canvas relative coordinate from Mouse or Touch event
  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): Point | null => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * displayDimensions.width;
    const y = ((clientY - rect.top) / rect.height) * displayDimensions.height;

    return { x, y };
  };

  // Drawing event handlers
  const handleStart = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingEnabled || isProcessing) return;
    if ('touches' in e) {
      e.stopPropagation();
    }
    const pt = getCanvasCoordinates(e);
    if (!pt) return;

    setIsDrawing(true);
    setCurrentStroke([pt]);
    setCursorPos(pt);
  };

  const handleMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const pt = getCanvasCoordinates(e);
    if (pt) setCursorPos(pt);

    if (!isDrawing || !isDrawingEnabled || isProcessing) return;
    if ('touches' in e) {
      e.stopPropagation();
    }
    if (!pt) return;

    setCurrentStroke((prev) => [...prev, pt]);
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStroke.length > 0) {
      const newStroke: Stroke = {
        points: currentStroke,
        size: brushSize,
        color: maskColor
      };
      onStrokesChange([...strokes, newStroke]);
    }
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    if (strokes.length > 0) {
      onStrokesChange(strokes.slice(0, -1));
    }
  };

  const handleClear = () => {
    onStrokesChange([]);
    setCurrentStroke([]);
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Top Workspace Toolbar: Brush Controls & Zoom */}
      <div className="w-full max-w-3xl glass-pill px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Brush Size Adjustment */}
        {isDrawingEnabled && (
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-zinc-300 uppercase tracking-wider font-medium">Brush:</span>
            <input
              type="range"
              min="8"
              max="72"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-24 sm:w-32 accent-emerald-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              disabled={isProcessing}
            />
            <span className="font-mono text-zinc-400 w-8">{brushSize}px</span>
          </div>
        )}

        {/* Color Space Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono">
          <Palette className={`w-3.5 h-3.5 ${colorSpace === 'display-p3' ? 'text-purple-400' : 'text-zinc-400'}`} />
          <span className={colorSpace === 'display-p3' ? 'text-purple-300 font-semibold' : 'text-zinc-400'}>
            {colorSpace === 'display-p3' ? 'Display P3 Wide Gamut' : 'sRGB Color Pipeline'}
          </span>
        </div>

        {/* Action Controls: Undo, Clear, Zoom */}
        <div className="flex items-center gap-1.5 ml-auto">
          {isDrawingEnabled && (
            <>
              <button
                onClick={handleUndo}
                disabled={strokes.length === 0 || isProcessing}
                className="tactile-btn p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 border border-zinc-700/60"
                title="Undo last stroke"
              >
                <Undo2 className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px] font-medium">Undo</span>
              </button>

              <button
                onClick={handleClear}
                disabled={strokes.length === 0 || isProcessing}
                className="tactile-btn p-2 rounded-lg bg-zinc-800/80 hover:bg-rose-950/40 text-zinc-200 hover:text-rose-300 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 border border-zinc-700/60"
                title="Clear mask"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px] font-medium">Clear</span>
              </button>
            </>
          )}

          {/* Zoom controls */}
          <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800 p-0.5 ml-1">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] px-1.5 text-zinc-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2, z + 0.25))}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded border-l border-zinc-800"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Viewport Container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-3xl flex items-center justify-center p-3 sm:p-4 rounded-2xl bg-zinc-950 border border-zinc-850 overflow-hidden shadow-2xl min-h-[300px]"
      >
        {/* Subtle checkered transparent grid background */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '16px 16px'
          }}
        />

        <div
          className="relative transition-transform duration-100 ease-out select-none"
          style={{
            width: displayDimensions.width,
            height: displayDimensions.height,
            transform: `scale(${zoomLevel})`,
            touchAction: isDrawingEnabled ? 'none' : 'auto'
          }}
        >
          {/* Base Layer: Native Image Canvas */}
          <canvas
            ref={imageCanvasRef}
            className="absolute inset-0 w-full h-full rounded-xl shadow-md pointer-events-none"
            style={{ width: displayDimensions.width, height: displayDimensions.height }}
          />

          {/* Top Layer: Interactive Mask Overlay Canvas */}
          <canvas
            ref={maskCanvasRef}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={() => {
              handleEnd();
              setCursorPos(null);
            }}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            className={`absolute inset-0 w-full h-full rounded-xl ${
              isDrawingEnabled ? 'cursor-crosshair' : 'cursor-default'
            }`}
            style={{ width: displayDimensions.width, height: displayDimensions.height }}
          />

          {/* Dynamic Brush Size Hover Ring Preview */}
          {isDrawingEnabled && cursorPos && !isProcessing && (
            <div
              className="absolute pointer-events-none rounded-full border border-rose-400/80 bg-rose-500/20 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
              style={{
                left: cursorPos.x,
                top: cursorPos.y,
                width: brushSize,
                height: brushSize
              }}
            />
          )}
        </div>

        {/* Stroke count indicator badge */}
        {isDrawingEnabled && strokes.length > 0 && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center gap-1.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{strokes.length} masked {strokes.length === 1 ? 'region' : 'regions'}</span>
          </div>
        )}

        {/* Instruction overlay badge when no strokes are drawn */}
        {isDrawingEnabled && strokes.length === 0 && !isProcessing && (
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center gap-2 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Brush over unwanted object to remove</span>
          </div>
        )}
      </div>
    </div>
  );
};
