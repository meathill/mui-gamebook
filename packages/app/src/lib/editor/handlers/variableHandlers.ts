/**
 * 变量操作处理器（纯工作副本版）。
 */
import type { Game, GameState, GameStateValue } from '@roudanio/parser/src/types';
import {
  failResult,
  okResult,
  type AddVariableArgs,
  type DeleteVariableArgs,
  type EditorToolResult,
  type HandlerContext,
  type UpdateVariableArgs,
} from './types';
import { parseValue } from './types';

function setStateValue(game: Game, name: string, value: GameStateValue): void {
  game.initialState[name] = value;
  if (game.state) game.state[name] = value;
}

function countReferences(ctx: HandlerContext, name: string): number {
  let count = 0;
  const sceneIds = new Set(ctx.nodes.map((node) => node.id));
  for (const node of ctx.nodes) {
    if (node.data.content?.includes(`{{${name}}}`)) count += 1;
  }
  for (const edge of ctx.edges) {
    if (!sceneIds.has(edge.source)) continue;
    const expression = [edge.data?.condition, edge.data?.set].filter(Boolean).join(' ');
    if (expression.includes(name)) count += 1;
  }
  return count;
}

export function handleAddVariable(args: AddVariableArgs, ctx: HandlerContext): EditorToolResult {
  const { name, value, visible, label } = args;
  if (!name.trim()) return failResult('addVariable', '变量名不能为空');
  if (name in ctx.game.initialState) return failResult('addVariable', `变量 "${name}" 已存在，未添加`);

  const parsedValue = parseValue(value);
  const newValue: GameStateValue =
    visible !== undefined || label !== undefined
      ? { value: parsedValue, visible: visible ?? false, label: label ?? name }
      : parsedValue;
  setStateValue(ctx.game, name, newValue);
  return okResult('addVariable', `已添加变量 "${name}"`);
}

export function handleUpdateVariable(args: UpdateVariableArgs, ctx: HandlerContext): EditorToolResult {
  const { name, value, visible, label } = args;
  if (!(name in ctx.game.initialState)) return failResult('updateVariable', `变量 "${name}" 不存在，未更新`);
  if (value === undefined && visible === undefined && label === undefined) {
    return failResult('updateVariable', '没有提供任何需要更新的字段');
  }

  const current = ctx.game.initialState[name];
  const isMeta = typeof current === 'object' && current !== null && 'value' in current;
  if (isMeta) {
    setStateValue(ctx.game, name, {
      ...(current as unknown as Record<string, unknown>),
      ...(value !== undefined ? { value: parseValue(value) } : {}),
      ...(visible !== undefined ? { visible } : {}),
      ...(label !== undefined ? { label } : {}),
    } as GameStateValue);
  } else if (visible !== undefined || label !== undefined) {
    setStateValue(ctx.game, name, {
      value: value !== undefined ? parseValue(value) : current,
      visible: visible ?? false,
      label: label ?? name,
    });
  } else if (value !== undefined) {
    setStateValue(ctx.game, name, parseValue(value));
  }
  return okResult('updateVariable', `已更新变量 "${name}"`);
}

export function handleDeleteVariable(args: DeleteVariableArgs, ctx: HandlerContext): EditorToolResult {
  const { name } = args;
  if (!(name in ctx.game.initialState)) return failResult('deleteVariable', `变量 "${name}" 不存在，未删除`);

  const references = countReferences(ctx, name);
  const { [name]: _deleted, ...rest } = ctx.game.initialState as GameState;
  ctx.game.initialState = rest;
  if (ctx.game.state) delete ctx.game.state[name];

  return okResult('deleteVariable', `已删除变量 "${name}"`, [
    ...(references > 0 ? [`剧本中仍有约 ${references} 处可能引用 "${name}"，请检查条件/文案`] : []),
  ]);
}
