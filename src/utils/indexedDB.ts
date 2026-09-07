import type { EditorMode, EditHistoryItem } from '../types';
import type { Stroke } from './canvasUtils';

export interface CanvasSessionData {
  activeImage: string | null;
  initialBaseImage: string | null;
  mode: EditorMode;
  strokes: Stroke[];
  brushSize: number;
  history: EditHistoryItem[];
  selectedStyleId: string;
  hasAppliedStyle: boolean;
  showComparison: boolean;
  updatedAt: number;
}

const DB_NAME = 'LumenEditorDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const SESSION_KEY = 'current_session';

// Max cache size per session: 100 MB limit
const MAX_SESSION_BYTES = 100 * 1024 * 1024;

/**
 * Opens or initializes the IndexedDB database for Lumen Editor.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });
}

/**
 * Estimates the memory size in bytes of a session object.
 */
function estimateSessionBytes(sessionData: CanvasSessionData): number {
  try {
    const jsonString = JSON.stringify(sessionData);
    return new Blob([jsonString]).size;
  } catch {
    return 0;
  }
}

/**
 * Saves active canvas session into IndexedDB with quota enforcement (< 100 MB).
 */
export async function saveCanvasSession(data: CanvasSessionData): Promise<boolean> {
  try {
    let sessionData = { ...data, updatedAt: Date.now() };

    // Enforce 100MB quota guardrail
    let currentBytes = estimateSessionBytes(sessionData);

    // Prune history items from oldest to newest if exceeding 100 MB
    while (currentBytes > MAX_SESSION_BYTES && sessionData.history.length > 0) {
      sessionData.history = sessionData.history.slice(1);
      currentBytes = estimateSessionBytes(sessionData);
    }

    if (currentBytes > MAX_SESSION_BYTES) {
      console.warn(`[IndexedDB] Session size (${(currentBytes / (1024 * 1024)).toFixed(2)} MB) exceeds 100 MB quota limit. Skipping persist.`);
      return false;
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(sessionData, SESSION_KEY);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Error saving canvas session:', err);
    return false;
  }
}

/**
 * Loads persisted canvas session from IndexedDB.
 */
export async function loadCanvasSession(): Promise<CanvasSessionData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(SESSION_KEY);

      request.onsuccess = () => {
        const data = request.result as CanvasSessionData | undefined;
        resolve(data || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('[IndexedDB] Error loading canvas session:', err);
    return null;
  }
}

/**
 * Clears saved session from IndexedDB (e.g. when canvas is reset).
 */
export async function clearCanvasSession(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(SESSION_KEY);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Error clearing canvas session:', err);
    return false;
  }
}
