import type { AiProviderType, AiUsageInfo } from '@mui-gamebook/core/lib/ai-provider';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  createAiProvider,
  createGoogleAiProvider,
  resolveImageVideoProviderType,
  resolveTtsProviderType,
} from './ai-provider-factory';
import { wrapWav } from './audio';

export type { AiUsageInfo };

/**
 * 根据 mimeType 获取对应的文件扩展名
 */
export function getExtensionForMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/wav': '.wav',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/ogg': '.ogg',
    'audio/pcm': '.wav', // PCM 会被转为 WAV
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
  };
  return mimeToExt[mimeType] || '';
}

/**
 * 修正文件名扩展名以匹配实际的 mimeType
 */
export function fixFileExtension(fileName: string, mimeType: string): string {
  const expectedExt = getExtensionForMimeType(mimeType);
  if (!expectedExt) return fileName;

  // 移除现有扩展名并添加正确的扩展名
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex > fileName.lastIndexOf('/')) {
    const baseName = fileName.substring(0, lastDotIndex);
    return baseName + expectedExt;
  }
  return fileName + expectedExt;
}

export interface GenerateImageResult {
  url: string;
  usage: AiUsageInfo;
  model: string;
}

export interface GenerateVideoResult {
  url: string;
  usage: AiUsageInfo;
  model: string;
}

export interface StartVideoGenerationResult {
  operationName: string;
  usage: AiUsageInfo;
  model: string;
}

export interface CheckVideoStatusResult {
  done: boolean;
  url?: string;
  error?: string;
}

export interface GenerateMiniGameResult {
  id: number;
  url: string;
  usage: AiUsageInfo;
  model: string;
}

export interface GenerateTTSResult {
  url: string;
  usage: AiUsageInfo;
  model: string;
}

export async function generateAndUploadImage(
  prompt: string,
  fileName: string,
  options?: {
    aspectRatio?: string;
    referenceImages?: string[];
  },
): Promise<GenerateImageResult> {
  const { env } = getCloudflareContext();

  // 图片生成只支持 Google/OpenAI，全局默认为 MiMo/Claude 时回退
  const provider = await createAiProvider(await resolveImageVideoProviderType());
  const { buffer, type, usage } = await provider.generateImage(prompt, {
    aspectRatio: options?.aspectRatio,
    referenceImages: options?.referenceImages,
  });

  // 根据实际 mimeType 修正文件扩展名
  const finalFileName = fixFileExtension(fileName, type);

  // 上传到 R2
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) throw new Error("R2 Bucket 'ASSETS_BUCKET' not found");

  await bucket.put(finalFileName, buffer, {
    httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
  });

  // 返回公开 URL 和用量信息
  const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
  return {
    url: `${publicDomain}/${finalFileName}`,
    usage,
    model: provider.type,
  };
}

/**
 * 启动异步视频生成（不等待完成）
 * 返回 operation name，可用于后续检查状态
 * 支持 Google AI 和 OpenAI (Sora)
 */
export async function startAsyncVideoGeneration(
  prompt: string,
  config?: { durationSeconds?: number; aspectRatio?: string },
): Promise<StartVideoGenerationResult> {
  // 视频生成只支持 Google/OpenAI，全局默认为 MiMo/Claude 时回退
  const provider = await createAiProvider(await resolveImageVideoProviderType());

  if (!provider.startVideoGeneration) {
    throw new Error('当前 AI 提供者不支持视频生成');
  }

  const { operationName, usage } = await provider.startVideoGeneration(prompt, config);

  return {
    operationName,
    usage,
    model: provider.type,
  };
}

/**
 * 检查视频生成状态并在完成时上传到 R2
 * @param operationName 操作名称/ID
 * @param fileName 上传到 R2 的文件名
 * @param providerType AI 提供者类型（从 operation 记录中获取）
 */
export async function checkAndCompleteVideoGeneration(
  operationName: string,
  fileName: string,
  providerType?: 'google' | 'openai',
): Promise<CheckVideoStatusResult> {
  const { env } = getCloudflareContext();

  // 根据 provider 类型创建对应的 provider
  const provider = await createAiProvider(providerType);

  if (!provider.checkVideoGenerationStatus) {
    throw new Error('当前 AI 提供者不支持视频状态检查');
  }

  const status = await provider.checkVideoGenerationStatus(operationName);

  if (!status.done) {
    return { done: false };
  }

  if (status.error) {
    return { done: true, error: status.error };
  }

  if (!status.uri) {
    return { done: true, error: '视频 URI 不存在' };
  }

  // 下载视频并上传到 R2
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) throw new Error("R2 Bucket 'ASSETS_BUCKET' not found");

  // 下载生成完成的视频文件：这是对 Google/OpenAI 存储的直接请求，不经过 AI Gateway
  // （Gateway 只代理生成调用本身，不代理响应里返回的资源下载链接），因此仍需要真实的
  // provider key。GOOGLE_API_KEY/OPENAI_API_KEY 不再是必需的 app secret（生成调用走
  // Gateway 的 BYOK），只有需要下载视频时才用得到；未配置时下载会因鉴权失败报错。
  const headers: Record<string, string> = {};
  if (providerType === 'google' || !providerType) {
    const apiKey = process.env.GOOGLE_API_KEY;
    headers['x-goog-api-key'] = apiKey || '';
  } else if (providerType === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const videoResponse = await fetch(status.uri, {
    method: 'GET',
    headers,
  });
  const video = await videoResponse.arrayBuffer();

  await bucket.put(fileName, video, {
    httpMetadata: { contentType: 'video/mp4', cacheControl: 'public, max-age=31536000, immutable' },
  });

  const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
  return {
    done: true,
    url: `${publicDomain}/${fileName}`,
  };
}

/**
 * 生成小游戏并存储到数据库
 */
export async function generateAndStoreMiniGame(
  prompt: string,
  ownerId: string,
  name: string,
  variables?: Record<string, string>,
  providerType?: AiProviderType,
): Promise<GenerateMiniGameResult> {
  const { env } = getCloudflareContext();

  // 使用 AI 提供者工厂（可按用户权限指定提供者）
  const provider = await createAiProvider(providerType);
  const { code, usage } = await provider.generateMiniGame(prompt, variables);

  // 存储到数据库
  const DB = env.DB;
  if (!DB) throw new Error('数据库未配置');

  const now = Date.now();
  const result = await DB.prepare(`
    INSERT INTO Minigames (owner_id, name, prompt, code, variables, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)
  `)
    .bind(ownerId, name, prompt, code, variables ? JSON.stringify(Object.keys(variables)) : null, now, now)
    .run();

  const minigameId = result.meta.last_row_id as number;

  // 返回访问 URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  return {
    id: minigameId,
    url: `${baseUrl}/api/cms/minigames/${minigameId}`,
    usage,
    model: provider.type,
  };
}

/**
 * TTS 声音选项（从 core 配置派生）
 */
import {
  GOOGLE_VOICE_IDS,
  OPENAI_VOICE_IDS,
  MIMO_VOICE_IDS,
  getDefaultVoice,
} from '@mui-gamebook/core/lib/voice-config';
export type TTSVoiceName =
  | (typeof GOOGLE_VOICE_IDS)[number]
  | (typeof OPENAI_VOICE_IDS)[number]
  | (typeof MIMO_VOICE_IDS)[number];

const DEFAULT_SAMPLE_RATE = 24000;

/**
 * 生成 TTS 语音并上传到 R2
 * 支持 Google、OpenAI、MiMo 三家 TTS，走独立于文本生成的 defaultTtsProvider 配置
 * 会根据实际生成的音频格式自动修正文件扩展名
 */
export async function generateAndUploadTTS(
  text: string,
  fileName: string,
  voiceName?: TTSVoiceName,
): Promise<GenerateTTSResult> {
  const { env } = getCloudflareContext();

  const ttsProviderType = await resolveTtsProviderType();
  const provider = await createAiProvider(ttsProviderType);

  // 检查 provider 是否支持 TTS
  if (!provider.generateTTS) {
    throw new Error('当前 AI 提供者不支持 TTS');
  }

  // 未指定音色时按当前 TTS 提供者取默认音色，而不是写死某一家的音色 ID
  const result = await provider.generateTTS(text, voiceName || getDefaultVoice(ttsProviderType));

  // 处理音频数据
  let audioBuffer: Buffer;
  let contentType: string;

  if (result.mimeType === 'audio/pcm') {
    // Google 返回的是 PCM，需要转换为 WAV
    audioBuffer = wrapWav(result.buffer, DEFAULT_SAMPLE_RATE);
    contentType = 'audio/wav';
  } else {
    // OpenAI 返回的是 MP3
    audioBuffer = result.buffer;
    contentType = result.mimeType;
  }

  // 根据实际 mimeType 修正文件扩展名
  const finalFileName = fixFileExtension(fileName, contentType);

  // 上传到 R2
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) throw new Error("R2 Bucket 'ASSETS_BUCKET' not found");

  await bucket.put(finalFileName, audioBuffer, {
    httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
  });

  const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;

  // Google/OpenAI/MiMo 的 TTS 响应都不暴露可靠的 token 用量，用输入文本长度做估算，
  // 确保 TTS 生成至少会计入每日用量限额（此前完全不记账，是持续发生的计费缺口）。
  // 这不是精确的计费口径，如果某个 provider 之后能拿到真实用量，再替换成真实值。
  const usage: AiUsageInfo = {
    promptTokens: text.length,
    completionTokens: 0,
    totalTokens: text.length,
  };

  return {
    url: `${publicDomain}/${finalFileName}`,
    usage,
    model: provider.type,
  };
}
