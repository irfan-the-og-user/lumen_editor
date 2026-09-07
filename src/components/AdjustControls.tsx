import React from 'react';
import { Sliders, Sun, Contrast as ContrastIcon, Palette, RotateCcw, Check, Zap } from 'lucide-react';
import type { ImageAdjustments } from '../types';

interface AdjustControlsProps {
  adjustments: ImageAdjustments;
  onAdjustmentsChange: (adjustments: ImageAdjustments) => void;
  onResetAdjustments: () => void;
  onCommitAdjustments: () => void;
  isProcessing: boolean;
}

export const AdjustControls: React.FC<AdjustControlsProps> = ({
  adjustments,
  onAdjustmentsChange,
  onResetAdjustments,
  onCommitAdjustments,
  isProcessing
}) => {
  const handleChange = (key: keyof ImageAdjustments, value: number) => {
    onAdjustmentsChange({
      ...adjustments,
      [key]: value
    });
  };

  const isModified =
    adjustments.brightness !== 100 ||
    adjustments.contrast !== 100 ||
    adjustments.saturation !== 100 ||
    adjustments.filterIntensity !== 100;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Header telemetry badge */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-medium">
            Viewport Interactive Sliders
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>Local Canvas 2D • 0 Network Calls</span>
        </div>
      </div>

      {/* Sliders Grid Panel */}
      <div className="glass-panel p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Brightness Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-mono text-zinc-300 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Brightness</span>
            </label>
            <span className="font-mono text-zinc-400">{adjustments.brightness}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="180"
            value={adjustments.brightness}
            onChange={(e) => handleChange('brightness', Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
            disabled={isProcessing}
          />
        </div>

        {/* Contrast Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-mono text-zinc-300 flex items-center gap-1.5">
              <ContrastIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Contrast</span>
            </label>
            <span className="font-mono text-zinc-400">{adjustments.contrast}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="180"
            value={adjustments.contrast}
            onChange={(e) => handleChange('contrast', Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
            disabled={isProcessing}
          />
        </div>

        {/* Saturation Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-mono text-zinc-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-rose-400" />
              <span>Saturation</span>
            </label>
            <span className="font-mono text-zinc-400">{adjustments.saturation}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={adjustments.saturation}
            onChange={(e) => handleChange('saturation', Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
            disabled={isProcessing}
          />
        </div>

        {/* Filter Intensity Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-mono text-zinc-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>Filter Intensity</span>
            </label>
            <span className="font-mono text-zinc-400">{adjustments.filterIntensity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={adjustments.filterIntensity}
            onChange={(e) => handleChange('filterIntensity', Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-2 bg-zinc-800 rounded-lg"
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="glass-panel p-3 rounded-2xl flex items-center justify-between gap-3">
        <button
          onClick={onResetAdjustments}
          disabled={!isModified || isProcessing}
          className="tactile-btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sliders</span>
        </button>

        <button
          onClick={onCommitAdjustments}
          disabled={!isModified || isProcessing}
          className="tactile-btn flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-lg shadow-emerald-950/30 disabled:opacity-40 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save Adjustment State</span>
        </button>
      </div>
    </div>
  );
};
