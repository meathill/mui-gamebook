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
   * @param prompt 提示词
   * @param options 生成选项
   * @param options.aspectRatio 宽高比
   *   - OpenAI 支持: '3:2', '1:1', '2:3'
   *   - Google 支持: '1:1', '2:3', '3:4', '4:5', '9:16', '16:9', '5:4', '4:3', '3:2', '21:9'
   */
  generateImage(prompt: string, options?: { aspectRatio?: string }): Promise<ImageGenerationResult>;

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

/**
 * 构建小游戏生成的系统提示词
 * 这个函数用于统一 OpenAI 和 Google AI 提供者的提示词构建逻辑
 * @param minigameApiSpec 小游戏 API 接口规范
 * @param variables 可用的变量及其描述
 * @returns 完整的系统提示词
 */
export function buildMiniGamePrompt(minigameApiSpec: string, variables?: Record<string, string>): string {
  const variablesList = variables
    ? Object.entries(variables)
        .map(([key, desc]) => `- ${key}: ${desc}`)
        .join('\n')
    : '无特定变量';

  return `你是一个专业的 JavaScript 游戏开发者。你需要生成一个简单的互动小游戏。

要求：
1. 生成的代码必须是一个 ES Module，导出默认对象实现以下接口：
${minigameApiSpec}

2. 游戏必须是简单的，不依赖任何外部库
3. 使用原生 Canvas 或 DOM 操作
4. 游戏应该在 container 元素内渲染
5. 游戏结束时调用 onComplete 回调，传入修改后的变量
6. destroy 方法必须清理所有事件监听器和定时器

可用的变量：
${variablesList}

只输出 JavaScript 代码，不要包含 markdown 代码块标记。代码必须可以直接作为 ES Module 执行。`;
}
