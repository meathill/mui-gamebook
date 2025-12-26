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
} from './ai-provider';
import { buildMiniGamePrompt, extractMiniGameCode, MINIGAME_API_SPEC } from './ai';

export class OpenAiProvider implements AiProvider {
  readonly type = 'openai' as const;
  private client: OpenAI;

  constructor(
    apiKey: string,
    private models: {
      text?: string;
      image?: string;
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

  // OpenAI 目前不支持视频生成，这些方法不实现
  // startVideoGeneration 和 checkVideoGenerationStatus 将使用 Google AI

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

  async generateTTS(text: string, voiceName: string = 'alloy'): Promise<TTSResult> {
    console.log(`[OpenAI] Generating TTS with voice: ${voiceName}`);

    // OpenAI 支持的声音: alloy, echo, fable, onyx, nova, shimmer
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    const voice = validVoices.includes(voiceName) ? voiceName : 'alloy';

    const response = await this.client.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
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
