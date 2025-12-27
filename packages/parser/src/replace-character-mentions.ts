/**
 * 角色 @Mention 替换工具
 * 将文本中的 @角色ID 替换为角色名称
 */

/**
 * 将文本中的 @角色ID 替换为角色名称
 *
 * @param text - 包含 @角色ID 的文本
 * @param characters - 角色映射表 { 角色ID: { name: 角色名称 } }
 * @returns 替换后的文本
 *
 * @example
 * replaceCharacterMentions("@lrrh 在森林里遇到了 @wolf", {
 *   lrrh: { name: "小红帽" },
 *   wolf: { name: "大灰狼" }
 * })
 * // => "小红帽 在森林里遇到了 大灰狼"
 */
export function replaceCharacterMentions(text: string, characters?: Record<string, { name: string }>): string {
  if (!characters || Object.keys(characters).length === 0) {
    return text;
  }

  // 匹配 @角色ID（字母、数字、下划线）
  return text.replace(/@(\w+)/g, (match, id) => {
    const char = characters[id];
    return char ? char.name : match; // 如果找不到角色，保留原文
  });
}
