/**
 * 小米 MiMo 提供者实现
 * MiMo 提供 OpenAI 兼容协议，直接复用 OpenAiProvider 的文本/工具调用实现
 * 支持文本生成、function calling 与 TTS；不支持图片/视频
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

/** MiMo 默认 TTS 模型（预置音色版本，另有 -voicedesign/-voiceclone 变体本类暂不支持） */
export const MIMO_DEFAULT_TTS_MODEL = 'mimo-v2.5-tts';

interface MimoChatAudioResponse {
  choices?: Array<{
    message?: {
      audio?: { data?: string };
    };
  }>;
}

export class MimoProvider extends OpenAiProvider {
  constructor(apiKey: string, models: { text?: string; tts?: string } = {}, baseURL: string = MIMO_DEFAULT_BASE_URL) {
    super(apiKey, { text: models.text || MIMO_DEFAULT_TEXT_MODEL, tts: models.tts }, { baseURL, type: 'mimo' });
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

  /**
   * MiMo 的 TTS 走 /chat/completions（不是标准的 /audio/speech），目标文本放在
   * assistant 角色消息里，通过 audio 字段指定音色与输出格式，响应里的音频是
   * base64 编码。协议细节来自第三方文档镜像交叉核对，未能拿到官方站点渲染后的
   * 原始文档，接入后请用真实 key 冒烟验证。
   */
  async generateTTS(text: string, voiceName: string = 'mimo_default'): Promise<TTSResult> {
    const model = this.models.tts || MIMO_DEFAULT_TTS_MODEL;
    console.log(`[MiMo] Generating TTS with model: ${model}, voice: ${voiceName}`);

    const { MIMO_VOICE_IDS, DEFAULT_MIMO_VOICE } = await import('./voice-config');
    const voice = MIMO_VOICE_IDS.includes(voiceName) ? voiceName : DEFAULT_MIMO_VOICE;

    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...this.gatewayHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'assistant', content: text }],
        audio: { format: 'wav', voice },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiMo TTS 请求失败: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as MimoChatAudioResponse;
    const base64Audio = data.choices?.[0]?.message?.audio?.data;
    if (!base64Audio) {
      throw new Error('MiMo TTS 未返回音频数据');
    }

    return {
      buffer: Buffer.from(base64Audio, 'base64'),
      mimeType: 'audio/wav',
    };
  }
}
