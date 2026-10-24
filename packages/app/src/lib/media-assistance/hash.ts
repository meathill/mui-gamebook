import { AssistanceError, type GenerationInput, type JsonValue } from './types';

function canonicalize(value: JsonValue): JsonValue {
  if (typeof value === 'string') return value.replace(/\r\n?/g, '\n');
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new AssistanceError('生成参数必须是有限数值', 400);
  return value;
}

export function canonicalJson(value: JsonValue): string {
  return JSON.stringify(canonicalize(value));
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function serializeGenerationInput(input: GenerationInput): string {
  return canonicalJson({
    kind: input.kind,
    prompt: input.prompt,
    referenceHashes: input.referenceHashes,
    parameters: input.parameters,
  });
}

export async function hashGenerationInput(input: GenerationInput): Promise<string> {
  return sha256(serializeGenerationInput(input));
}

export function readGenerationInput(value: unknown): GenerationInput {
  if (!value || typeof value !== 'object') throw new AssistanceError('缺少生成输入', 400);
  const item = value as Record<string, unknown>;
  const kinds = ['image', 'video', 'speech', 'music', 'sfx'];
  if (!kinds.includes(String(item.kind)) || typeof item.prompt !== 'string' || !item.prompt.trim()) {
    throw new AssistanceError('素材类型或最终 prompt 无效', 400);
  }
  const references = item.referenceHashes ?? [];
  if (
    !Array.isArray(references) ||
    !references.every((hash) => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash))
  ) {
    throw new AssistanceError('参考素材必须使用 SHA-256 内容 hash', 400);
  }
  const parameters = item.parameters ?? {};
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    throw new AssistanceError('parameters 必须是 JSON 对象', 400);
  }
  return JSON.parse(
    canonicalJson({
      kind: String(item.kind),
      prompt: item.prompt,
      referenceHashes: references,
      parameters: parameters as Record<string, JsonValue>,
    }),
  ) as GenerationInput;
}
