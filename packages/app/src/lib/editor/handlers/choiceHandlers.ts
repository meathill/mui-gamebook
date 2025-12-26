/**
 * 选项操作处理器
 */
import type { Edge } from '@xyflow/react';
import type { HandlerContext, AddChoiceArgs, UpdateChoiceArgs, DeleteChoiceArgs } from './types';

export function handleAddChoice(args: AddChoiceArgs, ctx: HandlerContext): string {
  const { sceneId, text, targetSceneId, condition, stateChange } = args;

  const newEdge: Edge = {
    id: `${sceneId}-${targetSceneId}-${Date.now()}`,
    source: sceneId,
    target: targetSceneId,
    label: text,
    data: {
      condition,
      set: stateChange,
    },
  };
  ctx.setEdges((eds) => [...eds, newEdge]);
  return `已为场景 "${sceneId}" 添加选项 "${text}"`;
}

export function handleUpdateChoice(args: UpdateChoiceArgs, ctx: HandlerContext): string {
  const { sceneId, choiceIndex, text, targetSceneId, condition, stateChange } = args;

  // 找到从该场景出发的所有边
  const sceneEdges = ctx.edges.filter((e) => e.source === sceneId);
  if (choiceIndex < 0 || choiceIndex >= sceneEdges.length) {
    return `选项索引 ${choiceIndex} 超出范围`;
  }

  const targetEdge = sceneEdges[choiceIndex];
  ctx.setEdges((eds) =>
    eds.map((edge) => {
      if (edge.id !== targetEdge.id) return edge;
      return {
        ...edge,
        ...(text !== undefined ? { label: text } : {}),
        ...(targetSceneId !== undefined ? { target: targetSceneId } : {}),
        data: {
          ...edge.data,
          ...(condition !== undefined ? { condition } : {}),
          ...(stateChange !== undefined ? { set: stateChange } : {}),
        },
      };
    }),
  );
  return `已更新场景 "${sceneId}" 的第 ${choiceIndex + 1} 个选项`;
}

export function handleDeleteChoice(args: DeleteChoiceArgs, ctx: HandlerContext): string {
  const { sceneId, choiceIndex } = args;

  const sceneEdges = ctx.edges.filter((e) => e.source === sceneId);
  if (choiceIndex < 0 || choiceIndex >= sceneEdges.length) {
    return `选项索引 ${choiceIndex} 超出范围`;
  }

  const targetEdge = sceneEdges[choiceIndex];
  ctx.setEdges((eds) => eds.filter((e) => e.id !== targetEdge.id));
  return `已删除场景 "${sceneId}" 的第 ${choiceIndex + 1} 个选项`;
}
