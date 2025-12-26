/**
 * OpenAI 提供者实现
 */
import OpenAI from 'openai';
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
import { buildMiniGamePrompt, extractMiniGameCode, MINIGAME_API_SPEC } from './ai';

export class OpenAiProvider implements AiProvider {
  readonly type = 'openai' as const;
  private client: OpenAI;

  constructor(
    private apiKey: string,
    private models: {
      text?: string;
      image?: string;
      video?: string;
      tts?: string;
    } = {},
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async generateText(prompt: string, options?: { thinking?: boolean }): Promise<TextGenerationResult> {
    const model = this.models.text || 'gpt-4o';
    console.log(`[OpenAI] Generating text with model: ${model}`);

    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      ...(options?.thinking && { reasoning_effort: 'medium' }),
    });

    const usage: AiUsageInfo = {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    return {
      text: response.choices[0]?.message?.content || '',
      usage,
    };
  }

  async generateImage(
    prompt: string,
    options?: { aspectRatio?: string; referenceImages?: string[] },
  ): Promise<ImageGenerationResult> {
    const model = this.models.image || 'gpt-image-1';
    console.log(`[OpenAI] Generating image with model: ${model}`);

    // OpenAI 支持的宽高比: 3:2, 1:1, 2:3
    // 需要映射到对应的 size 参数
    const aspectRatio = options?.aspectRatio || '1:1';
    const sizeMap: Record<string, string> = {
      '3:2': '1536x1024',
      '1:1': '1024x1024',
      '2:3': '1024x1536',
    };
    const size = sizeMap[aspectRatio] || '1024x1024';

    let imageData: string | undefined;

    // 如果有参考图片，使用 edit API 进行图生图
    if (options?.referenceImages && options.referenceImages.length > 0) {
      console.log(`[OpenAI] Including ${options.referenceImages.length} reference image(s) for edit`);

      // 下载第一张参考图片作为输入
      const referenceUrl = options.referenceImages[0];
      try {
        const imgResponse = await fetch(referenceUrl);
        if (!imgResponse.ok) {
          throw new Error(`Failed to fetch reference image: ${referenceUrl}`);
        }

        const arrayBuffer = await imgResponse.arrayBuffer();

        // 使用 images.edit API
        const response = await this.client.images.edit({
          model,
          image: new File([arrayBuffer], 'reference.png', { type: 'image/png' }),
          prompt: `Based on the reference image, ${prompt}`,
          n: 1,
          size: size as '1024x1024' | '1536x1024' | '1024x1536',
          output_format: 'webp',
        });

        imageData = response.data?.[0]?.b64_json;
      } catch (e) {
        console.warn(`[OpenAI] Failed to use reference image, falling back to generation: ${e}`);
        // 失败时回退到普通生成
        const response = await this.client.images.generate({
          model,
          prompt,
          n: 1,
          size: size as '1024x1024' | '1536x1024' | '1024x1536',
          output_format: 'webp',
        });
        imageData = response.data?.[0]?.b64_json;
      }
    } else {
      const response = await this.client.images.generate({
        model,
        moderation: 'low',
        prompt,
        n: 1,
        size: size as '1024x1024' | '1536x1024' | '1024x1536',
        output_format: 'webp',
      });
      imageData = response.data?.[0]?.b64_json;
    }

    if (!imageData) {
      throw new Error('No image data received from OpenAI.');
    }

    // OpenAI 图片生成没有直接的 token 用量，使用估计值
    const usage: AiUsageInfo = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 10_000,
    };

    return {
      type: 'image/png',
      buffer: Buffer.from(imageData, 'base64'),
      usage,
    };
  }

  /**
   * 启动视频生成（使用 Sora API）
   */
  async startVideoGeneration(
    prompt: string,
    config?: { durationSeconds?: number; aspectRatio?: string },
  ): Promise<VideoGenerationStartResult> {
    const model = this.models.video || 'sora-2';
    console.log(`[OpenAI] Starting video generation with model: ${model}`);

    // 映射宽高比到分辨率
    const aspectRatio = config?.aspectRatio || '16:9';
    const resolutionMap: Record<string, '480p' | '720p' | '1080p'> = {
      '16:9': '720p',
      '9:16': '720p',
      '1:1': '720p',
    };
    const resolution = resolutionMap[aspectRatio] || '720p';

    // 调用 Sora API 创建视频生成任务
    const response = await fetch('https://api.openai.com/v1/videos/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: resolution,
        duration: config?.durationSeconds ?? 5,
        aspect_ratio: aspectRatio,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI 视频生成请求失败: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as { id: string };

    if (!data.id) {
      throw new Error('无法获取视频生成任务 ID');
    }

    return {
      operationName: data.id,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 100_000, // Sora 视频生成估算用量
      },
    };
  }

  /**
   * 检查视频生成状态
   */
  async checkVideoGenerationStatus(operationName: string): Promise<VideoGenerationStatusResult> {
    console.log(`[OpenAI] Checking video generation status: ${operationName}`);

    try {
      // 查询视频生成状态
      const response = await fetch(`https://api.openai.com/v1/videos/generations/${operationName}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          done: false,
          error: `HTTP error: ${response.status} ${errorText}`,
        };
      }

      const data = (await response.json()) as {
        status: 'queued' | 'in_progress' | 'completed' | 'failed';
        output_url?: string;
        error?: { message: string };
      };

      if (data.status === 'completed' && data.output_url) {
        return {
          done: true,
          uri: data.output_url,
        };
      }

      if (data.status === 'failed') {
        return {
          done: true,
          error: data.error?.message || '视频生成失败',
        };
      }

      // queued 或 in_progress
      console.log(`[OpenAI] 视频生成状态: ${data.status}`);
      return { done: false };
    } catch (error) {
      console.error('[OpenAI] 检查视频状态失败:', error);
      return { done: false, error: '轮询请求出错' };
    }
  }

  async generateMiniGame(prompt: string, variables?: Record<string, string>): Promise<MiniGameGenerationResult> {
    const model = this.models.text || 'gpt-4o';
    console.log(`[OpenAI] Generating minigame with model: ${model}`);

    const systemPrompt = buildMiniGamePrompt(MINIGAME_API_SPEC, variables);

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `游戏需求：${prompt}` },
      ],
    });

    const usage: AiUsageInfo = {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    let code = response.choices[0]?.message?.content || '';
    code = extractMiniGameCode(code);

    if (!code) {
      throw new Error('AI 未返回有效的游戏代码');
    }

    return { code, usage };
  }

  async chatWithTools(messages: ChatMessage[], tools: FunctionDeclaration[]): Promise<ChatWithToolsResult> {
    const model = this.models.text || 'gpt-4o';
    console.log(`[OpenAI] Chat with tools using model: ${model}`);

    // 转换消息格式为 OpenAI 格式
    const openaiMessages = messages.map((msg) => ({
      role: msg.role === 'model' ? ('assistant' as const) : ('user' as const),
      content: msg.content,
    }));

    // 转换工具声明为 OpenAI 格式
    const openaiTools = tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const response = await this.client.chat.completions.create({
      model,
      messages: openaiMessages,
      tools: openaiTools,
    });

    const usage: AiUsageInfo = {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    const choice = response.choices[0];
    if (!choice) {
      return { usage };
    }

    const text = choice.message?.content || undefined;
    const toolCalls = choice.message?.tool_calls;
    let functionCalls: FunctionCallResult[] | undefined;

    if (toolCalls && toolCalls.length > 0) {
      functionCalls = toolCalls
        .filter((tc): tc is typeof tc & { function: { name: string; arguments: string } } => 'function' in tc)
        .map((tc) => ({
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
        }));
    }

    return {
      text,
      functionCalls,
      usage,
    };
  }

  async generateTTS(text: string, voiceName: string = 'marin'): Promise<TTSResult> {
    const model = this.models.tts || 'gpt-4o-mini-tts';
    console.log(`[OpenAI] Generating TTS with model: ${model}, voice: ${voiceName}`);

    // 使用 voice-config 中的配置，不再硬编码
    const { OPENAI_VOICE_IDS, DEFAULT_OPENAI_VOICE } = await import('./voice-config');
    const voice = OPENAI_VOICE_IDS.includes(voiceName) ? voiceName : DEFAULT_OPENAI_VOICE;

    const response = await this.client.audio.speech.create({
      model,
      voice,
      input: text,
      response_format: 'mp3',
    });

    const arrayBuffer = await response.arrayBuffer();

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: 'audio/mpeg',
    };
  }
}
