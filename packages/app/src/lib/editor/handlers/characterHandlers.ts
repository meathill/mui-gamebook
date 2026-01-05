/**
 * 角色操作处理器
 */
import type { AICharacter } from '@mui-gamebook/parser/src/types';
import type { HandlerContext, AddCharacterArgs, UpdateCharacterArgs, DeleteCharacterArgs } from './types';

export function handleAddCharacter(args: AddCharacterArgs, ctx: HandlerContext): string {
  const { id, name, description, imagePrompt } = args;
  if (!ctx.originalGame) return '游戏数据未加载';

  // 去重检查：如果角色已存在，跳过添加
  if (ctx.originalGame.ai.characters?.[id]) {
    console.log(`跳过重复角色: "${id}" 已存在`);
    return `跳过重复角色 "${name}"（ID "${id}" 已存在）`;
  }

  const newChar: AICharacter = {
    name,
    description,
    image_prompt: imagePrompt,
  };

  const newCharacters = {
    ...ctx.originalGame.ai.characters,
    [id]: newChar,
  };

  ctx.setOriginalGame((prev) => (prev ? { ...prev, ai: { ...prev.ai, characters: newCharacters } } : null));
  return `已添加角色 "${name}"`;
}

export function handleUpdateCharacter(args: UpdateCharacterArgs, ctx: HandlerContext): string {
  const { id, name, description, imagePrompt } = args;
  if (!ctx.originalGame) return '游戏数据未加载';

  const currentChar = ctx.originalGame.ai.characters?.[id];
  if (!currentChar) {
    return `角色 "${id}" 不存在`;
  }

  const updatedChar: AICharacter = {
    ...currentChar,
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(imagePrompt !== undefined ? { image_prompt: imagePrompt } : {}),
  };

  const newCharacters = {
    ...ctx.originalGame.ai.characters,
    [id]: updatedChar,
  };

  ctx.setOriginalGame((prev) => (prev ? { ...prev, ai: { ...prev.ai, characters: newCharacters } } : null));
  return `已更新角色 "${currentChar.name}"`;
}

export function handleDeleteCharacter(args: DeleteCharacterArgs, ctx: HandlerContext): string {
  const { id } = args;
  if (!ctx.originalGame) return '游戏数据未加载';

  const characters = ctx.originalGame.ai.characters;
  if (!characters || !(id in characters)) {
    return `角色 "${id}" 不存在`;
  }

  const { [id]: deleted, ...rest } = characters;
  ctx.setOriginalGame((prev) => (prev ? { ...prev, ai: { ...prev.ai, characters: rest } } : null));
  return `已删除角色 "${deleted.name}"`;
}
