import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GoogleGenAI } from '@google/genai';
import { generateImage, startVideoGeneration, checkVideoGenerationStatus, generateMiniGame, type AiUsageInfo } from '@mui-gamebook/core/lib/ai';

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

export async function generateAndUploadImage(prompt: string, fileName: string): Promise<GenerateImageResult> {
  const { env } = getCloudflareContext();

  // 1. Generate
  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  if (!apiKey) throw new Error('GOOGLE_API_KEY_NEW not configured');

  const genAI = new GoogleGenAI({
    apiKey: apiKey,
  });
  const model = env.GOOGLE_IMAGE_MODEL || process.env.GOOGLE_IMAGE_MODEL || 'gemini-3-pro-image-preview';
  const { buffer, usage } = await generateImage(genAI, model, prompt);

  // 2. Upload to R2
  const bucket = env.ASSETS_BUCKET;
  if (!bucket) throw new Error('R2 Bucket \'ASSETS_BUCKET\' not found');

  await bucket.put(fileName, buffer);

  // 3. Return Public URL and usage info
  const publicDomain = env.ASSETS_PUBLIC_DOMAIN || process.env.ASSETS_PUBLIC_DOMAIN;
  return {
    url: `${publicDomain}/${fileName}`,
    usage,
    model,
  };
}

/**
 * 启动异步视频生成（不等待完成）
 * 返回 operation name，可用于后续检查状态
 */
export async function startAsyncVideoGeneration(
  prompt: string,
  config?: { durationSeconds?: number; aspectRatio?: string },
): Promise<StartVideoGenerationResult> {
  const { env } = getCloudflareContext();

  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  if (!apiKey) throw new Error('GOOGLE_API_KEY_NEW not configured');

  const genAI = new GoogleGenAI({ apiKey });
  const model = env.GOOGLE_VIDEO_MODEL || process.env.GOOGLE_VIDEO_MODEL || 'veo-3.1-fast-generate-preview';
  const { operationName, usage } = await startVideoGeneration(genAI, model, prompt, config);

  return {
    operationName,
    usage,
    model,
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

  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  if (!apiKey) throw new Error('GOOGLE_API_KEY_NEW not configured');

  const status = await checkVideoGenerationStatus(apiKey, operationName);

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
  if (!bucket) throw new Error('R2 Bucket \'ASSETS_BUCKET\' not found');

  const videoResponse = await fetch(status.uri as string, {
    method: 'GET',
    headers: {
      'x-goog-api-key': env.GOOGLE_API_KEY
    }
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

  const apiKey = env.GOOGLE_API_KEY_NEW || process.env.GOOGLE_API_KEY_NEW;
  if (!apiKey) throw new Error('GOOGLE_API_KEY_NEW not configured');

  const genAI = new GoogleGenAI({ apiKey });
  const model = env.GOOGLE_TEXT_MODEL || process.env.GOOGLE_TEXT_MODEL || 'gemini-2.5-flash';
  
  const { code, usage } = await generateMiniGame(genAI, model, prompt, variables);

  // 存储到数据库
  const DB = env.DB;
  if (!DB) throw new Error('数据库未配置');

  const now = Date.now();
  const result = await DB.prepare(`
    INSERT INTO Minigames (owner_id, name, prompt, code, variables, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)
  `).bind(
    ownerId,
    name,
    prompt,
    code,
    variables ? JSON.stringify(Object.keys(variables)) : null,
    now,
    now
  ).run();

  const minigameId = result.meta.last_row_id as number;

  // 返回访问 URL
  const baseUrl = env.BASE_URL || process.env.BASE_URL || '';
  return {
    id: minigameId,
    url: `${baseUrl}/api/cms/minigames/${minigameId}`,
    usage,
    model,
  };
}
