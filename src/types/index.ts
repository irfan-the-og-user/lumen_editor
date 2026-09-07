export type EditorMode = 'idle' | 'inpaint' | 'style';

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  category: 'artistic' | 'render' | 'cinematic' | 'retro';
  prompt: string;
  color: string;
  previewUrl: string;
}

export interface SampleImage {
  id: string;
  name: string;
  category: string;
  url: string;
  recommendedMode: EditorMode;
}

export interface InferenceProgress {
  step: string;
  percentage: number;
  subtext: string;
}

export interface EditHistoryItem {
  id: string;
  timestamp: number;
  action: string;
  imageBlobUrl: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export type PendingAction = 'export' | 'cloud_ai' | null;

export interface SavedHistoryItem {
  id: string;
  timestamp: number;
  action: string;
  imageBlob: Blob;
}

export interface SavedSessionData {
  activeImageBlob: Blob;
  initialBaseImageBlob: Blob | null;
  mode: EditorMode;
  strokes: any[];
  brushSize: number;
  history: SavedHistoryItem[];
  selectedStyleId: string;
  hasAppliedStyle: boolean;
  showComparison: boolean;
  lastLatencyMs: number | null;
  lastEngineUsed: 'huggingface' | 'edge-client' | null;
  updatedAt: number;
}

