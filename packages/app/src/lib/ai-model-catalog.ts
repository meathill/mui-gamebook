import type { TextProviderType } from '@mui-gamebook/core/lib/ai-provider';

export interface TextModelPreset {
  value: string;
  label: string;
  description?: string;
}

/**
 * 各文本供应商的可选模型预设。
 * - openai / google / mimo / anthropic：走原厂（密钥在网关或直连，见 ai-provider-factory）
 * - opencode：走 OpenCode 聚合网关，可填其它第三方文本模型，以 opencode 官方文档为准
 *
 * 每个列表第一项即系统默认模型（与 config.ts 的 env 默认保持一致），前端下拉默认选中它。
 * 预设之外允许手动输入任意合法 model ID（见 validatePreferredTextModel）。
 */
export const TEXT_MODEL_PRESETS: Record<TextProviderType, TextModelPreset[]> = {
  openai: [
    { value: 'gpt-5.6-luna', label: 'gpt-5.6-luna（默认）' },
    { value: 'gpt-5.1', label: 'gpt-5.1' },
    { value: 'gpt-5-mini', label: 'gpt-5-mini（轻量）' },
    { value: 'gpt-4o', label: 'gpt-4o' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini（轻量）' },
  ],
  google: [
    { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash（默认）' },
    { value: 'gemini-3-pro', label: 'gemini-3-pro（强推理）' },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash（轻量）' },
  ],
  mimo: [
    { value: 'mimo-v2.5-pro', label: 'mimo-v2.5-pro（默认）' },
    { value: 'mimo-v2.5-flash', label: 'mimo-v2.5-flash（轻量）' },
    { value: 'mimo-v2.5', label: 'mimo-v2.5' },
  ],
  anthropic: [
    { value: 'claude-sonnet-5', label: 'claude-sonnet-5（默认）' },
    { value: 'claude-opus-4-5', label: 'claude-opus-4-5（强推理）' },
    { value: 'claude-haiku-4-5', label: 'claude-haiku-4-5（轻量）' },
  ],
  opencode: [
    { value: 'deepseek-v4.1-flash', label: 'deepseek-v4.1-flash（默认）' },
    { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro（强推理）' },
    { value: 'qwen3-max', label: 'qwen3-max' },
    { value: 'kimi-k2-0905', label: 'kimi-k2' },
    { value: 'glm-4.6', label: 'glm-4.6' },
  ],
};

/** 走原厂直连/网关的供应商（密钥已配置） */
export const DIRECT_TEXT_PROVIDERS: TextProviderType[] = ['openai', 'google', 'mimo', 'anthropic'];

/** 走 OpenCode 聚合网关的供应商（其它文本模型填这里） */
export const AGGREGATED_TEXT_PROVIDERS: TextProviderType[] = ['opencode'];

const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._\-/:]*$/;
export const MAX_MODEL_ID_LENGTH = 128;

export function isTextProviderType(value: unknown): value is TextProviderType {
  return (
    typeof value === 'string' && (['opencode', 'mimo', 'anthropic', 'google', 'openai'] as string[]).includes(value)
  );
}

/** 校验用户提交的模型 ID：非空、长度上限、仅允许安全字符，避免注入到请求体之外的用途 */
export function validatePreferredTextModel(model: unknown): model is string {
  return (
    typeof model === 'string' && model.length > 0 && model.length <= MAX_MODEL_ID_LENGTH && MODEL_ID_PATTERN.test(model)
  );
}
