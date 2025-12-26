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
 */
export type AiProviderType = 'google' | 'openai';

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
   */
  generateText(prompt: string, options?: { thinking?: boolean }): Promise<TextGenerationResult>;

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
