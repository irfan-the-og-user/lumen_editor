import React from 'react';
import { Sparkles, Cpu, Layers, BookOpen, Wifi, WifiOff, Download } from 'lucide-react';

interface NavbarProps {
  onReset?: () => void;
  hasActiveImage?: boolean;
  onOpenArchitecture: () => void;
  isOnline: boolean;
  canInstall?: boolean;
  onInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onReset,
  hasActiveImage,
  onOpenArchitecture,
  isOnline,
  canInstall,
  onInstall
}) => {
  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div 
          onClick={onReset}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-emerald-400 shadow-sm group-hover:border-emerald-500/40 transition-colors">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-zinc-100 text-base">LUMEN</span>
              <span className="font-mono text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700/60 font-medium">
                v1.0-EDGE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">Lightweight Mobile AI Canvas</p>
          </div>
        </div>

        {/* Telemetry, Network Status & Architecture Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real-time Network Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium transition-all ${
              isOnline
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-950/50 border border-amber-500/40 text-amber-400 animate-pulse'
            }`}

          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline Mode</span>
              </>
            )}
          </div>

          {canInstall && onInstall && (
            <button
              onClick={onInstall}
              className="tactile-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-[11px] font-mono text-emerald-300 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>&lt;250KB Client</span>
          </div>

          <button
            onClick={onOpenArchitecture}
            className="tactile-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-mono text-zinc-300 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Architecture</span>
          </button>

          {hasActiveImage && onReset && (
            <button
              onClick={onReset}
              className="tactile-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs text-zinc-200 font-medium cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>New Image</span>
            </button>
          )}

          <div className="hidden sm:block px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 font-medium">
            Inter IIT 14.0
          </div>
        </div>
      </div>
    </header>
  );
};

