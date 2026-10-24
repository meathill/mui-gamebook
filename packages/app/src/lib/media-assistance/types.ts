export type MediaKind = 'image' | 'video' | 'speech' | 'music' | 'sfx';
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface GenerationInput {
  kind: MediaKind;
  prompt: string;
  referenceHashes: string[];
  parameters: Record<string, JsonValue>;
}

export type MediaTarget =
  | { kind: 'cover' }
  | { kind: 'character'; characterId: string }
  | { kind: 'image' | 'video' | 'audio'; sceneId: string; sceneKey?: string }
  | { kind: 'speech'; sceneId: string; sceneKey?: string; textHash: string; occurrence: number };

export interface PlanItem {
  target: MediaTarget;
  input: GenerationInput;
}

export interface WorkRow {
  game_id: number;
  status: 'pending' | 'active' | 'partial' | 'completed';
  checked_revision: number;
}

export interface GenerationRow {
  game_id: number;
  input_hash: string;
  input_json: string;
  status: 'pending' | 'generating' | 'uncertain' | 'paused' | 'ready';
  request_id: string | null;
  execution_token: string | null;
  lease_until: number | null;
  provider_task_id: string | null;
  error: string | null;
  output_key: string | null;
  output_url: string | null;
  file_hash: string | null;
  content_type: string | null;
}

export interface TargetRow {
  id: string;
  game_id: number;
  target_key: string;
  target_json: string;
  source_hash: string;
  input_hash: string;
  status: 'pending' | 'applied' | 'satisfied' | 'dismissed' | 'paused';
  applied_url: string | null;
  error: string | null;
}

export class AssistanceError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
