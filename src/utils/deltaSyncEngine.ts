import type { Stroke, Point } from './canvasUtils';
import type { StrokeDelta, SyncResponse, SyncState, CanvasDocument } from '../types/sync';

/**
 * Optimizes points in a stroke to keep payload size well under 1 KB.
 * Rounds coordinates to 1 decimal place.
 */
export function optimizeStroke(stroke: Stroke): Stroke {
  const optimizedPoints: Point[] = stroke.points.map((p) => ({
    x: Math.round(p.x * 10) / 10,
    y: Math.round(p.y * 10) / 10,
  }));

  return {
    ...stroke,
    points: optimizedPoints,
  };
}

/**
 * Calculates byte size of any JSON payload.
 */
export function getPayloadSizeBytes(payload: any): number {
  const json = JSON.stringify(payload);
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length;
  }
  return json.length;
}

export interface DeltaSyncEngineOptions {
  documentId?: string;
  autoSaveIntervalMs?: number;
  onSyncStateChange?: (state: SyncState, metrics?: { payloadSize?: number; lockDurationMs?: number; version?: number; message?: string }) => void;
  onStrokesReconciled?: (reconciledStrokes: Stroke[]) => void;
}

export class DeltaSyncEngine {
  private documentId: string;
  private clientVersion: number = 0;
  private pendingDeltas: StrokeDelta[] = [];
  private syncState: SyncState = 'idle';
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private autoSaveIntervalMs: number;
  private isSyncing: boolean = false;
  private options: DeltaSyncEngineOptions;

  constructor(options: DeltaSyncEngineOptions = {}) {
    this.documentId = options.documentId || 'doc_default';
    this.autoSaveIntervalMs = options.autoSaveIntervalMs || 5000;
    this.options = options;
  }

  public getDocumentId(): string {
    return this.documentId;
  }

  public getClientVersion(): number {
    return this.clientVersion;
  }

  public getPendingDeltas(): StrokeDelta[] {
    return [...this.pendingDeltas];
  }

  public getSyncState(): SyncState {
    return this.syncState;
  }

  public setClientVersion(version: number): void {
    this.clientVersion = version;
  }

  /**
   * Initializes session by fetching the initial full document tree from the server.
   */
  public async loadInitialDocument(): Promise<Stroke[]> {
    try {
      this.setSyncState('saving');
      const response = await fetch(`/api/sync?documentId=${encodeURIComponent(this.documentId)}`);
      if (response.ok) {
        const doc: CanvasDocument = await response.json();
        this.clientVersion = doc.version;
        this.setSyncState('synced', { version: doc.version, message: 'Canvas loaded from cloud' });
        return doc.strokes || [];
      }
    } catch (err) {
      console.warn('Initial cloud document fetch failed, using local state:', err);
    }
    this.setSyncState('idle');
    return [];
  }

  /**
   * Enqueues a new stroke addition delta.
   */
  public recordAddStroke(stroke: Stroke): StrokeDelta {
    const optimized = optimizeStroke(stroke);
    const strokeId = (stroke as any).id || `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    (optimized as any).id = strokeId;

    const delta: StrokeDelta = {
      id: `delta_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'add',
      strokeId,
      stroke: optimized,
      timestamp: Date.now(),
    };

    this.pendingDeltas.push(delta);
    return delta;
  }

  /**
   * Enqueues a stroke removal delta (undo).
   */
  public recordRemoveStroke(strokeId?: string): StrokeDelta {
    const delta: StrokeDelta = {
      id: `delta_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'remove',
      strokeId,
      timestamp: Date.now(),
    };

    this.pendingDeltas.push(delta);
    return delta;
  }

  /**
   * Enqueues a canvas clear delta.
   */
  public recordClearStrokes(): StrokeDelta {
    const delta: StrokeDelta = {
      id: `delta_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'clear',
      timestamp: Date.now(),
    };

    this.pendingDeltas.push(delta);
    return delta;
  }

  /**
   * Starts periodic background auto-save loop.
   */
  public startAutoSave(): void {
    if (this.autoSaveTimer) return;
    this.autoSaveTimer = setInterval(() => {
      this.flushDeltas();
    }, this.autoSaveIntervalMs);
  }

  /**
   * Stops background auto-save loop.
   */
  public stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Flushes un-synced pending stroke deltas to server with optimistic version lock.
   */
  public async flushDeltas(): Promise<boolean> {
    if (this.pendingDeltas.length === 0 || this.isSyncing) {
      return true;
    }

    this.isSyncing = true;
    const deltasToSync = [...this.pendingDeltas];
    const expectedVersion = this.clientVersion;

    const requestPayload = {
      documentId: this.documentId,
      expectedVersion,
      deltas: deltasToSync,
    };

    const payloadSizeBytes = getPayloadSizeBytes(requestPayload);
    this.setSyncState('saving', { payloadSize: payloadSizeBytes, version: expectedVersion });

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const resData: SyncResponse = await response.json();

      if (response.ok && resData.status === 'success') {
        // Success! Remove synchronized deltas from queue
        this.pendingDeltas = this.pendingDeltas.filter((d) => !deltasToSync.includes(d));
        this.clientVersion = resData.newVersion;
        this.isSyncing = false;

        this.setSyncState('synced', {
          payloadSize: resData.payloadSize || payloadSizeBytes,
          lockDurationMs: resData.lockDurationMs,
          version: resData.newVersion,
          message: `Auto-saved (${(payloadSizeBytes / 1024).toFixed(2)} KB, lock ${resData.lockDurationMs}ms)`,
        });

        return true;
      } else if (response.status === 409 || resData.status === 'conflict') {
        // Optimistic Locking Conflict! Another session changed the document version.
        this.isSyncing = false;
        await this.handleConflictReconciliation(resData as any, deltasToSync);
        return false;
      } else {
        throw new Error((resData as any)?.error || 'Failed to sync deltas');
      }
    } catch (err: any) {
      console.warn('Delta sync request error:', err);
      this.isSyncing = false;
      this.setSyncState('error', { message: 'Cloud sync offline - retrying in background' });
      return false;
    }
  }

  /**
   * Handles 409 conflict reconciliation when out-of-order patches or sequence mismatches occur.
   */
  private async handleConflictReconciliation(
    conflictData: { currentVersion: number; strokes: Stroke[]; error?: string },
    _failedDeltas: StrokeDelta[]
  ): Promise<void> {
    this.setSyncState('reconciling', {
      version: conflictData.currentVersion,
      message: 'Sequence mismatch detected - reconciling canvas strokes...',
    });

    let serverStrokes: Stroke[] = conflictData.strokes || [];
    let serverVersion = conflictData.currentVersion;

    // If server strokes were not sent in conflict payload, fetch them directly
    if (!conflictData.strokes) {
      try {
        const fetchRes = await fetch(`/api/sync?documentId=${encodeURIComponent(this.documentId)}`);
        if (fetchRes.ok) {
          const doc: CanvasDocument = await fetchRes.json();
          serverStrokes = doc.strokes || [];
          serverVersion = doc.version;
        }
      } catch (err) {
        console.error('Failed to fetch full document tree during conflict recovery:', err);
      }
    }

    // Rebase local strokes: combine server strokes with unsynced local pending deltas
    const reconciledStrokes = [...serverStrokes];
    for (const delta of this.pendingDeltas) {
      if (delta.type === 'add' && delta.stroke) {
        reconciledStrokes.push(delta.stroke);
      } else if (delta.type === 'remove') {
        if (delta.strokeId) {
          const idx = reconciledStrokes.findIndex((s) => (s as any).id === delta.strokeId);
          if (idx !== -1) reconciledStrokes.splice(idx, 1);
          else reconciledStrokes.pop();
        } else {
          reconciledStrokes.pop();
        }
      } else if (delta.type === 'clear') {
        reconciledStrokes.length = 0;
      }
    }

    // Update client version to current server version
    this.clientVersion = serverVersion;

    // Notify UI to update stroke state cleanly
    if (this.options.onStrokesReconciled) {
      this.options.onStrokesReconciled(reconciledStrokes);
    }

    // Immediate retry flush with updated version
    setTimeout(() => {
      this.flushDeltas();
    }, 100);
  }

  private setSyncState(
    state: SyncState,
    metrics?: { payloadSize?: number; lockDurationMs?: number; version?: number; message?: string }
  ) {
    this.syncState = state;
    if (this.options.onSyncStateChange) {
      this.options.onSyncStateChange(state, metrics);
    }
  }
}
