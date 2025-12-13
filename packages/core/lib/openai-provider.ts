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
import { MINIGAME_API_SPEC } from './ai';

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

    const imageData = response.data[0]?.b64_json;
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

    const variablesList = variables
      ? Object.entries(variables).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')
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
    code = code.replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '').trim();

    if (!code) {
      throw new Error('AI 未返回有效的游戏代码');
    }

    return { code, usage };
  }
}
