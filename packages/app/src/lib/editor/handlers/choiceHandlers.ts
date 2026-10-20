/**
 * 选项操作处理器（纯工作副本版）。
 * choiceIndex 统一指“场景出边顺序（从 0 开始）”，与 getScene 返回的顺序一致。
 */
import type { Edge } from '@xyflow/react';
import {
  choiceEdge,
  failResult,
  findSceneNode,
  okResult,
  outgoingEdges,
  type AddChoiceArgs,
  type DeleteChoiceArgs,
  type EditorToolResult,
  type HandlerContext,
  type UpdateChoiceArgs,
  type UpdateChoiceConditionArgs,
  type UpdateChoiceTargetArgs,
  type UpdateChoiceTextArgs,
} from './types';

function choiceLabel(index: number): string {
  return `第 ${index + 1} 个选项（choiceIndex ${index}）`;
}

export function handleAddChoice(args: AddChoiceArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId, text, targetSceneId, condition, stateChange } = args;
  if (!findSceneNode(ctx, sceneId)) return failResult('addChoice', `源场景 "${sceneId}" 不存在，未添加选项`);
  if (!findSceneNode(ctx, targetSceneId)) {
    return failResult('addChoice', `目标场景 "${targetSceneId}" 不存在，未添加选项`);
  }
  if (!text.trim()) return failResult('addChoice', '选项文本不能为空');

  const duplicate = outgoingEdges(ctx, sceneId).some(
    (edge) =>
      edge.target === targetSceneId &&
      edge.label === text &&
      (edge.data?.condition || undefined) === condition &&
      (edge.data?.set || undefined) === stateChange,
  );
  if (duplicate) return okResult('addChoice', `已存在相同选项 "${text}"（${sceneId} -> ${targetSceneId}），未重复添加`);

  const newEdge: Edge = {
    id: `${sceneId}-${targetSceneId}-${crypto.randomUUID()}`,
    source: sceneId,
    target: targetSceneId,
    label: text,
    data: { condition, set: stateChange },
  };
  ctx.edges.push(newEdge);
  return okResult('addChoice', `已为场景 "${sceneId}" 添加选项 "${text}" -> "${targetSceneId}"`);
}

export function handleUpdateChoice(args: UpdateChoiceArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId, choiceIndex, text, targetSceneId, condition, stateChange } = args;
  if (!findSceneNode(ctx, sceneId)) return failResult('updateChoice', `源场景 "${sceneId}" 不存在，未更新`);
  const edge = choiceEdge(ctx, sceneId, choiceIndex);
  if (!edge) return failResult('updateChoice', `场景 "${sceneId}" 没有 ${choiceLabel(choiceIndex)}，未更新`);
  if (targetSceneId !== undefined && !findSceneNode(ctx, targetSceneId)) {
    return failResult('updateChoice', `目标场景 "${targetSceneId}" 不存在，未更新`);
  }
  if (text === undefined && targetSceneId === undefined && condition === undefined && stateChange === undefined) {
    return failResult('updateChoice', '没有提供任何需要更新的字段');
  }
  if (text !== undefined && !text.trim()) return failResult('updateChoice', '选项文本不能为空');

  ctx.edges = ctx.edges.map((item) => {
    if (item.id !== edge.id) return item;
    return {
      ...item,
      ...(text !== undefined ? { label: text } : {}),
      ...(targetSceneId !== undefined ? { target: targetSceneId } : {}),
      data: {
        ...item.data,
        ...(condition !== undefined ? { condition } : {}),
        ...(stateChange !== undefined ? { set: stateChange } : {}),
      },
    };
  });
  return okResult('updateChoice', `已更新场景 "${sceneId}" 的 ${choiceLabel(choiceIndex)}`);
}

export function handleUpdateChoiceText(args: UpdateChoiceTextArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId, choiceIndex, text } = args;
  if (!findSceneNode(ctx, sceneId)) return failResult('updateChoiceText', `源场景 "${sceneId}" 不存在，未更新`);
  const edge = choiceEdge(ctx, sceneId, choiceIndex);
  if (!edge) return failResult('updateChoiceText', `场景 "${sceneId}" 没有 ${choiceLabel(choiceIndex)}，未更新`);
  if (!text.trim()) return failResult('updateChoiceText', '选项文本不能为空');

  ctx.edges = ctx.edges.map((item) => (item.id === edge.id ? { ...item, label: text } : item));
  return okResult('updateChoiceText', `已更新场景 "${sceneId}" 的 ${choiceLabel(choiceIndex)}文本`);
}

export function handleUpdateChoiceTarget(args: UpdateChoiceTargetArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId, choiceIndex, targetSceneId } = args;
  if (!findSceneNode(ctx, sceneId)) return failResult('updateChoiceTarget', `源场景 "${sceneId}" 不存在，未更新`);
  const edge = choiceEdge(ctx, sceneId, choiceIndex);
  if (!edge) return failResult('updateChoiceTarget', `场景 "${sceneId}" 没有 ${choiceLabel(choiceIndex)}，未更新`);
  if (!findSceneNode(ctx, targetSceneId)) {
    return failResult('updateChoiceTarget', `目标场景 "${targetSceneId}" 不存在，未更新`);
  }

  ctx.edges = ctx.edges.map((item) => (item.id === edge.id ? { ...item, target: targetSceneId } : item));
  return okResult('updateChoiceTarget', `已更新场景 "${sceneId}" 的 ${choiceLabel(choiceIndex)}目标`);
}

export function handleUpdateChoiceCondition(args: UpdateChoiceConditionArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId, choiceIndex, condition } = args;
  if (!findSceneNode(ctx, sceneId)) return failResult('updateChoiceCondition', `源场景 "${sceneId}" 不存在，未更新`);
  const edge = choiceEdge(ctx, sceneId, choiceIndex);
  if (!edge) return failResult('updateChoiceCondition', `场景 "${sceneId}" 没有 ${choiceLabel(choiceIndex)}，未更新`);

  ctx.edges = ctx.edges.map((item) => (item.id === edge.id ? { ...item, data: { ...item.data, condition } } : item));
  return okResult('updateChoiceCondition', `已更新场景 "${sceneId}" 的 ${choiceLabel(choiceIndex)}条件`);
}

export function handleDeleteChoice(args: DeleteChoiceArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId, choiceIndex } = args;
  if (!findSceneNode(ctx, sceneId)) return failResult('deleteChoice', `源场景 "${sceneId}" 不存在，未删除`);
  const edge = choiceEdge(ctx, sceneId, choiceIndex);
  if (!edge) return failResult('deleteChoice', `场景 "${sceneId}" 没有 ${choiceLabel(choiceIndex)}，未删除`);

  ctx.edges = ctx.edges.filter((item) => item.id !== edge.id);
  return okResult('deleteChoice', `已删除场景 "${sceneId}" 的 ${choiceLabel(choiceIndex)}`);
}
