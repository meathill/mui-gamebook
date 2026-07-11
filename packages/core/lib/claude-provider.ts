/**
 * Anthropic Claude 提供者实现
 * 仅支持文本生成与 function calling，不支持图片/视频/TTS
 */
import Anthropic from '@anthropic-ai/sdk';
import { buildMiniGamePrompt, extractMiniGameCode, MINIGAME_API_SPEC } from './ai';
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

/** Claude 默认文本模型 */
export const CLAUDE_DEFAULT_TEXT_MODEL = 'claude-sonnet-5';

/** Claude 输出 token 上限（长剧本生成需要较大空间） */
const MAX_OUTPUT_TOKENS = 32000;

export class ClaudeProvider implements AiProvider {
  readonly type = 'anthropic' as const;
  private client: Anthropic;

  constructor(
    apiKey: string,
    private models: { text?: string } = {},
    options?: { baseURL?: string; headers?: Record<string, string> },
  ) {
    this.client = new Anthropic({
      apiKey,
      ...(options?.baseURL && { baseURL: options.baseURL }),
      ...(options?.headers && Object.keys(options.headers).length > 0 && { defaultHeaders: options.headers }),
    });
  }

  private get textModel(): string {
    return this.models.text || CLAUDE_DEFAULT_TEXT_MODEL;
  }

  private static mapUsage(usage: { input_tokens: number; output_tokens: number }): AiUsageInfo {
    return {
      promptTokens: usage.input_tokens,
      completionTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens,
    };
  }

  private static extractText(content: Anthropic.ContentBlock[]): string {
    return content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }

  async generateText(prompt: string, options?: { thinking?: boolean }): Promise<TextGenerationResult> {
    const model = this.textModel;
    console.log(`[Claude] Generating text with model: ${model}`);

    // 注意：Claude 新模型不接受 temperature/top_p，一律不发送
    const response = await this.client.messages.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [{ role: 'user', content: prompt }],
      ...(options?.thinking && { thinking: { type: 'adaptive' as const } }),
    });

    return {
      text: ClaudeProvider.extractText(response.content),
      usage: ClaudeProvider.mapUsage(response.usage),
    };
  }

  async generateImage(): Promise<ImageGenerationResult> {
    throw new Error('Claude 不支持图片生成');
  }

  async startVideoGeneration(): Promise<VideoGenerationStartResult> {
    throw new Error('Claude 不支持视频生成');
  }

  async checkVideoGenerationStatus(): Promise<VideoGenerationStatusResult> {
    throw new Error('Claude 不支持视频生成');
  }

  async generateMiniGame(prompt: string, variables?: Record<string, string>): Promise<MiniGameGenerationResult> {
    const model = this.textModel;
    console.log(`[Claude] Generating minigame with model: ${model}`);

    const response = await this.client.messages.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: buildMiniGamePrompt(MINIGAME_API_SPEC, variables),
      messages: [{ role: 'user', content: `游戏需求：${prompt}` }],
    });

    const code = extractMiniGameCode(ClaudeProvider.extractText(response.content));
    if (!code) {
      throw new Error('AI 未返回有效的游戏代码');
    }

    return { code, usage: ClaudeProvider.mapUsage(response.usage) };
  }

  async chatWithTools(messages: ChatMessage[], tools: FunctionDeclaration[]): Promise<ChatWithToolsResult> {
    const model = this.textModel;
    console.log(`[Claude] Chat with tools using model: ${model}`);

    // FunctionDeclaration.parameters 本身就是 JSON Schema，直接作为 input_schema
    const claudeTools: Anthropic.Tool[] = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));

    const response = await this.client.messages.create({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: messages.map((msg) => ({
        role: msg.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: msg.content,
      })),
      tools: claudeTools,
    });

    const text = ClaudeProvider.extractText(response.content) || undefined;
    const functionCalls: FunctionCallResult[] = response.content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      .map((block) => ({
        name: block.name,
        args: block.input as Record<string, unknown>,
      }));

    return {
      text,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      usage: ClaudeProvider.mapUsage(response.usage),
    };
  }

  async generateTTS(): Promise<TTSResult> {
    throw new Error('Claude 不支持 TTS 生成');
  }
}
