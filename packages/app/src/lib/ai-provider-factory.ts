/**
 * AI 提供者工厂
 * 根据配置创建对应的 AI 提供者
 */

import { GoogleGenAI } from '@google/genai';
import type { AiProvider, AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { ClaudeProvider } from '@mui-gamebook/core/lib/claude-provider';
import { GoogleAiProvider } from '@mui-gamebook/core/lib/google-ai-provider';
import { MimoProvider } from '@mui-gamebook/core/lib/mimo-provider';
import { OpenAiProvider } from '@mui-gamebook/core/lib/openai-provider';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { type AppConfig, getConfig } from './config';

/**
 * 解析媒体生成（图片/TTS/视频）使用的提供者类型
 * MiMo/Claude 只支持文本，全局默认被设为它们时媒体链路回退到 Google
 */
export async function resolveMediaProviderType(): Promise<'google' | 'openai'> {
  const config = await getConfig();
  const defaultType = config.defaultAiProvider;
  return defaultType === 'google' || defaultType === 'openai' ? defaultType : 'google';
}

/**
 * 计算某提供者经 Cloudflare AI Gateway 转发的 base URL
 * 未配置网关时返回 undefined（直连官方 API）；MiMo 不走网关
 */
function resolveGatewayBaseUrl(
  config: AppConfig,
  provider: 'openai' | 'anthropic' | 'google-ai-studio',
): string | undefined {
  const gateway = config.cfAiGatewayBaseUrl?.trim().replace(/\/+$/, '');
  if (!gateway) return undefined;
  return `${gateway}/${provider}`;
}

/**
 * 创建 AI 提供者
 * @param type 指定提供者类型，如不指定则使用配置中的默认值
 */
export async function createAiProvider(type?: AiProviderType): Promise<AiProvider> {
  const { env } = getCloudflareContext();
  const config = await getConfig();

  const providerType = type || config.defaultAiProvider || 'google';

  if (providerType === 'mimo') {
    const apiKey = env.MIMO_API_KEY || process.env.MIMO_API_KEY;
    if (!apiKey) {
      throw new Error('MIMO_API_KEY not configured');
    }

    return new MimoProvider(apiKey, { text: config.mimoTextModel }, config.mimoBaseUrl);
  }

  if (providerType === 'anthropic') {
    const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const baseURL = resolveGatewayBaseUrl(config, 'anthropic');
    return new ClaudeProvider(apiKey, { text: config.anthropicTextModel }, baseURL ? { baseURL } : undefined);
  }

  if (providerType === 'openai') {
    const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const baseURL = resolveGatewayBaseUrl(config, 'openai');
    return new OpenAiProvider(
      apiKey,
      {
        text: config.openaiTextModel,
        image: config.openaiImageModel,
        video: config.openaiVideoModel,
      },
      baseURL ? { baseURL } : undefined,
    );
  }

  // 默认使用 Google AI
  return buildGoogleAiProvider(env, config);
}

/**
 * 创建 Google AI 提供者（用于视频生成，因为 OpenAI 不支持）
 */
export async function createGoogleAiProvider(): Promise<GoogleAiProvider> {
  const { env } = getCloudflareContext();
  const config = await getConfig();
  return buildGoogleAiProvider(env, config);
}

function buildGoogleAiProvider(env: { GOOGLE_API_KEY?: string }, config: AppConfig): GoogleAiProvider {
  const apiKey = env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  const apiBaseUrl = resolveGatewayBaseUrl(config, 'google-ai-studio');
  const genAI = new GoogleGenAI({ apiKey, ...(apiBaseUrl && { httpOptions: { baseUrl: apiBaseUrl } }) });
  return new GoogleAiProvider(
    genAI,
    apiKey,
    {
      text: config.googleTextModel,
      image: config.googleImageModel,
      video: config.googleVideoModel,
    },
    apiBaseUrl ? { apiBaseUrl } : undefined,
  );
}
