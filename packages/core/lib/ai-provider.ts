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
   */
  generateImage(prompt: string): Promise<ImageGenerationResult>;

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
}
