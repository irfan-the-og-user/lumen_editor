import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDocument,
  resetDocumentStore,
  applyDeltaPatches,
} from './documentStore';
import {
  optimizeStroke,
  getPayloadSizeBytes,
  DeltaSyncEngine,
} from './deltaSyncEngine';
import type { Stroke } from './canvasUtils';
import type { StrokeDelta, SyncResponseConflict, SyncResponseSuccess } from '../types/sync';

describe('Incremental Delta Sync & Optimistic JSONB Locks', () => {
  beforeEach(() => {
    resetDocumentStore();
  });

  describe('Requirement 1 & Success Metrics: Sub-Kilobyte Payload Optimization', () => {
    it('optimizes stroke coordinates and maintains payload size below 1 KB (1024 bytes)', () => {
      // Generate a realistic stroke with 30 points
      const points = [];
      for (let i = 0; i < 30; i++) {
        points.push({ x: 10.123456 + i * 2.5, y: 50.987654 + i * 3.1 });
      }

      const sampleStroke: Stroke = {
        points,
        size: 24,
        color: 'rgba(244, 63, 94, 0.45)',
      };

      const optimized = optimizeStroke(sampleStroke);
      expect(optimized.points[0].x).toBe(10.1);
      expect(optimized.points[0].y).toBe(51);

      const deltaPayload = {
        documentId: 'doc_test',
        expectedVersion: 0,
        deltas: [
          {
            id: 'delta_1',
            type: 'add' as const,
            strokeId: 'stroke_1',
            stroke: optimized,
            timestamp: Date.now(),
          },
        ],
      };

      const payloadSizeBytes = getPayloadSizeBytes(deltaPayload);
      expect(payloadSizeBytes).toBeLessThan(1024); // Must be under 1 KB
      console.log(`Verified auto-save stroke delta payload size: ${payloadSizeBytes} bytes (< 1 KB)`);
    });
  });

  describe('Requirement 2 & Requirement 3: Optimistic Version Locks & Atomic Updates', () => {
    it('applies stroke modifications atomically when client expectedVersion matches database version', () => {
      const docId = 'project_alpha';
      const initialDoc = getDocument(docId);
      expect(initialDoc.version).toBe(0);
      expect(initialDoc.strokes).toHaveLength(0);

      const delta: StrokeDelta = {
        id: 'delta_1',
        type: 'add',
        strokeId: 'stroke_1',
        stroke: {
          points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
          size: 16,
          color: '#ffffff',
        },
        timestamp: Date.now(),
      };

      const res = applyDeltaPatches(docId, 0, [delta], 350) as SyncResponseSuccess;
      expect(res.status).toBe('success');
      expect(res.newVersion).toBe(1);
      expect(res.lockDurationMs).toBeLessThan(10); // Row lock duration < 10 ms

      const updatedDoc = getDocument(docId);
      expect(updatedDoc.version).toBe(1);
      expect(updatedDoc.strokes).toHaveLength(1);
      expect(updatedDoc.strokes[0].points).toHaveLength(2);
    });

    it('rejects out-of-order sequence updates with 409 Conflict when expectedVersion mismatch occurs', () => {
      const docId = 'project_beta';
      
      // Session A syncs delta at v0 -> updates DB to v1
      const deltaA: StrokeDelta = {
        id: 'delta_a',
        type: 'add',
        strokeId: 'stroke_a',
        stroke: { points: [{ x: 5, y: 5 }], size: 10, color: '#ff0000' },
        timestamp: Date.now(),
      };
      const resA = applyDeltaPatches(docId, 0, [deltaA], 200);
      expect(resA.status).toBe('success');

      // Session B attempts to sync delta still expecting v0 (Conflict!)
      const deltaB: StrokeDelta = {
        id: 'delta_b',
        type: 'add',
        strokeId: 'stroke_b',
        stroke: { points: [{ x: 25, y: 25 }], size: 10, color: '#00ff00' },
        timestamp: Date.now(),
      };
      const resB = applyDeltaPatches(docId, 0, [deltaB], 200) as SyncResponseConflict;

      expect(resB.status).toBe('conflict');
      expect(resB.currentVersion).toBe(1);
      expect(resB.strokes).toHaveLength(1);
      expect(resB.error).toContain('Sequence mismatch');
    });

    it('handles atomic stroke deletion (undo) and canvas clear deltas', () => {
      const docId = 'project_gamma';
      
      // Add two strokes
      const stroke1: Stroke = { points: [{ x: 1, y: 1 }], size: 10, color: '#fff' };
      (stroke1 as any).id = 'stroke_1';
      const stroke2: Stroke = { points: [{ x: 2, y: 2 }], size: 10, color: '#fff' };
      (stroke2 as any).id = 'stroke_2';

      applyDeltaPatches(docId, 0, [
        { id: 'd1', type: 'add', strokeId: 'stroke_1', stroke: stroke1, timestamp: Date.now() },
        { id: 'd2', type: 'add', strokeId: 'stroke_2', stroke: stroke2, timestamp: Date.now() },
      ]);

      expect(getDocument(docId).strokes).toHaveLength(2);

      // Undo stroke_2
      applyDeltaPatches(docId, 1, [
        { id: 'd3', type: 'remove', strokeId: 'stroke_2', timestamp: Date.now() },
      ]);
      expect(getDocument(docId).strokes).toHaveLength(1);

      // Clear canvas
      applyDeltaPatches(docId, 2, [
        { id: 'd4', type: 'clear', timestamp: Date.now() },
      ]);
      expect(getDocument(docId).strokes).toHaveLength(0);
    });
  });

  describe('Constraint 4 & Acceptance Criteria: Client Reconciliation & Retry', () => {
    it('reconciles unsynced local deltas on top of updated server document state on conflict', async () => {
      let reconciledResult: Stroke[] | null = null;

      const engine = new DeltaSyncEngine({
        documentId: 'project_delta',
        onStrokesReconciled: (strokes) => {
          reconciledResult = strokes;
        },
      });

      // Server starts at version 1 with 1 stroke from another user/session
      const serverStroke: Stroke = { points: [{ x: 100, y: 100 }], size: 20, color: '#0000ff' };
      (serverStroke as any).id = 'server_stroke_1';
      
      resetDocumentStore('project_delta', {
        documentId: 'project_delta',
        version: 1,
        strokes: [serverStroke],
        updatedAt: Date.now(),
      });

      // Local engine recorded 1 new local stroke while at clientVersion 0
      engine.setClientVersion(0);
      const localStroke: Stroke = { points: [{ x: 50, y: 50 }], size: 12, color: '#ff0000' };
      engine.recordAddStroke(localStroke);

      // Trigger conflict reconciliation simulation
      const conflictData = {
        currentVersion: 1,
        strokes: [serverStroke],
      };

      // Call handleConflictReconciliation via private method
      await (engine as any).handleConflictReconciliation(conflictData, engine.getPendingDeltas());

      // Local engine clientVersion updated to server version 1
      expect(engine.getClientVersion()).toBe(1);

      // Reconciled strokes contain both server stroke and local stroke without data loss!
      expect(reconciledResult).not.toBeNull();
      expect(reconciledResult!).toHaveLength(2);
      expect(reconciledResult![0].points[0]).toEqual({ x: 100, y: 100 });
      expect(reconciledResult![1].points[0]).toEqual({ x: 50, y: 50 });
    });
  });
});
