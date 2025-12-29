/**
 * 选项操作处理器
 *
 * 注意：所有操作都在 setEdges 回调内执行，以确保获取最新状态。
 */
import type { Edge } from '@xyflow/react';
import type {
  HandlerContext,
  AddChoiceArgs,
  UpdateChoiceArgs,
  DeleteChoiceArgs,
  UpdateChoiceTextArgs,
  UpdateChoiceTargetArgs,
  UpdateChoiceConditionArgs,
} from './types';

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

  // 在 setEdges 回调内操作最新状态
  ctx.setEdges((eds) => {
    // 找到从该场景出发的所有边
    const sceneEdges = eds.filter((e) => e.source === sceneId);
    if (choiceIndex < 0 || choiceIndex >= sceneEdges.length) {
      console.warn(`选项索引 ${choiceIndex} 超出范围，跳过更新`);
      return eds;
    }

    const targetEdge = sceneEdges[choiceIndex];
    return eds.map((edge) => {
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
    });
  });

  return `已更新场景 "${sceneId}" 的第 ${choiceIndex + 1} 个选项`;
}

export function handleDeleteChoice(args: DeleteChoiceArgs, ctx: HandlerContext): string {
  const { sceneId, choiceIndex } = args;

  // 在 setEdges 回调内操作最新状态
  ctx.setEdges((eds) => {
    const sceneEdges = eds.filter((e) => e.source === sceneId);
    if (choiceIndex < 0 || choiceIndex >= sceneEdges.length) {
      console.warn(`选项索引 ${choiceIndex} 超出范围，跳过删除`);
      return eds;
    }

    const targetEdge = sceneEdges[choiceIndex];
    return eds.filter((e) => e.id !== targetEdge.id);
  });

  return `已删除场景 "${sceneId}" 的第 ${choiceIndex + 1} 个选项`;
}

/**
 * 只更新选项文本
 */
export function handleUpdateChoiceText(args: UpdateChoiceTextArgs, ctx: HandlerContext): string {
  const { sceneId, choiceIndex, text } = args;

  ctx.setEdges((eds) => {
    const sceneEdges = eds.filter((e) => e.source === sceneId);
    if (choiceIndex < 0 || choiceIndex >= sceneEdges.length) {
      console.warn(`选项索引 ${choiceIndex} 超出范围，跳过更新文本`);
      return eds;
    }

    const targetEdge = sceneEdges[choiceIndex];
    return eds.map((edge) => (edge.id === targetEdge.id ? { ...edge, label: text } : edge));
  });

  return `已更新场景 "${sceneId}" 第 ${choiceIndex + 1} 个选项的文本`;
}

/**
 * 只更新选项目标场景
 */
export function handleUpdateChoiceTarget(args: UpdateChoiceTargetArgs, ctx: HandlerContext): string {
  const { sceneId, choiceIndex, targetSceneId } = args;

  ctx.setEdges((eds) => {
    const sceneEdges = eds.filter((e) => e.source === sceneId);
    if (choiceIndex < 0 || choiceIndex >= sceneEdges.length) {
      console.warn(`选项索引 ${choiceIndex} 超出范围，跳过更新目标`);
      return eds;
    }

    const targetEdge = sceneEdges[choiceIndex];
    return eds.map((edge) => (edge.id === targetEdge.id ? { ...edge, target: targetSceneId } : edge));
  });

  return `已更新场景 "${sceneId}" 第 ${choiceIndex + 1} 个选项的目标`;
}

/**
 * 只更新选项条件
 */
export function handleUpdateChoiceCondition(args: UpdateChoiceConditionArgs, ctx: HandlerContext): string {
  const { sceneId, choiceIndex, condition } = args;

  ctx.setEdges((eds) => {
    const sceneEdges = eds.filter((e) => e.source === sceneId);
    if (choiceIndex < 0 || choiceIndex >= sceneEdges.length) {
      console.warn(`选项索引 ${choiceIndex} 超出范围，跳过更新条件`);
      return eds;
    }

    const targetEdge = sceneEdges[choiceIndex];
    return eds.map((edge) => (edge.id === targetEdge.id ? { ...edge, data: { ...edge.data, condition } } : edge));
  });

  return `已更新场景 "${sceneId}" 第 ${choiceIndex + 1} 个选项的条件`;
}
