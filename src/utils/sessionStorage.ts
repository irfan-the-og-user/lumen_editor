import type { EditorMode, EditHistoryItem, SavedSessionData, SavedHistoryItem } from '../types';
import type { Stroke } from './canvasUtils';

const DB_NAME = 'LumenSessionDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const SESSION_KEY = 'active_session';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function urlToBlob(url: string): Promise<Blob> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.blob();
    }
  } catch (err) {
    console.warn('Direct fetch to blob failed, falling back to canvas conversion:', err);
  }

  // Fallback via Image & Canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2d context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null'));
        }
      }, 'image/png');
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

export interface SaveSessionInput {
  activeImage: string;
  initialBaseImage: string | null;
  mode: EditorMode;
  strokes: Stroke[];
  brushSize: number;
  history: EditHistoryItem[];
  selectedStyleId: string;
  hasAppliedStyle: boolean;
  showComparison: boolean;
  lastLatencyMs: number | null;
  lastEngineUsed: 'huggingface' | 'edge-client' | null;
}

export interface RestoredSession {
  activeImage: string;
  initialBaseImage: string | null;
  mode: EditorMode;
  strokes: Stroke[];
  brushSize: number;
  history: EditHistoryItem[];
  selectedStyleId: string;
  hasAppliedStyle: boolean;
  showComparison: boolean;
  lastLatencyMs: number | null;
  lastEngineUsed: 'huggingface' | 'edge-client' | null;
}

export async function saveSession(input: SaveSessionInput): Promise<void> {
  try {
    if (!input.activeImage) return;

    const activeImageBlob = await urlToBlob(input.activeImage);
    const initialBaseImageBlob = input.initialBaseImage
      ? await urlToBlob(input.initialBaseImage)
      : null;

    const savedHistory: SavedHistoryItem[] = await Promise.all(
      input.history.map(async (item) => ({
        id: item.id,
        timestamp: item.timestamp,
        action: item.action,
        imageBlob: await urlToBlob(item.imageBlobUrl)
      }))
    );

    const sessionData: SavedSessionData = {
      activeImageBlob,
      initialBaseImageBlob,
      mode: input.mode,
      strokes: input.strokes,
      brushSize: input.brushSize,
      history: savedHistory,
      selectedStyleId: input.selectedStyleId,
      hasAppliedStyle: input.hasAppliedStyle,
      showComparison: input.showComparison,
      lastLatencyMs: input.lastLatencyMs,
      lastEngineUsed: input.lastEngineUsed,
      updatedAt: Date.now()
    };

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(sessionData, SESSION_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save session to IndexedDB:', err);
  }
}

export async function loadSession(): Promise<RestoredSession | null> {
  try {
    const db = await openDB();
    const sessionData = await new Promise<SavedSessionData | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(SESSION_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!sessionData || !sessionData.activeImageBlob) {
      return null;
    }

    const activeImage = URL.createObjectURL(sessionData.activeImageBlob);
    const initialBaseImage = sessionData.initialBaseImageBlob
      ? URL.createObjectURL(sessionData.initialBaseImageBlob)
      : activeImage;

    const history: EditHistoryItem[] = (sessionData.history || []).map((item) => ({
      id: item.id,
      timestamp: item.timestamp,
      action: item.action,
      imageBlobUrl: URL.createObjectURL(item.imageBlob)
    }));

    return {
      activeImage,
      initialBaseImage,
      mode: sessionData.mode || 'inpaint',
      strokes: sessionData.strokes || [],
      brushSize: sessionData.brushSize || 32,
      history,
      selectedStyleId: sessionData.selectedStyleId || 'cyberpunk',
      hasAppliedStyle: sessionData.hasAppliedStyle || false,
      showComparison: sessionData.showComparison || false,
      lastLatencyMs: sessionData.lastLatencyMs ?? null,
      lastEngineUsed: sessionData.lastEngineUsed ?? null
    };
  } catch (err) {
    console.error('Failed to load session from IndexedDB:', err);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(SESSION_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to clear session from IndexedDB:', err);
  }
}
