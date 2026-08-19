/**
 * OpenCode Go 提供者实现
 * 采用 OpenAI 兼容协议接入，专注于高质量代码与文本生成（如 DeepSeek V4 Flash / Pro 模型）
 * 支持文本生成、流式响应（含 DeepSeek 思考过程）、工具调用与小游戏生成
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

export const OPENCODE_DEFAULT_BASE_URL = 'https://opencode.ai/zen/go/v1';
export const OPENCODE_DEFAULT_TEXT_MODEL = 'deepseek-v4-flash';

interface OpenCodeChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface OpenCodeStreamChunk {
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

export class OpencodeProvider extends OpenAiProvider {
  constructor(
    apiKey: string,
    models: { text?: string } = {},
    baseURL: string = OPENCODE_DEFAULT_BASE_URL,
    headers: Record<string, string> = {},
  ) {
    super(apiKey, { text: models.text || OPENCODE_DEFAULT_TEXT_MODEL }, { baseURL, type: 'opencode', headers });
  }

  async generateText(
    prompt: string,
    options?: { thinking?: boolean; maxOutputTokens?: number; model?: string },
  ): Promise<TextGenerationResult> {
    const model = options?.model || this.models.text || OPENCODE_DEFAULT_TEXT_MODEL;
    console.log(`[OpenCode] Generating text with model: ${model}`);

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
        ...(options?.maxOutputTokens !== undefined && { max_tokens: options.maxOutputTokens }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenCode 生成请求失败: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as OpenCodeChatCompletionResponse;
    const choice = data.choices?.[0];

    const usage: AiUsageInfo = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    };

    return {
      text: choice?.message?.content || '',
      usage,
    };
  }

  async *generateTextStream(
    prompt: string,
    options?: { thinking?: boolean; maxOutputTokens?: number; model?: string },
  ): AsyncGenerator<TextStreamChunk, TextGenerationResult, void> {
    const model = options?.model || this.models.text || OPENCODE_DEFAULT_TEXT_MODEL;
    console.log(`[OpenCode] Streaming text with model: ${model}`);

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
        ...(options?.maxOutputTokens !== undefined && { max_tokens: options.maxOutputTokens }),
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenCode 流式生成请求失败: ${response.status} ${errorText}`);
    }

    let text = '';
    const usage: AiUsageInfo = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    for await (const chunk of this.parseSseLines(response)) {
      const typedChunk = chunk as OpenCodeStreamChunk;
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

  private async *parseSseLines(response: Response): AsyncGenerator<Record<string, unknown>, void, void> {
    if (!response.body) {
      throw new Error('OpenCode 流式响应缺少响应体');
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
          console.warn('[OpenCode] 解析流式响应失败:', e, payload);
        }
      }
    }
  }

  async generateImage(_prompt?: string): Promise<ImageGenerationResult> {
    throw new Error('OpenCode 不支持图片生成，请配置独立的图片生成 Provider (Google/OpenAI)');
  }

  async startVideoGeneration(_prompt?: string): Promise<VideoGenerationStartResult> {
    throw new Error('OpenCode 不支持视频生成，请配置独立的视频生成 Provider (Google/OpenAI)');
  }

  async checkVideoGenerationStatus(_operationId?: string): Promise<VideoGenerationStatusResult> {
    throw new Error('OpenCode 不支持视频生成');
  }

  async generateTTS(_text?: string, _voice?: string): Promise<TTSResult> {
    throw new Error('OpenCode 不支持 TTS 语音合成，请配置独立的 TTS Provider (MiMo/Google/OpenAI)');
  }
}
