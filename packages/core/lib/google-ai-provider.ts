/**
 * Google GenAI 提供者实现
 */
import { GoogleGenAI, PartUnion, ThinkingLevel, Type } from '@google/genai';
import type {
  AiProvider,
  AiUsageInfo,
  ChatMessage,
  ChatWithToolsResult,
  FunctionCallResult,
  FunctionDeclaration,
  ImageGenerationResult,
  MiniGameGenerationResult,
  TextGenerationResult,
  TTSResult,
  VideoGenerationStartResult,
  VideoGenerationStatusResult,
} from './ai-provider';
import { buildMiniGamePrompt, MINIGAME_API_SPEC } from './ai';

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

    // 根据模型类型选择正确的思考配置
    // Gemini 2.5 使用 thinkingBudget，Gemini 3 使用 thinkingLevel
    const getThinkingConfig = () => {
      if (!options?.thinking) return undefined;

      // Gemini 2.5 系列使用 thinkingBudget
      if (model.includes('2.5')) {
        return {
          thinkingConfig: {
            thinkingBudget: 8192,
          },
        };
      }

      // Gemini 3 系列使用 thinkingLevel
      // 注意：MEDIUM 仅支持 Gemini 3 Flash，Gemini 3 Pro 只支持 LOW/HIGH
      const isFlash = model.toLowerCase().includes('flash');
      return {
        thinkingConfig: {
          thinkingLevel: (isFlash ? 'MEDIUM' : 'HIGH') as ThinkingLevel,
        },
      };
    };

    const response = await this.genAI.models.generateContent({
      model,
      contents: prompt as PartUnion,
      config: getThinkingConfig(),
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

  async generateImage(
    prompt: string,
    options?: { aspectRatio?: string; referenceImages?: string[] },
  ): Promise<ImageGenerationResult> {
    const model = this.models.image || 'gemini-3-pro-image-preview';
    console.log(`[Google AI] Generating image with model: ${model}`);

    // Google 支持的宽高比: 1:1, 2:3, 3:4, 4:5, 9:16, 16:9, 5:4, 4:3, 3:2, 21:9
    const aspectRatio = options?.aspectRatio || '1:1';

    // 构建内容：可能包含参考图片
    const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    // 如果有参考图片，添加到请求中
    if (options?.referenceImages && options.referenceImages.length > 0) {
      console.log(`[Google AI] Including ${options.referenceImages.length} reference image(s)`);

      for (const imageUrl of options.referenceImages) {
        try {
          // 下载图片
          const response = await fetch(imageUrl);
          if (!response.ok) {
            console.warn(`[Google AI] Failed to fetch reference image: ${imageUrl}`);
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString('base64');

          // 检测 MIME 类型
          const contentType = response.headers.get('content-type') || 'image/png';

          contents.push({
            inlineData: {
              mimeType: contentType,
              data: base64Data,
            },
          });
        } catch (e) {
          console.warn(`[Google AI] Failed to process reference image: ${imageUrl}`, e);
        }
      }

      // 添加提示词，要求保持角色一致性
      contents.push({
        text: `Generate an image based on the following description. Use the provided reference image(s) to maintain character consistency, ensuring the characters look identical to those in the reference images.\n\n${prompt}`,
      });
    } else {
      // 没有参考图片，直接使用提示词
      contents.push({ text: prompt });
    }

    const response = await this.genAI.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio,
        },
      },
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

    const systemPrompt = buildMiniGamePrompt(MINIGAME_API_SPEC, variables);

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

  async chatWithTools(messages: ChatMessage[], tools: FunctionDeclaration[]): Promise<ChatWithToolsResult> {
    const model = this.models.text || 'gemini-2.5-flash';
    console.log(`[Google AI] Chat with tools using model: ${model}`);

    // 转换消息格式为 Google AI 格式
    const contents = messages.map((msg) => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // 转换工具声明为 Google AI 格式
    // 使用类型断言因为我们的接口与 Google AI 的类型定义略有不同
    const functionDeclarations = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: Type.OBJECT,
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    })) as unknown as import('@google/genai').FunctionDeclaration[];

    const response = await this.genAI.models.generateContent({
      model,
      contents,
      config: {
        tools: [{ functionDeclarations }],
      },
    });

    const usage: AiUsageInfo = {
      promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      return { usage };
    }

    let text: string | undefined;
    const functionCalls: FunctionCallResult[] = [];

    for (const part of candidate.content.parts) {
      if (part.text) {
        text = part.text;
      }
      if (part.functionCall) {
        functionCalls.push({
          name: part.functionCall.name || '',
          args: (part.functionCall.args as Record<string, unknown>) || {},
        });
      }
    }

    return {
      text,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      usage,
    };
  }

  async generateTTS(text: string, voiceName: string = 'Aoede'): Promise<TTSResult> {
    console.log(`[Google AI] Generating TTS with voice: ${voiceName}`);

    // 为儿童故事添加朗读指导
    const enhancedText = `请用温柔、有表现力的方式朗读这段故事，语速稍慢，适合小朋友听：

${text}`;

    const response = await this.genAI.models.generateContent({
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

    return {
      buffer: Buffer.from(data, 'base64'),
      mimeType: 'audio/pcm',
    };
  }
}
