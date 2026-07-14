/**
 * AI Provider 工厂函数
 * 根据配置创建对应的 AI 提供者实例
 */
import { GoogleGenAI } from '@google/genai';
import type { AiProvider, AiProviderType } from './ai-provider';
import { ClaudeProvider } from './claude-provider';
import { GoogleAiProvider } from './google-ai-provider';
import { MimoProvider } from './mimo-provider';
import { OpenAiProvider } from './openai-provider';

/**
 * AI Provider 配置选项
 */
export interface AiProviderOptions {
  /** 提供者类型，默认 'google' */
  type?: AiProviderType;
  /** Google API Key */
  googleApiKey?: string;
  /** OpenAI API Key */
  openaiApiKey?: string;
  /** 小米 MiMo API Key */
  mimoApiKey?: string;
  /** 小米 MiMo base URL（默认 Token Plan 地址） */
  mimoBaseUrl?: string;
  /** Anthropic API Key */
  anthropicApiKey?: string;
  /** 模型配置 */
  models?: {
    text?: string;
    image?: string;
    video?: string;
    tts?: string;
  };
}

/**
 * 创建 AI Provider 实例
 * @param options 配置选项
 * @returns AI Provider 实例
 */
export function createAiProvider(options: AiProviderOptions): AiProvider {
  const providerType = options.type || 'google';

  if (providerType === 'mimo') {
    if (!options.mimoApiKey) {
      throw new Error('MiMo API Key is required for MiMo provider');
    }
    return new MimoProvider(
      options.mimoApiKey,
      { text: options.models?.text, tts: options.models?.tts },
      options.mimoBaseUrl,
    );
  }

  if (providerType === 'anthropic') {
    if (!options.anthropicApiKey) {
      throw new Error('Anthropic API Key is required for Claude provider');
    }
    return new ClaudeProvider(options.anthropicApiKey, { text: options.models?.text });
  }

  if (providerType === 'openai') {
    if (!options.openaiApiKey) {
      throw new Error('OpenAI API Key is required for OpenAI provider');
    }
    return new OpenAiProvider(options.openaiApiKey, {
      text: options.models?.text,
      image: options.models?.image,
      tts: options.models?.tts,
    });
  }

  // 默认使用 Google AI
  if (!options.googleApiKey) {
    throw new Error('Google API Key is required for Google provider');
  }

  const genAI = new GoogleGenAI({ apiKey: options.googleApiKey });
  return new GoogleAiProvider(genAI, options.googleApiKey, {
    text: options.models?.text,
    image: options.models?.image,
    video: options.models?.video,
  });
}

/**
 * 从环境变量创建 AI Provider
 * 用于命令行工具等场景
 * @param type 指定提供者类型，默认从 AI_PROVIDER 环境变量读取
 */
export function createAiProviderFromEnv(type?: AiProviderType): AiProvider {
  const providerType = type || (process.env.AI_PROVIDER as AiProviderType) || 'google';

  return createAiProvider({
    type: providerType,
    googleApiKey: process.env.GOOGLE_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    mimoApiKey: process.env.MIMO_API_KEY,
    mimoBaseUrl: process.env.MIMO_BASE_URL,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    models: {
      text: process.env.AI_TEXT_MODEL,
      image: process.env.AI_IMAGE_MODEL || process.env.GOOGLE_IMAGE_MODEL,
      video: process.env.AI_VIDEO_MODEL,
      tts: process.env.AI_TTS_MODEL,
    },
  });
}
