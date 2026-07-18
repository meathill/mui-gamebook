/**
 * AI 提供者抽象层
 * 统一 Google GenAI 和 OpenAI 的接口
 */

/**
 * AI 用量信息
 */
export interface AiUsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 图片生成结果
 */
export interface ImageGenerationResult {
  buffer: Buffer;
  type: string;
  usage: AiUsageInfo;
}

/**
 * 文本生成结果
 */
export interface TextGenerationResult {
  text: string;
  usage: AiUsageInfo;
}

/**
 * 流式文本生成的增量片段
 * - reasoning: 深度思考过程（如 MiMo 的 reasoning_content）
 * - content: 最终正文内容
 */
export interface TextStreamChunk {
  type: 'reasoning' | 'content';
  delta: string;
}

/**
 * 视频生成启动结果（异步模式）
 */
export interface VideoGenerationStartResult {
  operationName: string;
  usage: AiUsageInfo;
}

/**
 * 视频生成状态检查结果
 */
export interface VideoGenerationStatusResult {
  done: boolean;
  uri?: string;
  error?: string;
}

/**
 * 小游戏生成结果
 */
export interface MiniGameGenerationResult {
  code: string;
  usage: AiUsageInfo;
}

/**
 * Function 声明（用于 chatWithTools）
 */
export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Function Call 结果
 */
export interface FunctionCallResult {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Chat 消息
 */
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

/**
 * Chat with Tools 结果
 */
export interface ChatWithToolsResult {
  text?: string;
  functionCalls?: FunctionCallResult[];
  usage: AiUsageInfo;
}

/**
 * TTS 结果
 */
export interface TTSResult {
  buffer: Buffer;
  mimeType: string;
}

/**
 * AI 提供者类型
 * - mimo: 小米 MiMo（OpenAI 兼容协议，仅文本/工具调用）
 * - anthropic: Anthropic Claude（仅文本/工具调用）
 */
export type AiProviderType = 'google' | 'openai' | 'mimo' | 'anthropic';

/**
 * AI 提供者配置
 */
export interface AiProviderConfig {
  // 默认 AI 提供者
  defaultProvider: AiProviderType;
  // 文本生成模型
  textModel?: string;
  // 图片生成模型
  imageModel?: string;
  // 视频生成模型（目前只有 Google 支持）
  videoModel?: string;
}

/**
 * AI 提供者接口
 */
export interface AiProvider {
  readonly type: AiProviderType;

  /**
   * 生成文本
   * @param options.maxOutputTokens 输出 token 上限；不传表示不限制，仅用于明确需要
   *   限制输出的短调用（如追问/评估），正式内容生成不应传这个参数
   * @param options.model 覆盖该 provider 默认使用的模型（如用更轻量的模型做快速判断）
   */
  generateText(
    prompt: string,
    options?: { thinking?: boolean; maxOutputTokens?: number; model?: string },
  ): Promise<TextGenerationResult>;

  /**
   * 流式生成文本（可选实现）。逐块产出思考过程/正文增量，避免长耗时生成
   * 因为无字节输出而被 Cloudflare 边缘判定为超时（524）。
   * generator 结束时 return 完整文本与用量，供调用方在流结束后落库。
   */
  generateTextStream?(
    prompt: string,
    options?: { thinking?: boolean; maxOutputTokens?: number; model?: string },
  ): AsyncGenerator<TextStreamChunk, TextGenerationResult, void>;

  /**
   * 生成图片
   * @param prompt 提示词
   * @param options 生成选项
   * @param options.aspectRatio 宽高比
   *   - OpenAI 支持: '3:2', '1:1', '2:3'
   *   - Google 支持: '1:1', '2:3', '3:4', '4:5', '9:16', '16:9', '5:4', '4:3', '3:2', '21:9'
   * @param options.referenceImages 参考图片 URL 列表，用于图生图保持角色一致性
   */
  generateImage(
    prompt: string,
    options?: { aspectRatio?: string; referenceImages?: string[] },
  ): Promise<ImageGenerationResult>;

  /**
   * 启动视频生成（异步）
   * 注意：目前只有 Google 支持视频生成
   */
  startVideoGeneration?(
    prompt: string,
    config?: { durationSeconds?: number; aspectRatio?: string },
  ): Promise<VideoGenerationStartResult>;

  /**
   * 检查视频生成状态
   */
  checkVideoGenerationStatus?(operationName: string): Promise<VideoGenerationStatusResult>;

  /**
   * 生成小游戏
   */
  generateMiniGame(prompt: string, variables?: Record<string, string>): Promise<MiniGameGenerationResult>;

  /**
   * 使用工具进行对话（function calling）
   */
  chatWithTools?(messages: ChatMessage[], tools: FunctionDeclaration[]): Promise<ChatWithToolsResult>;

  /**
   * 生成 TTS 语音
   * @param text 要转换的文本
   * @param voiceName 声音名称（不同提供者有不同的可选值）
   */
  generateTTS?(text: string, voiceName?: string): Promise<TTSResult>;
}
