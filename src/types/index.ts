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

export type ProjectStatus = 'active' | 'archived' | 'deleted';

export interface Project {
  id: string;
  account_id: string;
  name: string;
  status: ProjectStatus;
  updated_at: number; // UNIX timestamp in ms
  created_at: number; // UNIX timestamp in ms
}

export interface CursorPayload {
  updated_at: number;
  id: string;
}

export interface ProjectQueryOptions {
  account_id?: string;
  limit?: number;
  cursor?: string;
  page?: any;
  offset?: any;
}

export interface ProjectListResponse {
  projects: Project[];
  next_cursor: string | null;
  has_more: boolean;
  meta: {
    total_active_records: number;
    execution_time_ms: number;
    index_used: string;
    partial_index_predicate: string;
  };
}

export interface IndexStats {
  full_index_size_bytes: number;
  partial_index_size_bytes: number;
  memory_reduction_percentage: number;
  total_records: number;
  active_records: number;
  inactive_records: number;
}

