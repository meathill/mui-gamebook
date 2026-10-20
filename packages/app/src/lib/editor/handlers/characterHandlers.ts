/**
 * 角色操作处理器（纯工作副本版）。
 */
import type { AICharacter } from '@roudanio/parser/src/types';
import {
  failResult,
  okResult,
  type AddCharacterArgs,
  type DeleteCharacterArgs,
  type EditorToolResult,
  type HandlerContext,
  type UpdateCharacterArgs,
} from './types';

function dialogueReferences(ctx: HandlerContext, id: string): number {
  const pattern = new RegExp(`^@${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*\\([^)]*\\))?:`, 'mu');
  let count = 0;
  for (const node of ctx.nodes) {
    if (node.data.content && pattern.test(node.data.content)) count += 1;
  }
  return count;
}

export function handleAddCharacter(args: AddCharacterArgs, ctx: HandlerContext): EditorToolResult {
  const { id, name, description, imagePrompt } = args;
  if (!id.trim()) return failResult('addCharacter', '角色 ID 不能为空');
  if (!name.trim()) return failResult('addCharacter', '角色名称不能为空');
  if (!ctx.game.ai.characters) ctx.game.ai.characters = {};
  if (ctx.game.ai.characters[id]) return failResult('addCharacter', `角色 ID "${id}" 已存在，未添加`);

  ctx.game.ai.characters[id] = {
    name,
    ...(description ? { description } : {}),
    ...(imagePrompt ? { image_prompt: imagePrompt } : {}),
  };
  return okResult('addCharacter', `已添加角色 "${name}"（ID "${id}"）`);
}

export function handleUpdateCharacter(args: UpdateCharacterArgs, ctx: HandlerContext): EditorToolResult {
  const { id, name, description, imagePrompt, imageUrl } = args;
  const characters = ctx.game.ai.characters;
  const current = characters?.[id];
  if (!current) return failResult('updateCharacter', `角色 "${id}" 不存在，未更新`);
  if (name === undefined && description === undefined && imagePrompt === undefined && imageUrl === undefined) {
    return failResult('updateCharacter', '没有提供任何需要更新的字段');
  }

  const updated: AICharacter = {
    ...current,
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(imagePrompt !== undefined ? { image_prompt: imagePrompt } : {}),
    ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
  };
  if (characters) characters[id] = updated;
  return okResult('updateCharacter', `已更新角色 "${updated.name}"（ID "${id}"）`);
}

export function handleDeleteCharacter(args: DeleteCharacterArgs, ctx: HandlerContext): EditorToolResult {
  const { id } = args;
  const characters = ctx.game.ai.characters;
  const current = characters?.[id];
  if (!current) return failResult('deleteCharacter', `角色 "${id}" 不存在，未删除`);

  const references = dialogueReferences(ctx, id);
  if (characters) delete characters[id];
  return okResult('deleteCharacter', `已删除角色 "${current.name}"（ID "${id}"）`, [
    ...(references > 0 ? [`有 ${references} 个场景包含 @${id} 对话行，删除后会退化为普通文本`] : []),
  ]);
}
