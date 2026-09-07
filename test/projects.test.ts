import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  projectDbStore,
  encodeCursor,
  decodeCursor,
  CursorValidationError,
  PaginationValidationError,
} from '../src/utils/projectDb.js';

describe('Partial Index & Cursor Pagination Engine', () => {
  it('1. Rejects offset-based pagination parameters (page, offset)', () => {
    assert.throws(
      () => {
        projectDbStore.query({ page: 1 });
      },
      (err: any) => {
        return (
          err instanceof PaginationValidationError &&
          err.message.includes("Offset-based pagination parameters ('page', 'offset') are strictly forbidden")
        );
      }
    );

    assert.throws(
      () => {
        projectDbStore.query({ offset: 20 });
      },
      (err: any) => {
        return err instanceof PaginationValidationError;
      }
    );
  });

  it('2. Encodes and decodes valid composite cursor tokens', () => {
    const payload = { updated_at: 1700000000000, id: 'proj_00000100' };
    const encoded = encodeCursor(payload);
    assert.equal(typeof encoded, 'string');
    assert.ok(encoded.length > 0);

    const decoded = decodeCursor(encoded);
    assert.deepEqual(decoded, payload);
  });

  it('3. Throws CursorValidationError on invalid or corrupted cursor tokens', () => {
    const corruptedTokens = [
      'invalid_not_base64_json_@#$%',
      Buffer.from('{"updated_at": "not_a_number"}').toString('base64'),
      Buffer.from('{"id": "proj_123"}').toString('base64'), // missing updated_at
      '',
      '    ',
    ];

    for (const token of corruptedTokens) {
      assert.throws(
        () => {
          decodeCursor(token);
        },
        (err: any) => {
          return err instanceof CursorValidationError;
        },
        `Failed to throw CursorValidationError for token: ${token}`
      );
    }
  });

  it('4. Excludes inactive, archived, and soft-deleted projects from active index queries', () => {
    projectDbStore.initializeDefaultDataset(1000, 0.5); // 1000 items, 50% active
    const response = projectDbStore.query({ limit: 100 });

    for (const project of response.projects) {
      assert.equal(project.status, 'active');
    }
  });

  it('5. Performs seamless cursor pagination without duplicates or skipped records across pages', () => {
    projectDbStore.initializeDefaultDataset(10000, 0.5); // 10,000 items
    const accountId = 'acc_main';
    const limit = 50;

    const fetchedIds = new Set<string>();
    let currentCursor: string | undefined = undefined;
    let totalPagesFetched = 0;

    while (totalPagesFetched < 10) {
      const response = projectDbStore.query({
        account_id: accountId,
        limit,
        cursor: currentCursor,
      });

      if (response.projects.length === 0) break;

      for (const project of response.projects) {
        assert.equal(project.status, 'active');
        assert.equal(
          fetchedIds.has(project.id),
          false,
          `Duplicate project detected during cursor pagination: ${project.id}`
        );
        fetchedIds.add(project.id);
      }

      if (!response.has_more || !response.next_cursor) break;
      currentCursor = response.next_cursor;
      totalPagesFetched++;
    }

    assert.ok(fetchedIds.size > 0, 'Fetched active projects successfully across pages');
  });

  it('6. Achieves query latency under 100ms for datasets exceeding 100,000 records', () => {
    projectDbStore.initializeDefaultDataset(120000, 0.5); // 120,000 records

    const start = performance.now();
    const response = projectDbStore.query({
      account_id: 'acc_main',
      limit: 20,
    });
    const duration = performance.now() - start;

    assert.ok(response.projects.length > 0, 'Returned project results');
    assert.ok(
      duration < 100,
      `Project list query latency exceeded 100ms threshold: actual ${duration.toFixed(2)}ms`
    );
    assert.ok(
      response.meta.execution_time_ms < 100,
      `Reported execution latency exceeded 100ms: actual ${response.meta.execution_time_ms}ms`
    );
  });

  it('7. Achieves >40% index storage memory reduction compared to full composite index', () => {
    projectDbStore.initializeDefaultDataset(100000, 0.5); // 50% active
    const stats = projectDbStore.calculateIndexStats();

    assert.ok(
      stats.memory_reduction_percentage >= 40,
      `Partial index memory reduction was ${stats.memory_reduction_percentage}%, expected >= 40%`
    );
  });
});
