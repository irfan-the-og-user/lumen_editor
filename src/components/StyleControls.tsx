import React from 'react';
import { Wand2, Sparkles, Check, CheckCircle2, Cpu, Cloud, Layers } from 'lucide-react';
import { STYLE_PRESETS } from '../utils/styleEngine';
import { getProgressClass } from '../utils/dynamicStyleManager';
import type { StylePreset, InferenceProgress } from '../types';

interface StyleControlsProps {
  selectedStyleId: string;
  onSelectStyleId: (id: string) => void;
  onApplyStyle: () => void;
  isProcessing: boolean;
  progress: InferenceProgress | null;
  lastLatencyMs: number | null;
  lastEngineUsed: 'huggingface' | 'edge-client' | null;
  hasStyledImage: boolean;
  showComparison: boolean;
  onToggleComparison: (show: boolean) => void;
}

export const StyleControls: React.FC<StyleControlsProps> = ({
  selectedStyleId,
  onSelectStyleId,
  onApplyStyle,
  isProcessing,
  progress,
  lastLatencyMs,
  lastEngineUsed,
  hasStyledImage,
  showComparison,
  onToggleComparison
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Comparison View Toggle (When style has been applied) */}
      {hasStyledImage && (
        <div className="flex items-center justify-between p-3 rounded-2xl glass-pill">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono uppercase text-zinc-300 font-medium">Comparison Mode:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => onToggleComparison(false)}
              className={`tactile-btn px-3 py-1 rounded-lg text-xs font-medium ${
                !showComparison
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Canvas View
            </button>
            <button
              onClick={() => onToggleComparison(true)}
              className={`tactile-btn px-3 py-1 rounded-lg text-xs font-medium ${
                showComparison
                  ? 'bg-emerald-500 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Split Comparison
            </button>
          </div>
        </div>
      )}

      {/* Preset Grid Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-medium">
              Select Neural Style Archetype (6 Presets)
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">Zero GPU cost</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {STYLE_PRESETS.map((preset: StylePreset) => {
            const isSelected = selectedStyleId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => onSelectStyleId(preset.id)}
                className={`tactile-btn cursor-pointer rounded-2xl p-3 border transition-all text-left flex flex-col justify-between gap-2.5 relative overflow-hidden ${
                  isSelected
                    ? 'border-emerald-500 bg-zinc-900/90 shadow-lg shadow-emerald-950/20'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40'
                }`}
              >
                {/* Visual Style swatch badge */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-lg border border-white/20 shadow-inner flex items-center justify-center preset-bg-${preset.id}`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{preset.category}</span>
                </div>

                <div>
                  <div className="text-xs font-medium text-zinc-100 truncate">{preset.name}</div>
                  <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 leading-snug">
                    {preset.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Apply Style Execution Button */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-zinc-400">
          Selected: <span className="text-zinc-200 font-medium">{STYLE_PRESETS.find(p => p.id === selectedStyleId)?.name}</span>
        </div>

        <button
          onClick={onApplyStyle}
          disabled={isProcessing}
          className="tactile-btn w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-lg shadow-emerald-950/40 disabled:opacity-40 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-zinc-950" />
              <span>Synthesizing Style...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Apply Neural Style Transfer</span>
            </>
          )}
        </button>
      </div>

      {/* Real-time Progressive Status */}
      {isProcessing && progress && (
        <div className="glass-panel p-4 rounded-2xl space-y-2.5 border-emerald-500/20">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {progress.step}
            </span>
            <span className="font-mono text-emerald-400 font-semibold">{progress.percentage}%</span>
          </div>

          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className={`h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300 ease-out ${getProgressClass(progress.percentage)}`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>{progress.subtext || 'Edge tensor shader active'}</span>
            <span>Mobile-optimized</span>
          </div>
        </div>
      )}

      {/* Latency & Telemetry Badge */}
      {!isProcessing && lastLatencyMs !== null && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Style synthesized in</span>
            <span className="text-zinc-200 font-semibold">{lastLatencyMs}ms</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            {lastEngineUsed === 'huggingface' ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300">HF Instruct-Pix2Pix</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Edge Neural Shader</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
