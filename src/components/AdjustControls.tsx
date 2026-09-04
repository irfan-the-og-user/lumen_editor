import React, { useState } from 'react';
import { Sliders, RotateCcw, Check, Zap, Cpu, Sun, Contrast, Droplet, Thermometer, ShieldCheck } from 'lucide-react';
import type { AdjustmentSettings } from '../types';
import { DEFAULT_ADJUSTMENTS } from '../types';

interface AdjustControlsProps {
  adjustments: AdjustmentSettings;
  onAdjustmentsChange: (adjustments: AdjustmentSettings) => void;
  onCommitAdjustments: () => void;
  onResetAdjustments: () => void;
  isProcessing: boolean;
  renderLatencyMs: number | null;
}

export const AdjustControls: React.FC<AdjustControlsProps> = ({
  adjustments,
  onAdjustmentsChange,
  onCommitAdjustments,
  onResetAdjustments,
  isProcessing,
  renderLatencyMs
}) => {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handleSliderChange = (key: keyof AdjustmentSettings, value: number) => {
    setActivePreset(null);
    onAdjustmentsChange({
      ...adjustments,
      [key]: value
    });
  };

  const hasChanges = Object.keys(DEFAULT_ADJUSTMENTS).some(
    (k) => adjustments[k as keyof AdjustmentSettings] !== DEFAULT_ADJUSTMENTS[k as keyof AdjustmentSettings]
  );

  const applyQuickPreset = (presetName: string, settings: Partial<AdjustmentSettings>) => {
    setActivePreset(presetName);
    onAdjustmentsChange({
      ...DEFAULT_ADJUSTMENTS,
      ...settings
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Top Banner: Local Viewport Telemetry */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>Viewport Canvas Engine:</span>
          <span className="text-emerald-300 font-semibold">
            {renderLatencyMs !== null ? `${renderLatencyMs}ms` : '< 10ms'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-cyan-300">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Zero Network Calls</span>
        </div>
      </div>

      {/* Quick Adjustment Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 text-xs font-mono text-zinc-400 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Quick Filter Profiles</span>
          </div>
          <span className="text-[10px] text-zinc-500">Sub-100ms Preview</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'vivid', name: 'Vivid Pop', settings: { brightness: 10, contrast: 20, saturation: 30 } },
            { id: 'warm', name: 'Golden Warmth', settings: { warmth: 35, brightness: 5, saturation: 15 } },
            { id: 'dramatic', name: 'High Contrast', settings: { contrast: 45, saturation: -10, exposure: -5 } },
            { id: 'vintage', name: 'Warm Sepia', settings: { sepia: 40, warmth: 20, contrast: 10 } }
          ].map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyQuickPreset(preset.id, preset.settings)}
                className={`tactile-btn py-2 px-3 rounded-xl border text-xs font-medium transition-all text-left flex items-center justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-zinc-900 text-emerald-300 shadow-md'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <span>{preset.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-time Adjustment Sliders */}
      <div className="glass-panel p-4 rounded-2xl space-y-4 border-zinc-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Brightness */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Brightness
              </span>
              <span className="font-mono text-zinc-400 text-[11px]">{adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.brightness}
              onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Contrast className="w-3.5 h-3.5 text-cyan-400" /> Contrast
              </span>
              <span className="font-mono text-zinc-400 text-[11px]">{adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.contrast}
              onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-rose-400" /> Saturation
              </span>
              <span className="font-mono text-zinc-400 text-[11px]">{adjustments.saturation > 0 ? `+${adjustments.saturation}` : adjustments.saturation}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.saturation}
              onChange={(e) => handleSliderChange('saturation', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Warmth (Temperature) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" /> Warmth / Tint
              </span>
              <span className="font-mono text-zinc-400 text-[11px]">{adjustments.warmth > 0 ? `+${adjustments.warmth}` : adjustments.warmth}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.warmth}
              onChange={(e) => handleSliderChange('warmth', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Exposure */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-yellow-300" /> Exposure
              </span>
              <span className="font-mono text-zinc-400 text-[11px]">{adjustments.exposure > 0 ? `+${adjustments.exposure}` : adjustments.exposure}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.exposure}
              onChange={(e) => handleSliderChange('exposure', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Sepia */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Sepia Tone
              </span>
              <span className="font-mono text-zinc-400 text-[11px]">{adjustments.sepia}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={adjustments.sepia}
              onChange={(e) => handleSliderChange('sepia', Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
          <button
            onClick={onResetAdjustments}
            disabled={!hasChanges || isProcessing}
            className="tactile-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sliders</span>
          </button>

          <button
            onClick={onCommitAdjustments}
            disabled={!hasChanges || isProcessing}
            className="tactile-btn flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-lg shadow-emerald-950/40 disabled:opacity-40 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Commit Preview State</span>
          </button>
        </div>
      </div>
    </div>
  );
};
