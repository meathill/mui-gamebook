import {GenerateVideosOperation, GoogleGenAI, Operations, PartUnion, ThinkingLevel} from "@google/genai";

/**
 * AI 用量信息
 */
export interface AiUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 图片生成结果
 */
export interface ImageGenerationResult {
  buffer: Buffer;
  type: string;
  usage: AiUsageInfo;
}

/**
 * 文本生成结果
 */
export interface TextGenerationResult {
  text: string;
  usage: AiUsageInfo;
}

/**
 * 视频生成结果（同步模式）
 */
export interface VideoGenerationResult {
  uri: string;
  usage: AiUsageInfo;
}

/**
 * 视频生成启动结果（异步模式）
 */
export interface VideoGenerationStartResult {
  operationName: string;
  usage: AiUsageInfo;
}

/**
 * Generates an image with Google AI.
 */
export async function generateImage(
  genAI: GoogleGenAI,
  model: string,
  prompt: string,
): Promise<ImageGenerationResult> {
  console.log(`[AI] Generating image for prompt: "${prompt}"`);
  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
  });

  // 提取用量信息
  const usage: AiUsageInfo = {
    promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
  };

  let buffer: Buffer;
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error('No candidates received from Google AI.');
  }

  const [candidate] = response.candidates;
  if (!candidate.content || !candidate.content.parts) {
    throw new Error('No content parts received from Google AI.');
  }
  for (const part of candidate.content.parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      if (!imageData) {
        continue;
      }
      buffer = Buffer.from(imageData, 'base64');
      return {
        type: part.inlineData.mimeType || '',
        buffer,
        usage,
      };
    }
  }
  throw new Error('No image data received from Google AI.');
}

export async function generateText(
  genAI: GoogleGenAI,
  model: string,
  prompt: String,
  thinking?: ThinkingLevel,
): Promise<TextGenerationResult> {
  console.log(`[AI] Generating text for prompt: "${prompt}"`);
  const response = await genAI.models.generateContent({
    model,
    contents: prompt as PartUnion,
    ...thinking && {
      config: {
        thinkingConfig: {
          thinkingLevel: thinking,
        },
      }
    },
  });

  // 提取用量信息
  const usage: AiUsageInfo = {
    promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
  };

  return {
    text: response.text || '',
    usage,
  };
}

/**
 * 启动视频生成（异步模式）
 * 返回 operation name，不等待完成
 */
export async function startVideoGeneration(
  genAI: GoogleGenAI,
  model: string,
  prompt: string,
  config?: {
    durationSeconds?: number;
    aspectRatio?: string;
  },
): Promise<VideoGenerationStartResult> {
  console.log(`[AI] Starting video generation for prompt: "${prompt}"`);

  // 发起视频生成请求
  const operation = await genAI.models.generateVideos({
    model,
    source: {
      prompt,
    },
    config: {
      numberOfVideos: 1,
      durationSeconds: config?.durationSeconds ?? 6,
      aspectRatio: config?.aspectRatio ?? '16:9',
    },
  });

  // 视频生成 API 没有提供 token 用量，使用估计值
  const usage: AiUsageInfo = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 50_000,
  };

  if (!operation.name) {
    throw new Error('无法获取操作名称');
  }

  return {
    operationName: operation.name,
    usage,
  };
}

/**
 * 检查视频生成状态
 * 返回生成状态和结果（如果完成）
 */
export async function checkVideoGenerationStatus(
  apiKey: string,
  operationName: string,
): Promise<{ done: boolean; uri?: string; error?: string }> {
  console.log(`[AI] Checking video generation status: ${operationName}`);

  const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-type': 'application/json',
        'x-goog-api-key': apiKey,
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      return {
        done: false,
        error: `HTTP error! status: ${response.status} ${errorText}`,
      }
    }

    const data = (await response.json()) as {
      done: boolean;
      response?: {
        generateVideoResponse: {
          generatedSamples: {
            video: { uri: string; }
          }[];
        };
      };
      metadata?: {
        progressPercent?: number;
      };
      error?: {
        message: string;
      };
    };
    // 2. 检查状态
    // API 返回的 JSON 结构中：
    // - "done": true 表示完成 (成功或失败)
    // - "error": 存在则表示失败
    // - "response": 存在则表示成功的返回值 (如果是视频，通常在 metadata 或 response 里有 uri)
    if (!data.done) {
      console.log("任务进行中... 进度:", data.metadata?.progressPercent || "未知");
      return { done: false };
    }

    if (data.error) {
      console.error("任务失败:", data.error);
      return { done: true, error: data.error.message || '视频生成失败' };
    }

    const videoUri = data.response?.generateVideoResponse.generatedSamples[0].video.uri;
    if (!videoUri) {
      return { done: true, error: '视频 URI 不存在' };
    }

    return { done: true, uri: videoUri };

  } catch (error) {
    return { done: false, error: '轮询请求出错' };
  }
}

/**
 * 生成视频（同步模式）
 * 视频生成是异步的，需要轮询直到完成
 */
export async function generateVideo(
  genAI: GoogleGenAI,
  model: string,
  prompt: string,
  config?: {
    durationSeconds?: number;
    aspectRatio?: string;
  },
): Promise<VideoGenerationResult> {
  console.log(`[AI] Generating video for prompt: "${prompt}"`);

  // 发起视频生成请求
  let operation = await genAI.models.generateVideos({
    model,
    source: {
      prompt,
    },
    config: {
      numberOfVideos: 1,
      durationSeconds: config?.durationSeconds ?? 5,
      aspectRatio: config?.aspectRatio ?? '16:9',
    },
  });

  // 轮询等待生成完成
  const maxWaitTime = 5 * 60 * 1000; // 最多等待 5 分钟
  const pollInterval = 10000; // 每 10 秒轮询一次
  const startTime = Date.now();

  while (!operation.done) {
    if (Date.now() - startTime > maxWaitTime) {
      throw new Error('视频生成超时');
    }
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    operation = await genAI.operations.getVideosOperation({ operation });
  }

  const generatedVideos = operation.response?.generatedVideos;
  if (!generatedVideos || generatedVideos.length === 0) {
    throw new Error('未能生成视频');
  }

  const videoUri = generatedVideos[0].video?.uri;
  if (!videoUri) {
    throw new Error('视频 URI 不存在');
  }

  // 视频生成 API 没有提供 token 用量，使用估计值
  const usage: AiUsageInfo = {
    promptTokens: prompt.length,
    completionTokens: 0,
    totalTokens: prompt.length,
  };

  return {
    uri: videoUri,
    usage,
  };
}
