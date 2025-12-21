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
  const multiMatch = prompt.match(/characters:\s*\[([^\]]+)\]/i);
  if (multiMatch) {
    const idList = multiMatch[1];
    ids.push(...idList.split(',').map((id) => id.trim()));
  }

  // 匹配 character: id 格式
  const singleMatch = prompt.match(/character:\s*(\w+)/i);
  if (singleMatch) {
    ids.push(singleMatch[1]);
  }

  return ids;
}
