/**
 * AI 提供者工厂
 * 按模态（文本、TTS、图片、视频、STT）创建对应的 AI 提供者
 */

import { GoogleGenAI } from '@google/genai';
import type {
  AiProvider,
  AiProviderType,
  ImageProviderType,
  SttProviderType,
  TextProviderType,
  TtsProviderType,
  VideoProviderType,
} from '@mui-gamebook/core/lib/ai-provider';
import { ClaudeProvider } from '@mui-gamebook/core/lib/claude-provider';
import { GoogleAiProvider } from '@mui-gamebook/core/lib/google-ai-provider';
import { MimoProvider } from '@mui-gamebook/core/lib/mimo-provider';
import { OpencodeProvider } from '@mui-gamebook/core/lib/opencode-provider';
import { OpenAiProvider } from '@mui-gamebook/core/lib/openai-provider';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { type AppConfig, getConfig } from './config';

/**
 * 解析文本生成使用的提供者类型
 */
export async function resolveTextProviderType(): Promise<TextProviderType> {
  const config = await getConfig();
  return config.defaultTextProvider || config.defaultAiProvider;
}

/**
 * 解析 TTS 语音合成使用的提供者类型
 */
export async function resolveTtsProviderType(): Promise<TtsProviderType> {
  const config = await getConfig();
  return config.defaultTtsProvider;
}

/**
 * 解析图片生成使用的提供者类型
 */
export async function resolveImageProviderType(): Promise<ImageProviderType> {
  const config = await getConfig();
  return config.defaultImageProvider;
}

/**
 * 解析视频生成使用的提供者类型
 */
export async function resolveVideoProviderType(): Promise<VideoProviderType> {
  const config = await getConfig();
  return config.defaultVideoProvider;
}

/**
 * 解析语音识别使用的提供者类型
 */
export async function resolveSttProviderType(): Promise<SttProviderType> {
  const config = await getConfig();
  return config.defaultSttProvider;
}

/**
 * 兼容旧方法：解析图片/视频提供者类型
 * @deprecated 请使用 resolveImageProviderType 或 resolveVideoProviderType
 */
export async function resolveImageVideoProviderType(): Promise<ImageProviderType> {
  return resolveImageProviderType();
}

/**
 * Claude/Gemini/OpenAI 的真实密钥存储在 Cloudflare AI Gateway（BYOK），
 * app 自身不再持有这些密钥。SDK 客户端仍需要一个非空 apiKey 字段才能构造，
 * 但实际鉴权由 Gateway 用它存储的密钥完成，这里只是占位。
 */
const AI_GATEWAY_MANAGED_KEY = 'cf-ai-gateway-managed';

/**
 * 计算某提供者经 Cloudflare AI Gateway 转发的 base URL
 * Claude/Gemini/OpenAI 必须经网关（密钥存在网关侧）；MiMo/OpenCode 不受影响，直连官方
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
 * @param type 指定提供者类型，如不指定则使用配置中的默认文本提供者
 */
export async function createAiProvider(type?: AiProviderType): Promise<AiProvider> {
  const { env } = getCloudflareContext();
  const config = await getConfig();

  const providerType = type || config.defaultTextProvider || config.defaultAiProvider;

  if (providerType === 'opencode') {
    const apiKey = env.OPENCODE_API_KEY || process.env.OPENCODE_API_KEY;
    if (!apiKey) {
      throw new Error('OPENCODE_API_KEY not configured');
    }
    return new OpencodeProvider(apiKey, { text: config.opencodeTextModel }, config.opencodeBaseUrl);
  }

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

  if (providerType === 'google') {
    return buildGoogleAiProvider(config, gatewayHeaders);
  }

  throw new Error(`Unsupported AI provider: ${providerType as string}`);
}

/**
 * 创建 Google AI 提供者
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
