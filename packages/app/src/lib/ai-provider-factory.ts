/**
 * AI 提供者工厂
 * 根据配置创建对应的 AI 提供者
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GoogleGenAI } from '@google/genai';
import type { AiProvider, AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { GoogleAiProvider } from '@mui-gamebook/core/lib/google-ai-provider';
import { OpenAiProvider } from '@mui-gamebook/core/lib/openai-provider';
import { getConfig } from './config';

/**
 * 创建 AI 提供者
 * @param type 指定提供者类型，如不指定则使用配置中的默认值
 */
export async function createAiProvider(type?: AiProviderType): Promise<AiProvider> {
  const { env } = getCloudflareContext();
  const config = await getConfig();

  const providerType = type || config.defaultAiProvider || 'google';

  if (providerType === 'openai') {
    const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    return new OpenAiProvider(apiKey, {
      text: config.openaiTextModel,
      image: config.openaiImageModel,
      video: config.openaiVideoModel,
    });
  }

  // 默认使用 Google AI
  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY_NEW not configured');
  }

  const genAI = new GoogleGenAI({ apiKey });
  return new GoogleAiProvider(genAI, apiKey, {
    text: config.googleTextModel,
    image: config.googleImageModel,
    video: config.googleVideoModel,
  });
}

/**
 * 创建 Google AI 提供者（用于视频生成，因为 OpenAI 不支持）
 */
export async function createGoogleAiProvider(): Promise<GoogleAiProvider> {
  const { env } = getCloudflareContext();
  const config = await getConfig();

  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY_NEW not configured');
  }

  const genAI = new GoogleGenAI({ apiKey });
  return new GoogleAiProvider(genAI, apiKey, {
    text: config.googleTextModel,
    image: config.googleImageModel,
    video: config.googleVideoModel,
  });
}
