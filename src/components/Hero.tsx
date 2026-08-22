import React from 'react';
import { Eraser, Wand2, Zap, ShieldCheck } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-6 pb-8 sm:pt-10 sm:pb-12 border-b border-zinc-800/60 overflow-hidden">
      {/* Background ambient lighting - restrained neutral tone */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Asymmetric Editorial Header */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PS-07: Adobe Photoshop Mobile Challenge</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-zinc-100 leading-[1.12]">
              Professional AI Editing, <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500">
                Zero Heavy Hardware Required.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-[58ch]">
              High-end generative image processing scaled down to lightweight edge compute. Brush over unwanted elements or synthesize neural art styles with zero app downloads or bulky dependencies.
            </p>

            {/* Feature pill highlights */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300">
                <Eraser className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-medium">1. Neural Object Eraser</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300">
                <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">2. Style Transfer & Split View</span>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Metrics & Edge Efficiency */}
          <div className="lg:col-span-5">
            <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-3.5 border border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <span className="font-mono text-xs text-zinc-400 uppercase tracking-wider">Device Benchmark</span>
                <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Edge-Ready
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-zinc-400 font-medium">Memory Footprint</span>
                    <Zap className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="text-xl font-mono font-semibold text-zinc-100">&lt; 18 MB</div>
                  <span className="text-[10px] font-mono text-zinc-400">vs 1.2GB native apps</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-zinc-400 font-medium">Inference Latency</span>
                    <Zap className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="text-xl font-mono font-semibold text-zinc-100">~1.4s</div>
                  <span className="text-[10px] font-mono text-zinc-400">Hugging Face Edge/ONNX</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-850 flex items-center justify-between font-mono text-[11px] text-zinc-400">
                <span>Viewport Target</span>
                <span className="text-zinc-300">375px+ Mobile, Tablet, Desktop</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
