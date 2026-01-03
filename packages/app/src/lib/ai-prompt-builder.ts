import type { AICharacter } from '@mui-gamebook/parser/src/types';

/**
 * AI 配置类型
 */
export interface AiConfig {
  style?: Record<string, string>;
  characters?: Record<string, AICharacter>;
}

/**
 * 构建完整的 AI 图片生成提示词
 * 将用户 prompt 与游戏的 AI 风格配置和角色描述合并
 *
 * @param userPrompt - 用户输入的提示词
 * @param aiConfig - 游戏的 AI 配置 (ai.style 和 ai.characters)
 * @param characterIds - 引用的角色 ID 列表
 */
export function buildImagePrompt(userPrompt: string, aiConfig?: AiConfig, characterIds?: string[]): string {
  const parts: string[] = [];

  // 1. 添加风格说明
  if (aiConfig?.style?.image) {
    parts.push(`风格：${aiConfig.style.image}`);
  }

  // 2. 添加角色描述
  if (characterIds?.length && aiConfig?.characters) {
    const characterDescriptions = characterIds
      .map((id) => {
        const char = aiConfig.characters?.[id];
        if (char) {
          return buildCharacterDescription(char);
        }
        return null;
      })
      .filter(Boolean);

    if (characterDescriptions.length > 0) {
      parts.push(`角色：\n${characterDescriptions.join('\n')}`);
    }
  }

  // 3. 添加用户提示词
  parts.push(userPrompt);

  return parts.join('\n\n');
}

/**
 * 构建角色描述文本
 */
function buildCharacterDescription(char: AICharacter): string {
  const desc = char.image_prompt || char.description || '';
  return `- ${char.name}：${desc}`;
}

/**
 * 构建完整的 AI 音频生成提示词
 */
export function buildAudioPrompt(userPrompt: string, aiConfig?: AiConfig): string {
  const parts: string[] = [];

  // 添加音频风格
  if (aiConfig?.style?.audio) {
    parts.push(`风格：${aiConfig.style.audio}`);
  }

  parts.push(userPrompt);

  return parts.join('\n\n');
}

/**
 * 从 prompt 中提取引用的角色 ID
 * 支持 DSL 语法如 characters: [char1, char2] 或 character: char1
 */
export function extractCharacterIds(prompt: string): string[] {
  const ids: string[] = [];

  // 匹配 characters: [id1, id2] 格式
  const multiMatch = prompt?.match(/characters:\s*\[([^\]]+)\]/i);
  if (multiMatch) {
    const idList = multiMatch[1];
    ids.push(...idList.split(',').map((id) => id.trim()));
  }

  // 匹配 character: id 格式
  const singleMatch = prompt?.match(/character:\s*(\w+)/i);
  if (singleMatch) {
    ids.push(singleMatch[1]);
  }

  return ids;
}

/**
 * 增强的 prompt 构建结果
 * 包含处理后的 prompt 和参考图片 URL 列表
 */
export interface EnhancedPromptResult {
  /** 处理后的完整 prompt */
  prompt: string;
  /** 角色头像 URL 列表，用于图生图参考 */
  referenceImages: string[];
}

/**
 * 从 prompt 中提取 @角色ID 格式的内联引用
 *
 * @param prompt - 用户输入的提示词
 * @returns 角色 ID 列表
 *
 * @example
 * extractInlineCharacterIds("@lrrh 在森林里遇到了 @wolf")
 * // => ["lrrh", "wolf"]
 */
export function extractInlineCharacterIds(prompt: string): string[] {
  const matches = prompt.match(/@(\w+)/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1)); // 去掉 @ 前缀
}

/**
 * 构建增强的图片生成 prompt
 * 自动解析 @角色ID 引用，合并角色描述，收集参考图片
 *
 * @param userPrompt - 用户输入的提示词（可包含 @角色ID）
 * @param aiConfig - 游戏的 AI 配置
 * @returns 增强的 prompt 结果，包含处理后的 prompt 和参考图片列表
 */
export function buildEnhancedImagePrompt(userPrompt: string, aiConfig?: AiConfig): EnhancedPromptResult {
  // 1. 提取所有角色引用
  const inlineIds = extractInlineCharacterIds(userPrompt);
  const dslIds = extractCharacterIds(userPrompt);
  const allCharacterIds = [...new Set([...inlineIds, ...dslIds])];

  // 2. 收集角色头像作为参考图片
  const referenceImages: string[] = [];
  if (allCharacterIds.length > 0 && aiConfig?.characters) {
    for (const id of allCharacterIds) {
      const char = aiConfig.characters[id];
      if (char?.image_url) {
        referenceImages.push(char.image_url);
      }
    }
  }

  // 3. 清理 prompt 中的 @角色ID（替换为角色名称）
  let cleanedPrompt = userPrompt;
  if (aiConfig?.characters) {
    for (const id of inlineIds) {
      const char = aiConfig.characters[id];
      if (char) {
        // 将 @角色ID 替换为角色名称
        cleanedPrompt = cleanedPrompt.replace(new RegExp(`@${id}\\b`, 'g'), char.name);
      }
    }
  }

  // 4. 构建完整 prompt（使用原有函数）
  const prompt = buildImagePrompt(cleanedPrompt, aiConfig, allCharacterIds);

  return { prompt, referenceImages };
}
