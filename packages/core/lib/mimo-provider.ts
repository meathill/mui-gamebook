/**
 * 小米 MiMo 提供者实现
 * MiMo 提供 OpenAI 兼容协议，直接复用 OpenAiProvider 的文本/工具调用实现
 * 支持文本生成、function calling 与 TTS；不支持图片/视频
 */

import type {
  AiUsageInfo,
  ImageGenerationResult,
  TextGenerationResult,
  TextStreamChunk,
  TTSResult,
  VideoGenerationStartResult,
  VideoGenerationStatusResult,
} from './ai-provider';
import { OpenAiProvider } from './openai-provider';

/** MiMo Token Plan 订阅的默认 base URL（按量付费为 https://api.xiaomimimo.com/v1） */
export const MIMO_DEFAULT_BASE_URL = 'https://token-plan-cn.xiaomimimo.com/v1';

/** MiMo 默认文本模型（正式生成用，支持深度思考） */
export const MIMO_DEFAULT_TEXT_MODEL = 'mimo-v2.5-pro';

/** MiMo 轻量文本模型：用于"故事信息是否已足够清晰"这类快速判断/追问生成，不用于正式剧本生成 */
export const MIMO_FAST_TEXT_MODEL = 'mimo-v2.5';

/** MiMo 默认 TTS 模型（预置音色版本，另有 -voicedesign/-voiceclone 变体本类暂不支持） */
export const MIMO_DEFAULT_TTS_MODEL = 'mimo-v2.5-tts';

interface MimoChatAudioResponse {
  choices?: Array<{
    message?: {
      audio?: { data?: string };
    };
  }>;
}

interface MimoChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface MimoStreamChunk {
  choices?: Array<{
    delta?: {
      reasoning_content?: string;
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class MimoProvider extends OpenAiProvider {
  constructor(apiKey: string, models: { text?: string; tts?: string } = {}, baseURL: string = MIMO_DEFAULT_BASE_URL) {
    super(apiKey, { text: models.text || MIMO_DEFAULT_TEXT_MODEL, tts: models.tts }, { baseURL, type: 'mimo' });
  }

  /**
   * MiMo 不识别 OpenAI 专有的 reasoning_effort 参数，思考开关走自己的
   * `thinking.type` 字段（OpenAI SDK 的类型不认识这个字段），所以这里和
   * generateTTS 一样绕开 SDK 直接裸 fetch，方便控制请求体的确切形状。
   * mimo-v2.5-pro 默认开启深度思考，官方文档建议复杂任务配合流式输出
   * 使用（见 generateTextStream），这里的非流式版本仅用于短小、不需要
   * 实时反馈的调用（如追问/评估）。
   * 不传 maxOutputTokens 时不设上限：正式剧本生成是一次性的，没有"继续"
   * 机制，截断比等久一点更糟；只有明确要限制输出的短调用才应该传这个参数。
   */
  async generateText(
    prompt: string,
    options?: { thinking?: boolean; maxOutputTokens?: number; model?: string },
  ): Promise<TextGenerationResult> {
    const model = options?.model || this.models.text || MIMO_DEFAULT_TEXT_MODEL;
    console.log(`[MiMo] Generating text with model: ${model}`);

    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...this.gatewayHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        thinking: { type: options?.thinking === false ? 'disabled' : 'enabled' },
        ...(options?.maxOutputTokens !== undefined && { max_completion_tokens: options.maxOutputTokens }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiMo 生成请求失败: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as MimoChatCompletionResponse;

    const usage: AiUsageInfo = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    };

    return {
      text: data.choices?.[0]?.message?.content || '',
      usage,
    };
  }

  /**
   * 流式生成文本。思考内容（reasoning_content）与正文（content）依次到达，
   * 只要持续有字节输出，Cloudflare 边缘就不会因空闲而判定 524 超时。
   * 同样默认不设 max_completion_tokens 上限，理由见 generateText 注释。
   */
  async *generateTextStream(
    prompt: string,
    options?: { thinking?: boolean; maxOutputTokens?: number; model?: string },
  ): AsyncGenerator<TextStreamChunk, TextGenerationResult, void> {
    const model = options?.model || this.models.text || MIMO_DEFAULT_TEXT_MODEL;
    console.log(`[MiMo] Streaming text with model: ${model}`);

    const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...this.gatewayHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        thinking: { type: options?.thinking === false ? 'disabled' : 'enabled' },
        ...(options?.maxOutputTokens !== undefined && { max_completion_tokens: options.maxOutputTokens }),
        stream: true,
        // 不带这个流式响应里拿不到 usage，会导致用量统计静默失真
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiMo 生成请求失败: ${response.status} ${errorText}`);
    }

    let text = '';
    const usage: AiUsageInfo = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    for await (const chunk of this.parseSseLines(response)) {
      const typedChunk = chunk as MimoStreamChunk;
      const delta = typedChunk.choices?.[0]?.delta;

      if (delta?.reasoning_content) {
        yield { type: 'reasoning', delta: delta.reasoning_content };
      }
      if (delta?.content) {
        text += delta.content;
        yield { type: 'content', delta: delta.content };
      }
      if (typedChunk.usage) {
        usage.promptTokens = typedChunk.usage.prompt_tokens ?? 0;
        usage.completionTokens = typedChunk.usage.completion_tokens ?? 0;
        usage.totalTokens = typedChunk.usage.total_tokens ?? 0;
      }
    }

    return { text, usage };
  }

  /**
   * 解析 SSE 响应体，逐条 yield 已解析的 JSON data 行
   * （fetch 读到的字节块可能在行中间断开，需要自行做行缓冲）
   */
  private async *parseSseLines(response: Response): AsyncGenerator<Record<string, unknown>, void, void> {
    if (!response.body) {
      throw new Error('MiMo 流式响应缺少响应体');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          yield JSON.parse(payload) as Record<string, unknown>;
        } catch (e) {
          console.warn('[MiMo] 解析流式响应失败:', e, payload);
        }
      }
    }
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
