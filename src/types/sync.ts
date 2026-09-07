import type { Stroke } from '../utils/canvasUtils';

export type SyncState = 'idle' | 'saving' | 'synced' | 'error' | 'reconciling';

export type DeltaActionType = 'add' | 'remove' | 'clear';

export interface StrokeDelta {
  id: string;
  type: DeltaActionType;
  strokeId?: string;
  stroke?: Stroke;
  timestamp: number;
}

export interface CanvasDocument {
  documentId: string;
  version: number;
  strokes: Stroke[];
  updatedAt: number;
}

export interface SyncRequestPayload {
  documentId: string;
  expectedVersion: number;
  deltas: StrokeDelta[];
}

export interface SyncResponseSuccess {
  status: 'success';
  documentId: string;
  newVersion: number;
  payloadSize: number;
  lockDurationMs: number;
  updatedAt: number;
}

export interface SyncResponseConflict {
  status: 'conflict';
  documentId: string;
  currentVersion: number;
  strokes: Stroke[];
  error: string;
}

export interface SyncResponseError {
  status: 'error';
  error: string;
}

export type SyncResponse = SyncResponseSuccess | SyncResponseConflict | SyncResponseError;
