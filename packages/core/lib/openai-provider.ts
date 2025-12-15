/**
 * OpenAI 提供者实现
 */
import OpenAI from 'openai';
import type {
  AiProvider,
  AiUsageInfo,
  ImageGenerationResult,
  MiniGameGenerationResult,
  TextGenerationResult,
} from './ai-provider';
import { buildMiniGamePrompt } from './ai-provider';
import { extractMiniGameCode, MINIGAME_API_SPEC } from './ai';

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
      ...(options?.thinking && { max_completion_tokens: 16000 }),
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

  async generateImage(prompt: string): Promise<ImageGenerationResult> {
    const model = this.models.image || 'gpt-image-1';
    console.log(`[OpenAI] Generating image with model: ${model}`);

    const response = await this.client.images.generate({
      model,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    });

    const imageData = response.data?.[0]?.b64_json;
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
}
