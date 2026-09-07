import React, { useState } from 'react';
import { Eraser, Sparkles, AlertCircle, Key, Cpu, Cloud, CheckCircle2 } from 'lucide-react';
import type { InferenceProgress } from '../types';

interface InpaintControlsProps {
  onRemoveObject: () => void;
  strokeCount: number;
  isProcessing: boolean;
  progress: InferenceProgress | null;
  lastLatencyMs: number | null;
  lastEngineUsed: 'huggingface' | 'edge-client' | 'async-queue' | null;
  hfApiKey: string;
  onHfApiKeyChange: (key: string) => void;
  errorMessage: string | null;
}

export const InpaintControls: React.FC<InpaintControlsProps> = ({
  onRemoveObject,
  strokeCount,
  isProcessing,
  progress,
  lastLatencyMs,
  lastEngineUsed,
  hfApiKey,
  onHfApiKeyChange,
  errorMessage
}) => {
  const [showKeyModal, setShowKeyModal] = useState(false);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">
      {/* Action Execution Bar */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Eraser className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <span>Neural Object Eraser</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-750">
                {strokeCount} {strokeCount === 1 ? 'stroke' : 'strokes'}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {strokeCount > 0
                ? 'Ready to inpaint. Boundary texture will synthesize automatically.'
                : 'Brush over unwanted items on the canvas above.'}
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowKeyModal(true)}
            className="tactile-btn p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs"
            title="Configure Hugging Face API Token (Optional)"
          >
            <Key className="w-4 h-4" />
          </button>

          <button
            onClick={onRemoveObject}
            disabled={strokeCount === 0 || isProcessing}
            className={`tactile-btn flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all cursor-pointer ${
              strokeCount > 0 && !isProcessing
                ? 'bg-rose-500 hover:bg-rose-400 text-zinc-950 shadow-rose-950/40'
                : 'bg-zinc-850 text-zinc-500 border border-zinc-800 cursor-not-allowed opacity-60'
            }`}
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-zinc-950" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Erase Selected Object</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Progress Card (for low-bandwidth and mobile feedback) */}
      {isProcessing && progress && (
        <div className="glass-panel p-4 rounded-2xl space-y-2.5 border-rose-500/20 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-zinc-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              {progress.step}
            </span>
            <span className="font-mono text-rose-400 font-semibold">{progress.percentage}%</span>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>{progress.subtext || 'Zero-cloud edge processing active'}</span>
            <span>Mobile-optimized</span>
          </div>
        </div>
      )}

      {/* Latency and Benchmark Feedback Badge */}
      {!isProcessing && lastLatencyMs !== null && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Inpaint successful in</span>
            <span className="text-zinc-200 font-semibold">{lastLatencyMs}ms</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            {lastEngineUsed === 'async-queue' ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300">Async Server Job Queue</span>
              </>
            ) : lastEngineUsed === 'huggingface' ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300">HF SD-Inpaint</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Web Worker Edge Engine</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Optional Hugging Face API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl space-y-4 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-zinc-100">Hugging Face API Token</h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-mono"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              By default, Lumen AI runs a zero-latency client-side neural inpainting engine right on your mobile CPU/GPU. If you want to use the cloud Stable Diffusion model, paste your free Hugging Face User Access Token below.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-400">HF Token (Optional)</label>
              <input
                type="password"
                placeholder="hf_..."
                value={hfApiKey}
                onChange={(e) => onHfApiKeyChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400 tactile-btn"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
