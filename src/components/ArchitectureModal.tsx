import React from 'react';
import { ShieldCheck, Cloud, Sparkles, X, Smartphone } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel max-w-2xl w-full p-6 sm:p-8 rounded-3xl space-y-6 border border-zinc-700 shadow-2xl animate-fade-in my-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-xs font-mono text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inter IIT Tech Meet 14.0 — PS-07</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight">
              Lumen AI Architecture & System Design
            </h2>
          </div>
          <button
            onClick={onClose}
            className="tactile-btn p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Problem vs Solution Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-rose-500/20 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-medium">
              <span>Standard Creative Suite</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Assumes 8GB+ VRAM desktop GPU or high-end flagship iPhone. 1.2GB app download, continuous cloud syncing, fails on slow 3G/4G networks.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Lumen Mobile-First Engine</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Runs anywhere on a 375px budget phone. Zero installation overhead (&lt;250KB bundle), multi-pass boundary diffusion + serverless edge routing.
            </p>
          </div>
        </div>

        {/* Pipeline Diagram */}
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3 font-mono text-xs">
          <div className="text-zinc-400 text-[11px] uppercase tracking-wider">Dual-Tier Inference Pipeline</div>
          
          <div className="space-y-2 text-zinc-300">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-zinc-100 font-medium">Tier 1: Client Edge Shaders (&lt;100ms)</span>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                  Poisson pixel diffusion, Kuwahara brush filters, and Sobel edge matrices directly on HTML5 Canvas ImageData.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-zinc-100 font-medium">Tier 2: Serverless HF Generative Models (~1.4s)</span>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                  Vercel Edge Functions proxying requests to Stable Diffusion Inpainting & Instruct-Pix2Pix with zero client API key leaks.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specs Bento */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Bundle Size</div>
            <div className="text-base font-mono font-semibold text-emerald-400 mt-0.5">&lt; 76 KB gzip</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Min Viewport</div>
            <div className="text-base font-mono font-semibold text-zinc-200 mt-0.5">375px</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-500 uppercase">Infra Cost</div>
            <div className="text-base font-mono font-semibold text-emerald-400 mt-0.5">$0.00 (Free Tier)</div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="tactile-btn px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold"
          >
            Back to Editor
          </button>
        </div>
      </div>
    </div>
  );
};
