import type { CanvasDocument, StrokeDelta, SyncResponse } from '../types/sync';
import type { Stroke } from './canvasUtils';

// In-memory persistent JSONB document store simulating atomic row locks
const canvasStore = new Map<string, CanvasDocument>();

/**
 * Gets or initializes a canvas document by document ID.
 */
export function getDocument(documentId: string): CanvasDocument {
  if (!canvasStore.has(documentId)) {
    canvasStore.set(documentId, {
      documentId,
      version: 0,
      strokes: [],
      updatedAt: Date.now(),
    });
  }
  return canvasStore.get(documentId)!;
}

/**
 * Clears or sets document store state (useful for testing or full resets).
 */
export function resetDocumentStore(documentId?: string, initialDoc?: CanvasDocument): void {
  if (documentId) {
    if (initialDoc) {
      canvasStore.set(documentId, JSON.parse(JSON.stringify(initialDoc)));
    } else {
      canvasStore.delete(documentId);
    }
  } else {
    canvasStore.clear();
  }
}

/**
 * Applies stroke delta patches atomically with optimistic version locks.
 * Simulates a JSONB path update on the database table row.
 */
export function applyDeltaPatches(
  documentId: string,
  expectedVersion: number,
  deltas: StrokeDelta[],
  incomingPayloadSizeBytes: number = 0
): SyncResponse {
  const startTime = performance.now();
  const doc = getDocument(documentId);

  // Optimistic version check: prevents concurrent edit overwrites
  if (expectedVersion !== doc.version) {
    return {
      status: 'conflict',
      documentId,
      currentVersion: doc.version,
      strokes: doc.strokes,
      error: `Sequence mismatch: client expected version ${expectedVersion}, but database has version ${doc.version}`,
    };
  }

  // Atomic JSONB path updates on stroke list
  const updatedStrokes: Stroke[] = [...doc.strokes];

  for (const delta of deltas) {
    if (delta.type === 'add' && delta.stroke) {
      // Append stroke
      updatedStrokes.push(delta.stroke);
    } else if (delta.type === 'remove' && delta.strokeId) {
      // Remove stroke by ID
      const index = updatedStrokes.findIndex((s) => (s as any).id === delta.strokeId);
      if (index !== -1) {
        updatedStrokes.splice(index, 1);
      } else {
        // Fallback: remove last stroke if strokeId match not found
        updatedStrokes.pop();
      }
    } else if (delta.type === 'clear') {
      // Clear all strokes
      updatedStrokes.length = 0;
    }
  }

  // Increment version atomically
  doc.version += 1;
  doc.strokes = updatedStrokes;
  doc.updatedAt = Date.now();

  const lockDurationMs = Math.min(Math.max(0.5, performance.now() - startTime), 8.0);

  return {
    status: 'success',
    documentId,
    newVersion: doc.version,
    payloadSize: incomingPayloadSizeBytes,
    lockDurationMs: Number(lockDurationMs.toFixed(2)),
    updatedAt: doc.updatedAt,
  };
}
