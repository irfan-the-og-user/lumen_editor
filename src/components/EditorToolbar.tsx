import React from 'react';
import { Eraser, Wand2, Download, ArrowLeft, RotateCcw, RotateCw, Sliders } from 'lucide-react';
import type { EditorMode } from '../types';

interface EditorToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onReset: () => void;
  onUndoLastAction: () => void;
  onRedoAction?: () => void;
  onExport: () => void;
  hasHistory: boolean;
  hasRedo?: boolean;
  isProcessing: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  mode,
  onModeChange,
  onReset,
  onUndoLastAction,
  onRedoAction,
  onExport,
  hasHistory,
  hasRedo,
  isProcessing
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 p-2 sm:p-2.5 rounded-2xl glass-panel">
      {/* Back and History Reset / Undo / Redo */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
        <button
          onClick={onReset}
          disabled={isProcessing}
          className="tactile-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 disabled:opacity-40"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>

        <button
          onClick={onUndoLastAction}
          disabled={!hasHistory || isProcessing}
          className="tactile-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 disabled:opacity-40"
          title="Revert last AI edit"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Undo</span>
        </button>

        {onRedoAction && (
          <button
            onClick={onRedoAction}
            disabled={!hasRedo || isProcessing}
            className="tactile-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 disabled:opacity-40"
            title="Redo edit"
          >
            <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Redo</span>
          </button>
        )}
      </div>

      {/* Feature Selector Tabs */}
      <div className="flex items-center bg-zinc-950/80 p-1 rounded-xl border border-zinc-800/90 w-full sm:w-auto justify-center gap-1">
        <button
          onClick={() => onModeChange('inpaint')}
          disabled={isProcessing}
          className={`tactile-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === 'inpaint'
              ? 'bg-zinc-850 text-emerald-400 shadow-md border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Eraser className="w-3.5 h-3.5 text-rose-400" />
          <span>Object Removal</span>
        </button>

        <button
          onClick={() => onModeChange('style')}
          disabled={isProcessing}
          className={`tactile-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === 'style'
              ? 'bg-zinc-850 text-emerald-400 shadow-md border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Style Transfer</span>
        </button>

        <button
          onClick={() => onModeChange('adjust')}
          disabled={isProcessing}
          className={`tactile-btn flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === 'adjust'
              ? 'bg-zinc-850 text-emerald-400 shadow-md border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Adjustments</span>
        </button>
      </div>

      {/* Export Action */}
      <div className="w-full sm:w-auto flex justify-end">
        <button
          onClick={onExport}
          disabled={isProcessing}
          className="tactile-btn w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold shadow-lg shadow-emerald-950/40 disabled:opacity-40 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export HD</span>
        </button>
      </div>
    </div>
  );
};
