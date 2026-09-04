export type EditorMode = 'idle' | 'inpaint' | 'style' | 'adjust';

export interface AdjustmentSettings {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // -100 to 100
  warmth: number;     // -100 to 100 (temperature)
  exposure: number;   // -100 to 100
  sepia: number;      // 0 to 100
}

export const DEFAULT_ADJUSTMENTS: AdjustmentSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  exposure: 0,
  sepia: 0
};

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
