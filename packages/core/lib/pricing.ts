/**
 * AI 用量与计费核算系统
 * 基于各模型/模态的每百万 Token (1M Tokens) 或次/字符的真实美元定价，
 * 统一核算美元成本并换算为标准计费 Token（1 标准 Token = $0.000001 USD，即 $1.00 USD = 1,000,000 Tokens = 1 M Token）。
 */

export interface ModelPricingRate {
  /** 每百万输入 Token (或 TTS 字符) 价格（美元 USD） */
  inputPricePerMillion?: number;
  /** 每百万输出 Token 价格（美元 USD） */
  outputPricePerMillion?: number;
  /** 单次调用固定价格（生图 / 生视频，美元 USD） */
  pricePerCall?: number;
}

/**
 * 各模型及模态的基准定价表（USD）
 * 严格核对各官方与 OpenCode Go 平台 2026 最新定价
 */
export const MODEL_PRICING_RATES: Record<string, ModelPricingRate> = {
  // === OpenCode Go / DeepSeek (调价后，换算 USD: 1 USD ≈ 7.2 RMB) ===
  // DeepSeek-V4-Flash 官方高峰 3元/9元，空闲 1.5元/4.5元；OpenCode Go 基准折算取综合平均约 $0.30 / $0.90 每 1M Tokens
  'deepseek-v4-flash': { inputPricePerMillion: 0.3, outputPricePerMillion: 0.9 },
  'deepseek-v4-flash-free': { inputPricePerMillion: 0.3, outputPricePerMillion: 0.9 },
  'deepseek-chat': { inputPricePerMillion: 0.3, outputPricePerMillion: 0.9 },
  // DeepSeek-V4-Pro / Reasoner 官方高峰 9元/27元，折合 $1.25 / $3.75 每 1M Tokens
  'deepseek-v4-pro': { inputPricePerMillion: 1.25, outputPricePerMillion: 3.75 },
  'deepseek-reasoner': { inputPricePerMillion: 1.25, outputPricePerMillion: 3.75 },

  // === OpenAI ===
  // GPT-5.6 Luna：2026 最新轻量模型，5 折特惠期 $0.20 输入 / $0.80 输出
  'gpt-5.6-luna': { inputPricePerMillion: 0.2, outputPricePerMillion: 0.8 },
  'gpt-5.5': { inputPricePerMillion: 2.5, outputPricePerMillion: 10.0 },
  'gpt-4o': { inputPricePerMillion: 2.5, outputPricePerMillion: 10.0 },
  'gpt-4o-mini': { inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 },
  'gpt-image-1.5': { pricePerCall: 0.04 },
  'gpt-image-1': { pricePerCall: 0.04 },
  'dall-e-3': { pricePerCall: 0.04 },
  'gpt-4o-mini-tts': { inputPricePerMillion: 15.0 },
  'tts-1': { inputPricePerMillion: 15.0 },
  'tts-1-hd': { inputPricePerMillion: 30.0 },

  // === 小米 MiMo (换算成 USD，1 USD ≈ 7.2 RMB) ===
  'mimo-v2.5-pro': { inputPricePerMillion: 0.14, outputPricePerMillion: 0.28 }, // 1.00元/1M, 2.00元/1M
  'mimo-v2.5': { inputPricePerMillion: 0.07, outputPricePerMillion: 0.14 }, // 0.50元/1M, 1.00元/1M
  'mimo-v2.5-tts': { inputPricePerMillion: 0.14 }, // 1.00元/1M 字符

  // === Anthropic Claude ===
  'claude-sonnet-5': { inputPricePerMillion: 3.0, outputPricePerMillion: 15.0 },
  'claude-3-5-sonnet': { inputPricePerMillion: 3.0, outputPricePerMillion: 15.0 },
  'claude-3-5-sonnet-latest': { inputPricePerMillion: 3.0, outputPricePerMillion: 15.0 },
  'claude-3-5-haiku': { inputPricePerMillion: 0.8, outputPricePerMillion: 4.0 },
  'claude-3-5-haiku-latest': { inputPricePerMillion: 0.8, outputPricePerMillion: 4.0 },

  // === Google GenAI ===
  'gemini-3.7-flash': { inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 },
  'gemini-2.5-flash': { inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 },
  'gemini-3.1-pro-preview': { inputPricePerMillion: 1.25, outputPricePerMillion: 5.0 },
  'gemini-3-pro-preview': { inputPricePerMillion: 1.25, outputPricePerMillion: 5.0 },
  'gemini-2.5-pro': { inputPricePerMillion: 1.25, outputPricePerMillion: 5.0 },
  'gemini-3.1-flash-lite-image': { pricePerCall: 0.03 },
  'gemini-3.1-flash-image': { pricePerCall: 0.03 },
  'gemini-2.5-flash-image': { pricePerCall: 0.03 },
  'gemini-3-pro-image-preview': { pricePerCall: 0.03 },
  'gemini-3.1-flash-tts-preview': { inputPricePerMillion: 10.0 },
  'gemini-2.5-flash-preview-tts': { inputPricePerMillion: 10.0 },
  'veo-3.1-fast-generate-preview': { pricePerCall: 0.35 },
  'veo-3.1-generate-preview': { pricePerCall: 0.35 },

  // === 音乐与音效 (Music & SFX) ===
  'suno-v4': { pricePerCall: 0.1 },
  'suno-v3.5': { pricePerCall: 0.1 },
  'udio-v1.5': { pricePerCall: 0.1 },
  'eleven-sfx-v1': { pricePerCall: 0.05 },
  'stable-audio': { pricePerCall: 0.05 },
};

/**
 * 默认费率兜底（当遇到未知模型时，按常见轻量文本模型与模态的平均费率计算）
 */
const DEFAULT_FALLBACK_RATES: Record<string, ModelPricingRate> = {
  text: { inputPricePerMillion: 0.3, outputPricePerMillion: 0.9 },
  image: { pricePerCall: 0.03 },
  audio: { inputPricePerMillion: 0.14 },
  music: { pricePerCall: 0.1 },
  sfx: { pricePerCall: 0.05 },
  video: { pricePerCall: 0.35 },
};

export interface UsageInput {
  type: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/**
 * 查找指定模型与模态的费率配置
 */
export function getModelPricingRate(model: string, type?: string): ModelPricingRate {
  const normalizedModel = model.toLowerCase().trim();
  if (MODEL_PRICING_RATES[normalizedModel]) {
    return MODEL_PRICING_RATES[normalizedModel];
  }

  // 模糊匹配前缀
  for (const [key, rate] of Object.entries(MODEL_PRICING_RATES)) {
    if (normalizedModel.includes(key) || key.includes(normalizedModel)) {
      return rate;
    }
  }

  // 模态兜底
  if (type === 'image_generation') return DEFAULT_FALLBACK_RATES.image;
  if (type === 'audio_generation') return DEFAULT_FALLBACK_RATES.audio;
  if (type === 'music_generation') return DEFAULT_FALLBACK_RATES.music;
  if (type === 'sfx_generation') return DEFAULT_FALLBACK_RATES.sfx;
  if (type === 'video_generation') return DEFAULT_FALLBACK_RATES.video;
  return DEFAULT_FALLBACK_RATES.text;
}

/**
 * 计算单次 AI 调用的美元成本 ($ USD)
 */
export function calculateCostUsd(usage: UsageInput): number {
  const rate = getModelPricingRate(usage.model, usage.type);

  // 1. 固定单次调用费用（生图 / 视频）
  if (rate.pricePerCall !== undefined) {
    return rate.pricePerCall;
  }

  // 2. 音频 / TTS：输入字符量计费
  if (usage.type === 'audio_generation') {
    const chars = usage.promptTokens || usage.totalTokens || 0;
    const inputRate = rate.inputPricePerMillion ?? 0.14;
    return (chars * inputRate) / 1_000_000;
  }

  // 3. 文本 / Chat / 补全 / 小游戏
  const promptTokens = usage.promptTokens ?? 0;
  const completionTokens = usage.completionTokens ?? 0;
  const inputRate = rate.inputPricePerMillion ?? 0.3;
  const outputRate = rate.outputPricePerMillion ?? 0.9;

  // 如果没有区分 prompt / completion，只传了 totalTokens
  if (promptTokens === 0 && completionTokens === 0 && (usage.totalTokens ?? 0) > 0) {
    const avgRate = (inputRate + outputRate) / 2;
    return ((usage.totalTokens ?? 0) * avgRate) / 1_000_000;
  }

  return (promptTokens * inputRate + completionTokens * outputRate) / 1_000_000;
}

/**
 * 计算换算后的标准计费 Token 数量 (Billed Tokens)
 * 换算规则：$1.00 USD = 1,000,000 标准 Tokens (1 M Token)
 * @param usage 用量输入参数
 * @returns 经真实费率换算后的标准计费 Token 整数
 */
export function calculateBilledTokens(usage: UsageInput): number {
  const costUsd = calculateCostUsd(usage);
  // $1.00 USD = 1,000,000 Tokens
  const billedTokens = Math.round(costUsd * 1_000_000);
  // 至少计 1 token，避免为 0（除非完全无用量）
  if (billedTokens === 0 && ((usage.promptTokens ?? 0) > 0 || (usage.totalTokens ?? 0) > 0)) {
    return 1;
  }
  return billedTokens;
}
