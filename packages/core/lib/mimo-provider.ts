/**
 * 小米 MiMo 提供者实现
 * MiMo 提供 OpenAI 兼容协议，直接复用 OpenAiProvider 的文本/工具调用实现
 * 仅支持文本生成与 function calling，不支持图片/视频/TTS
 */

import type {
  AiUsageInfo,
  ImageGenerationResult,
  TextGenerationResult,
  TTSResult,
  VideoGenerationStartResult,
  VideoGenerationStatusResult,
} from './ai-provider';
import { OpenAiProvider } from './openai-provider';

/** MiMo Token Plan 订阅的默认 base URL（按量付费为 https://api.xiaomimimo.com/v1） */
export const MIMO_DEFAULT_BASE_URL = 'https://token-plan-cn.xiaomimimo.com/v1';

/** MiMo 默认文本模型 */
export const MIMO_DEFAULT_TEXT_MODEL = 'mimo-v2.5-pro';

export class MimoProvider extends OpenAiProvider {
  constructor(apiKey: string, models: { text?: string } = {}, baseURL: string = MIMO_DEFAULT_BASE_URL) {
    super(apiKey, { text: models.text || MIMO_DEFAULT_TEXT_MODEL }, { baseURL, type: 'mimo' });
  }

  /**
   * MiMo 不识别 OpenAI 专有的 reasoning_effort 参数，覆盖为纯净请求
   */
  async generateText(prompt: string, _options?: { thinking?: boolean }): Promise<TextGenerationResult> {
    const model = this.models.text || MIMO_DEFAULT_TEXT_MODEL;
    console.log(`[MiMo] Generating text with model: ${model}`);

    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
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

  async generateImage(): Promise<ImageGenerationResult> {
    throw new Error('MiMo 不支持图片生成');
  }

  async startVideoGeneration(): Promise<VideoGenerationStartResult> {
    throw new Error('MiMo 不支持视频生成');
  }

  async checkVideoGenerationStatus(): Promise<VideoGenerationStatusResult> {
    throw new Error('MiMo 不支持视频生成');
  }

  async generateTTS(): Promise<TTSResult> {
    throw new Error('MiMo 不支持 TTS 生成');
  }
}
