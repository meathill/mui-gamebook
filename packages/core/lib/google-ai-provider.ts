/**
 * Google GenAI 提供者实现
 */
import { GoogleGenAI, PartUnion, ThinkingLevel } from '@google/genai';
import type {
  AiProvider,
  AiUsageInfo,
  ImageGenerationResult,
  MiniGameGenerationResult,
  TextGenerationResult,
  VideoGenerationStartResult,
  VideoGenerationStatusResult,
} from './ai-provider';
import { MINIGAME_API_SPEC } from './ai';

export class GoogleAiProvider implements AiProvider {
  readonly type = 'google' as const;

  constructor(
    private genAI: GoogleGenAI,
    private apiKey: string,
    private models: {
      text?: string;
      image?: string;
      video?: string;
    } = {},
  ) {}

  async generateText(prompt: string, options?: { thinking?: boolean }): Promise<TextGenerationResult> {
    const model = this.models.text || 'gemini-2.5-flash';
    console.log(`[Google AI] Generating text with model: ${model}`);

    const response = await this.genAI.models.generateContent({
      model,
      contents: prompt as PartUnion,
      ...(options?.thinking && {
        config: {
          thinkingConfig: {
            thinkingLevel: 'MEDIUM' as ThinkingLevel,
          },
        },
      }),
    });

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

  async generateImage(prompt: string): Promise<ImageGenerationResult> {
    const model = this.models.image || 'gemini-3-pro-image-preview';
    console.log(`[Google AI] Generating image with model: ${model}`);

    const response = await this.genAI.models.generateContent({
      model,
      contents: prompt,
    });

    const usage: AiUsageInfo = {
      promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No candidates received from Google AI.');
    }

    const [candidate] = response.candidates;
    if (!candidate.content || !candidate.content.parts) {
      throw new Error('No content parts received from Google AI.');
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        if (imageData) {
          return {
            type: part.inlineData.mimeType || 'image/png',
            buffer: Buffer.from(imageData, 'base64'),
            usage,
          };
        }
      }
    }

    throw new Error('No image data received from Google AI.');
  }

  async startVideoGeneration(
    prompt: string,
    config?: { durationSeconds?: number; aspectRatio?: string },
  ): Promise<VideoGenerationStartResult> {
    const model = this.models.video || 'veo-3.1-fast-generate-preview';
    console.log(`[Google AI] Starting video generation with model: ${model}`);

    const operation = await this.genAI.models.generateVideos({
      model,
      source: { prompt },
      config: {
        numberOfVideos: 1,
        durationSeconds: config?.durationSeconds ?? 6,
        aspectRatio: config?.aspectRatio ?? '16:9',
      },
    });

    if (!operation.name) {
      throw new Error('无法获取操作名称');
    }

    return {
      operationName: operation.name,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 50_000,
      },
    };
  }

  async checkVideoGenerationStatus(operationName: string): Promise<VideoGenerationStatusResult> {
    console.log(`[Google AI] Checking video generation status: ${operationName}`);

    const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Content-type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          done: false,
          error: `HTTP error! status: ${response.status} ${errorText}`,
        };
      }

      const data = (await response.json()) as {
        done: boolean;
        response?: {
          generateVideoResponse: {
            generatedSamples: {
              video: { uri: string };
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

      if (!data.done) {
        console.log('任务进行中... 进度:', data.metadata?.progressPercent || '未知');
        return { done: false };
      }

      if (data.error) {
        console.error('任务失败:', data.error);
        return { done: true, error: data.error.message || '视频生成失败' };
      }

      const videoUri = data.response?.generateVideoResponse.generatedSamples[0].video.uri;
      if (!videoUri) {
        return { done: true, error: '视频 URI 不存在' };
      }

      return { done: true, uri: videoUri };
    } catch {
      return { done: false, error: '轮询请求出错' };
    }
  }

  async generateMiniGame(prompt: string, variables?: Record<string, string>): Promise<MiniGameGenerationResult> {
    const model = this.models.text || 'gemini-2.5-flash';
    console.log(`[Google AI] Generating minigame with model: ${model}`);

    const variablesList = variables
      ? Object.entries(variables)
          .map(([key, desc]) => `- ${key}: ${desc}`)
          .join('\n')
      : '无特定变量';

    const systemPrompt = `你是一个专业的 JavaScript 游戏开发者。你需要生成一个简单的互动小游戏。

要求：
1. 生成的代码必须是一个 ES Module，导出默认对象实现以下接口：
${MINIGAME_API_SPEC}

2. 游戏必须是简单的，不依赖任何外部库
3. 使用原生 Canvas 或 DOM 操作
4. 游戏应该在 container 元素内渲染
5. 游戏结束时调用 onComplete 回调，传入修改后的变量
6. destroy 方法必须清理所有事件监听器和定时器

可用的变量：
${variablesList}

只输出 JavaScript 代码，不要包含 markdown 代码块标记。代码必须可以直接作为 ES Module 执行。`;

    const response = await this.genAI.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: `游戏需求：${prompt}` }] },
      ],
    });

    const usage: AiUsageInfo = {
      promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    let code = response.text || '';
    code = code
      .replace(/^```(?:javascript|js)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    if (!code) {
      throw new Error('AI 未返回有效的游戏代码');
    }

    return { code, usage };
  }
}
