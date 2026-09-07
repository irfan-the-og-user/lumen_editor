import React from 'react';
import { Cloud, CloudCheck, RefreshCw, AlertCircle, Zap } from 'lucide-react';
import type { SyncState } from '../types/sync';

interface AutoSaveIndicatorProps {
  syncState: SyncState;
  clientVersion: number;
  lastPayloadSize?: number;
  lastLockDurationMs?: number;
  pendingCount: number;
  onManualSync?: () => void;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  syncState,
  clientVersion,
  lastPayloadSize,
  lastLockDurationMs,
  pendingCount,
  onManualSync,
}) => {
  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null || bytes === 0) return '< 1 KB';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-300 backdrop-blur-md shadow-sm transition-all duration-200">
      {/* State Icon */}
      {syncState === 'saving' && (
        <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
      )}
      {syncState === 'synced' && (
        <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
      )}
      {syncState === 'reconciling' && (
        <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
      )}
      {syncState === 'error' && (
        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
      )}
      {syncState === 'idle' && (
        <Cloud className="w-3.5 h-3.5 text-zinc-400" />
      )}

      {/* State Text & Details */}
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-zinc-200">
          {syncState === 'saving' && 'Syncing Delta'}
          {syncState === 'synced' && 'Cloud Synced'}
          {syncState === 'reconciling' && 'Reconciling'}
          {syncState === 'error' && 'Sync Offline'}
          {syncState === 'idle' && 'Delta Auto-Save'}
        </span>

        {/* Version Badge */}
        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700/50">
          v{clientVersion}
        </span>

        {/* Payload Size & Lock Duration Metrics */}
        {lastPayloadSize !== undefined && lastPayloadSize > 0 && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-400 border-l border-zinc-800 pl-1.5">
            <Zap className="w-3 h-3 text-emerald-400 inline" />
            <span>{formatBytes(lastPayloadSize)}</span>
            {lastLockDurationMs !== undefined && (
              <span className="text-zinc-400">({lastLockDurationMs}ms lock)</span>
            )}
          </span>
        )}

        {/* Pending Deltas Indicator */}
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30 animate-pulse">
            {pendingCount} un-saved
          </span>
        )}
      </div>

      {/* Manual Sync Trigger */}
      {onManualSync && pendingCount > 0 && syncState !== 'saving' && (
        <button
          onClick={onManualSync}
          className="ml-1 text-[10px] underline text-emerald-400 hover:text-emerald-300 cursor-pointer"
          title="Sync now"
        >
          Sync
        </button>
      )}
    </div>
  );
};
