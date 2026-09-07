export type EditorMode = 'idle' | 'inpaint' | 'style' | 'adjust';

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

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  filterIntensity: number;
}

export interface EditHistoryItem {
  id: string;
  timestamp: number;
  action: string;
  imageBlobUrl: string;
  adjustments?: ImageAdjustments;
  styleId?: string;
}
