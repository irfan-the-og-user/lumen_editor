import type {
  Project,
  ProjectStatus,
  CursorPayload,
  ProjectQueryOptions,
  ProjectListResponse,
  IndexStats,
} from '../types';

export class CursorValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CursorValidationError';
  }
}

export class PaginationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaginationValidationError';
  }
}

/**
 * Base64 helper supporting both Node.js and Browser environments.
 */
function toBase64(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str);
  }
  const NodeBuffer = (globalThis as any).Buffer;
  if (NodeBuffer) {
    return NodeBuffer.from(str, 'utf-8').toString('base64');
  }
  return str;
}

function fromBase64(str: string): string {
  if (typeof atob === 'function') {
    return atob(str);
  }
  const NodeBuffer = (globalThis as any).Buffer;
  if (NodeBuffer) {
    return NodeBuffer.from(str, 'base64').toString('utf-8');
  }
  return str;
}

/**
 * Encodes a composite cursor payload into an opaque base64 string.
 */
export function encodeCursor(payload: CursorPayload): string {
  if (!payload || typeof payload.updated_at !== 'number' || typeof payload.id !== 'string') {
    throw new CursorValidationError('Invalid cursor payload structure');
  }
  const json = JSON.stringify({ updated_at: payload.updated_at, id: payload.id });
  return toBase64(json);
}

/**
 * Decodes an opaque base64 cursor string into a composite cursor payload.
 * Throws CursorValidationError if the token is malformed, invalid, or corrupted.
 */
export function decodeCursor(cursorToken: string): CursorPayload {
  if (typeof cursorToken !== 'string' || !cursorToken.trim()) {
    throw new CursorValidationError('Cursor token must be a non-empty string');
  }

  try {
    const jsonStr = fromBase64(cursorToken.trim());
    const parsed = JSON.parse(jsonStr);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.updated_at !== 'number' ||
      typeof parsed.id !== 'string' ||
      !parsed.id ||
      isNaN(parsed.updated_at)
    ) {
      throw new Error('Invalid schema');
    }

    return {
      updated_at: parsed.updated_at,
      id: parsed.id,
    };
  } catch {
    throw new CursorValidationError('Invalid or corrupted cursor token');
  }
}

// In-Memory Database Store simulating PostgreSQL table and partial index
class ProjectDatabaseStore {
  private projects: Project[] = [];
  private activeProjectsIndex: Project[] = [];
  public isInitialized = false;

  constructor() {
    this.initializeDefaultDataset(100000); // Default seed: 100,000 records
  }

  /**
   * Seed mock projects to demonstrate partial indexing and performance at scale.
   */
  public initializeDefaultDataset(count: number = 100000, activeRatio: number = 0.5) {
    const projects: Project[] = [];
    const now = Date.now();
    const accounts = ['acc_main', 'acc_marketing', 'acc_design', 'acc_engineering'];

    for (let i = 0; i < count; i++) {
      const account_id = accounts[i % accounts.length];
      // Distribute statuses: activeRatio active, rest split between archived and deleted
      const isActive = (i / count) < activeRatio;
      const status: ProjectStatus = isActive
        ? 'active'
        : (i % 2 === 0 ? 'archived' : 'deleted');

      // Space timestamps across the past year with distinct IDs
      const timeOffsetMs = (count - i) * 1000 + (i % 37);
      const updated_at = now - timeOffsetMs;
      const created_at = updated_at - 86400000;

      projects.push({
        id: `proj_${(i + 1).toString().padStart(8, '0')}`,
        account_id,
        name: `Lumen Canvas Project #${i + 1}`,
        status,
        updated_at,
        created_at,
      });
    }

    this.projects = projects;
    this.buildPartialIndex();
    this.isInitialized = true;
  }

  /**
   * Build partial composite index emulation: (account_id, updated_at DESC, id DESC) WHERE status = 'active'
   */
  private buildPartialIndex() {
    this.activeProjectsIndex = this.projects
      .filter((p) => p.status === 'active')
      .sort((a, b) => {
        if (b.updated_at !== a.updated_at) {
          return b.updated_at - a.updated_at;
        }
        return b.id.localeCompare(a.id);
      });
  }

  /**
   * Executes a cursor-paginated project query using the partial composite index predicate.
   */
  public query(options: ProjectQueryOptions): ProjectListResponse {
    const startTime = performance.now();

    // Guardrail: Explicitly reject offset-based pagination parameters
    if (options.page !== undefined || options.offset !== undefined) {
      throw new PaginationValidationError(
        "Offset-based pagination parameters ('page', 'offset') are strictly forbidden on project list queries. Use cursor-based pagination."
      );
    }

    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const targetAccountId = options.account_id || 'acc_main';

    let cursorPayload: CursorPayload | null = null;
    if (options.cursor) {
      cursorPayload = decodeCursor(options.cursor);
    }

    // Evaluate against partial index (only active projects are indexed)
    let candidatePool = this.activeProjectsIndex;
    if (targetAccountId) {
      candidatePool = candidatePool.filter((p) => p.account_id === targetAccountId);
    }

    // Apply Keyset Cursor Condition: (updated_at < cursor.updated_at) OR (updated_at == cursor.updated_at AND id < cursor.id)
    let filteredResults = candidatePool;
    if (cursorPayload) {
      const cur = cursorPayload;
      filteredResults = candidatePool.filter((p) => {
        if (p.updated_at < cur.updated_at) return true;
        if (p.updated_at === cur.updated_at && p.id < cur.id) return true;
        return false;
      });
    }

    // Fetch page size + 1 to check for additional pages
    const pageItems = filteredResults.slice(0, limit + 1);
    const has_more = pageItems.length > limit;
    const projects = has_more ? pageItems.slice(0, limit) : pageItems;

    let next_cursor: string | null = null;
    if (has_more && projects.length > 0) {
      const lastProject = projects[projects.length - 1];
      next_cursor = encodeCursor({
        updated_at: lastProject.updated_at,
        id: lastProject.id,
      });
    }

    const endTime = performance.now();
    const execution_time_ms = Math.round((endTime - startTime) * 100) / 100;

    return {
      projects,
      next_cursor,
      has_more,
      meta: {
        total_active_records: candidatePool.length,
        execution_time_ms,
        index_used: 'idx_projects_active_account_updated',
        partial_index_predicate: "WHERE status = 'active'",
      },
    };
  }

  /**
   * Calculates memory overhead comparison between full index vs partial index.
   */
  public calculateIndexStats(): IndexStats {
    const total_records = this.projects.length;
    const active_records = this.projects.filter((p) => p.status === 'active').length;
    const inactive_records = total_records - active_records;

    // Estimate index entry size: account_id (32 bytes) + updated_at (8 bytes) + id (32 bytes) + pointer (8 bytes) = 80 bytes/entry
    const bytesPerIndexEntry = 80;

    const full_index_size_bytes = total_records * bytesPerIndexEntry;
    const partial_index_size_bytes = active_records * bytesPerIndexEntry;
    const memory_reduction_percentage = Math.round(
      ((full_index_size_bytes - partial_index_size_bytes) / full_index_size_bytes) * 100
    );

    return {
      full_index_size_bytes,
      partial_index_size_bytes,
      memory_reduction_percentage,
      total_records,
      active_records,
      inactive_records,
    };
  }
}

export const projectDbStore = new ProjectDatabaseStore();
