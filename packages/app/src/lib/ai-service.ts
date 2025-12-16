import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { AiUsageInfo } from '@mui-gamebook/core/lib/ai-provider';
import { createAiProvider, createGoogleAiProvider } from './ai-provider-factory';

export type { AiUsageInfo };

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
  model: string;
}

export async function generateAndUploadImage(prompt: string, fileName: string): Promise<GenerateImageResult> {
  const { env } = getCloudflareContext();

  // 使用 AI 提供者工厂创建提供者
  const provider = await createAiProvider();
  const { buffer, usage } = await provider.generateImage(prompt);

  // 上传到 R2
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) throw new Error("R2 Bucket 'ASSETS_BUCKET' not found");

  await bucket.put(fileName, buffer);

  // 返回公开 URL 和用量信息
  const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
  return {
    url: `${publicDomain}/${fileName}`,
    usage,
    model: provider.type,
  };
}

/**
 * 启动异步视频生成（不等待完成）
 * 返回 operation name，可用于后续检查状态
 * 注意：视频生成始终使用 Google AI，因为 OpenAI 不支持
 */
export async function startAsyncVideoGeneration(
  prompt: string,
  config?: { durationSeconds?: number; aspectRatio?: string },
): Promise<StartVideoGenerationResult> {
  // 视频生成始终使用 Google AI
  const provider = await createGoogleAiProvider();

  if (!provider.startVideoGeneration) {
    throw new Error('视频生成功能不可用');
  }

  const { operationName, usage } = await provider.startVideoGeneration(prompt, config);

  return {
    operationName,
    usage,
    model: 'google-video',
  };
}

/**
 * 检查视频生成状态并在完成时上传到 R2
 */
export async function checkAndCompleteVideoGeneration(
  operationName: string,
  fileName: string,
): Promise<CheckVideoStatusResult> {
  const { env } = getCloudflareContext();

  // 视频状态检查始终使用 Google AI
  const provider = await createGoogleAiProvider();

  if (!provider.checkVideoGenerationStatus) {
    throw new Error('视频状态检查功能不可用');
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

  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  const videoResponse = await fetch(status.uri, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey || '',
    },
  });
  const video = await videoResponse.arrayBuffer();

  await bucket.put(fileName, video, {
    httpMetadata: { contentType: 'video/mp4' },
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
): Promise<GenerateMiniGameResult> {
  const { env } = getCloudflareContext();

  // 使用 AI 提供者工厂
  const provider = await createAiProvider();
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
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  return {
    id: minigameId,
    url: `${baseUrl}/api/cms/minigames/${minigameId}`,
    usage,
    model: provider.type,
  };
}

/**
 * TTS 声音选项
 */
export type TTSVoiceName =
  | 'Aoede' // 温和女声
  | 'Kore' // 活泼女声
  | 'Puck' // 活泼男声
  | 'Charon' // 沉稳男声
  | 'Fenrir' // 深沉男声
  | 'Leda' // 温柔女声
  | 'Orus' // 自然男声
  | 'Zephyr'; // 中性声音

/**
 * 生成 TTS 语音并上传到 R2
 * 使用 Gemini TTS 模型
 */
export async function generateAndUploadTTS(
  text: string,
  fileName: string,
  voiceName: TTSVoiceName = 'Aoede',
): Promise<GenerateTTSResult> {
  const { env } = getCloudflareContext();

  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY_NEW not configured');
  }

  // 使用 @google/genai 生成 TTS
  const { GoogleGenAI } = await import('@google/genai');
  const genAI = new GoogleGenAI({ apiKey });

  // 为儿童故事添加朗读指导
  const enhancedText = `请用温柔、有表现力的方式朗读这段故事，语速稍慢，适合小朋友听：

${text}`;

  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: enhancedText }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) {
    throw new Error('TTS 生成失败：未返回音频数据');
  }

  const audioBuffer = Buffer.from(data, 'base64');

  // 上传到 R2
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) throw new Error("R2 Bucket 'ASSETS_BUCKET' not found");

  await bucket.put(fileName, audioBuffer, {
    httpMetadata: { contentType: 'audio/wav' },
  });

  const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
  return {
    url: `${publicDomain}/${fileName}`,
    model: 'gemini-2.5-flash-preview-tts',
  };
}
