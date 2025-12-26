/**
 * 变量操作处理器
 */
import type { GameState } from '@mui-gamebook/parser/src/types';
import type { HandlerContext, AddVariableArgs, UpdateVariableArgs, DeleteVariableArgs } from './types';
import { parseValue } from './types';

export function handleAddVariable(args: AddVariableArgs, ctx: HandlerContext): string {
  const { name, value, visible, label } = args;
  if (!ctx.originalGame) return '游戏数据未加载';

  const parsedValue = parseValue(value);
  const newState: GameState = {
    ...ctx.originalGame.initialState,
    [name]: visible || label ? { value: parsedValue, visible: visible ?? false, label: label ?? name } : parsedValue,
  };

  ctx.setOriginalGame((prev) => (prev ? { ...prev, initialState: newState } : null));
  return `已添加变量 "${name}"`;
}

export function handleUpdateVariable(args: UpdateVariableArgs, ctx: HandlerContext): string {
  const { name, value, visible, label } = args;
  if (!ctx.originalGame) return '游戏数据未加载';

  const currentState = ctx.originalGame.initialState;
  if (!(name in currentState)) {
    return `变量 "${name}" 不存在`;
  }

  const current = currentState[name];
  let updated: GameState[string];

  if (typeof current === 'object' && current !== null && 'value' in current) {
    // 带元数据的变量
    updated = {
      ...current,
      ...(value !== undefined ? { value: parseValue(value) } : {}),
      ...(visible !== undefined ? { visible } : {}),
      ...(label !== undefined ? { label } : {}),
    };
  } else {
    // 简单变量
    if (visible !== undefined || label !== undefined) {
      updated = {
        value: value !== undefined ? parseValue(value) : current,
        visible: visible ?? false,
        label: label ?? name,
      };
    } else {
      updated = value !== undefined ? parseValue(value) : current;
    }
  }

  const newState: GameState = { ...currentState, [name]: updated };
  ctx.setOriginalGame((prev) => (prev ? { ...prev, initialState: newState } : null));
  return `已更新变量 "${name}"`;
}

export function handleDeleteVariable(args: DeleteVariableArgs, ctx: HandlerContext): string {
  const { name } = args;
  if (!ctx.originalGame) return '游戏数据未加载';

  const { [name]: _, ...rest } = ctx.originalGame.initialState;
  ctx.setOriginalGame((prev) => (prev ? { ...prev, initialState: rest } : null));
  return `已删除变量 "${name}"`;
}
