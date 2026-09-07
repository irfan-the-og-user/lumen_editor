import { useState, useEffect, useRef, useCallback } from 'react';
import { DeltaSyncEngine } from '../utils/deltaSyncEngine';
import type { Stroke } from '../utils/canvasUtils';
import type { SyncState } from '../types/sync';

export interface UseDeltaSyncOptions {
  documentId?: string;
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  addToast?: (type: 'success' | 'error' | 'info', text: string) => void;
  autoSaveIntervalMs?: number;
}

export function useDeltaSync({
  documentId = 'doc_default',
  strokes,
  onStrokesChange,
  addToast,
  autoSaveIntervalMs = 5000,
}: UseDeltaSyncOptions) {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [clientVersion, setClientVersion] = useState<number>(0);
  const [lastPayloadSize, setLastPayloadSize] = useState<number | undefined>(undefined);
  const [lastLockDurationMs, setLastLockDurationMs] = useState<number | undefined>(undefined);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const engineRef = useRef<DeltaSyncEngine | null>(null);

  // Initialize sync engine instance
  useEffect(() => {
    const engine = new DeltaSyncEngine({
      documentId,
      autoSaveIntervalMs,
      onSyncStateChange: (state, metrics) => {
        setSyncState(state);
        if (metrics?.version !== undefined) {
          setClientVersion(metrics.version);
        }
        if (metrics?.payloadSize !== undefined) {
          setLastPayloadSize(metrics.payloadSize);
        }
        if (metrics?.lockDurationMs !== undefined) {
          setLastLockDurationMs(metrics.lockDurationMs);
        }
        if (metrics?.message && addToast) {
          if (state === 'reconciling') {
            addToast('info', metrics.message);
          } else if (state === 'error') {
            addToast('error', metrics.message);
          }
        }
      },
      onStrokesReconciled: (reconciledStrokes) => {
        onStrokesChange(reconciledStrokes);
        if (addToast) {
          addToast('success', 'Sequence updated - canvas reconciled without data loss');
        }
      },
    });

    engineRef.current = engine;
    engine.startAutoSave();

    // Initial load of canvas document tree
    engine.loadInitialDocument().then((loadedStrokes) => {
      if (loadedStrokes && loadedStrokes.length > 0 && strokes.length === 0) {
        onStrokesChange(loadedStrokes);
      }
    });

    return () => {
      engine.stopAutoSave();
    };
  }, [documentId]);

  // Update pending deltas count
  const updatePendingCount = useCallback(() => {
    if (engineRef.current) {
      setPendingCount(engineRef.current.getPendingDeltas().length);
    }
  }, []);

  const recordAddStroke = useCallback(
    (stroke: Stroke) => {
      if (engineRef.current) {
        engineRef.current.recordAddStroke(stroke);
        updatePendingCount();
      }
    },
    [updatePendingCount]
  );

  const recordRemoveStroke = useCallback(
    (strokeId?: string) => {
      if (engineRef.current) {
        engineRef.current.recordRemoveStroke(strokeId);
        updatePendingCount();
      }
    },
    [updatePendingCount]
  );

  const recordClearStrokes = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.recordClearStrokes();
      updatePendingCount();
    }
  }, [updatePendingCount]);

  const forceSync = useCallback(async () => {
    if (engineRef.current) {
      const success = await engineRef.current.flushDeltas();
      updatePendingCount();
      return success;
    }
    return false;
  }, [updatePendingCount]);

  return {
    syncState,
    clientVersion,
    lastPayloadSize,
    lastLockDurationMs,
    pendingCount,
    recordAddStroke,
    recordRemoveStroke,
    recordClearStrokes,
    forceSync,
  };
}
