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
 * 解析图片/视频生成使用的提供者类型
 * 只有 Google/OpenAI 支持图片和视频；全局默认是 mimo/anthropic 时回退到 Google
 */
export async function resolveImageVideoProviderType(): Promise<'google' | 'openai'> {
  const config = await getConfig();
  const defaultType = config.defaultAiProvider;
  return defaultType === 'google' || defaultType === 'openai' ? defaultType : 'google';
}

/**
 * 解析 TTS 使用的提供者类型
 * 三选一（Claude 不支持 TTS），独立于 defaultAiProvider（后者只管文本），
 * 由管理后台单独配置的 defaultTtsProvider 决定
 */
export async function resolveTtsProviderType(): Promise<'google' | 'openai' | 'mimo'> {
  const config = await getConfig();
  const ttsType = config.defaultTtsProvider;
  return ttsType === 'google' || ttsType === 'openai' || ttsType === 'mimo' ? ttsType : 'mimo';
}

/**
 * Claude/Gemini/OpenAI 的真实密钥存储在 Cloudflare AI Gateway（BYOK），
 * app 自身不再持有这些密钥。SDK 客户端仍需要一个非空 apiKey 字段才能构造，
 * 但实际鉴权由 Gateway 用它存储的密钥完成，这里只是占位。
 */
const AI_GATEWAY_MANAGED_KEY = 'cf-ai-gateway-managed';

/**
 * 计算某提供者经 Cloudflare AI Gateway 转发的 base URL
 * Claude/Gemini/OpenAI 必须经网关（密钥存在网关侧）；MiMo 不受影响，始终直连官方
 */
function resolveGatewayBaseUrl(config: AppConfig, provider: 'openai' | 'anthropic' | 'google-ai-studio'): string {
  const gateway = config.cfAiGatewayBaseUrl?.trim().replace(/\/+$/, '');
  if (!gateway) {
    throw new Error(
      `Cloudflare AI Gateway 未配置：${provider} 的密钥存储在网关中，请在管理后台系统配置里填写 cfAiGatewayBaseUrl`,
    );
  }
  return `${gateway}/${provider}`;
}

/**
 * 网关鉴权 header：如果网关开启了 Authenticated Gateway（Cloudflare 官方推荐生产环境启用），
 * 每个请求都必须带 cf-aig-authorization，否则请求在到达 provider 之前就会被网关拒绝（401），
 * 与 BYOK 是否配置无关。未配置 CF_AI_GATEWAY_TOKEN 时按未鉴权网关处理，不发这个 header。
 */
function resolveGatewayHeaders(token: string | undefined): Record<string, string> {
  return token ? { 'cf-aig-authorization': `Bearer ${token}` } : {};
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

    return new MimoProvider(apiKey, { text: config.mimoTextModel, tts: config.mimoTtsModel }, config.mimoBaseUrl);
  }

  const gatewayHeaders = resolveGatewayHeaders(env.CF_AI_GATEWAY_TOKEN || process.env.CF_AI_GATEWAY_TOKEN);

  if (providerType === 'anthropic') {
    const baseURL = resolveGatewayBaseUrl(config, 'anthropic');
    return new ClaudeProvider(
      AI_GATEWAY_MANAGED_KEY,
      { text: config.anthropicTextModel },
      { baseURL, headers: gatewayHeaders },
    );
  }

  if (providerType === 'openai') {
    const baseURL = resolveGatewayBaseUrl(config, 'openai');
    return new OpenAiProvider(
      AI_GATEWAY_MANAGED_KEY,
      {
        text: config.openaiTextModel,
        image: config.openaiImageModel,
        video: config.openaiVideoModel,
        tts: config.openaiTtsModel,
      },
      { baseURL, headers: gatewayHeaders },
    );
  }

  // 默认使用 Google AI
  return buildGoogleAiProvider(config, gatewayHeaders);
}

/**
 * 创建 Google AI 提供者（用于视频生成，因为 OpenAI 不支持）
 */
export async function createGoogleAiProvider(): Promise<GoogleAiProvider> {
  const { env } = getCloudflareContext();
  const config = await getConfig();
  const gatewayHeaders = resolveGatewayHeaders(env.CF_AI_GATEWAY_TOKEN || process.env.CF_AI_GATEWAY_TOKEN);
  return buildGoogleAiProvider(config, gatewayHeaders);
}

function buildGoogleAiProvider(config: AppConfig, gatewayHeaders: Record<string, string>): GoogleAiProvider {
  const apiBaseUrl = resolveGatewayBaseUrl(config, 'google-ai-studio');
  const genAI = new GoogleGenAI({
    apiKey: AI_GATEWAY_MANAGED_KEY,
    httpOptions: { baseUrl: apiBaseUrl, ...(Object.keys(gatewayHeaders).length > 0 && { headers: gatewayHeaders }) },
  });
  return new GoogleAiProvider(
    genAI,
    AI_GATEWAY_MANAGED_KEY,
    {
      text: config.googleTextModel,
      image: config.googleImageModel,
      video: config.googleVideoModel,
      tts: config.googleTtsModel,
    },
    { apiBaseUrl, headers: gatewayHeaders },
  );
}
