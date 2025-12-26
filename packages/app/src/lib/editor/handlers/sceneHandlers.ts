/**
 * 场景操作处理器
 */
import type { Node } from '@xyflow/react';
import type { SceneNodeData } from '@/lib/editor/transformers';
import type { HandlerContext, UpdateSceneArgs, AddSceneArgs, DeleteSceneArgs, RenameSceneArgs } from './types';

export function handleUpdateScene(args: UpdateSceneArgs, ctx: HandlerContext): string {
  const { sceneId, content } = args;
  const nodeExists = ctx.nodes.some((n) => n.id === sceneId);
  if (!nodeExists) {
    return `场景 "${sceneId}" 不存在`;
  }

  ctx.setNodes((nds) => nds.map((node) => (node.id === sceneId ? { ...node, data: { ...node.data, content } } : node)));
  return `已更新场景 "${sceneId}"`;
}

export function handleAddScene(args: AddSceneArgs, ctx: HandlerContext): string {
  const { sceneId, content } = args;
  const nodeExists = ctx.nodes.some((n) => n.id === sceneId);
  if (nodeExists) {
    return `场景 "${sceneId}" 已存在`;
  }

  const newNode: Node<SceneNodeData> = {
    id: sceneId,
    position: { x: Math.random() * 500, y: Math.random() * 500 },
    data: { label: sceneId, content, assets: [] },
    type: 'scene',
  };
  ctx.setNodes((nds) => [...nds, newNode]);
  return `已添加场景 "${sceneId}"`;
}

export function handleDeleteScene(args: DeleteSceneArgs, ctx: HandlerContext): string {
  const { sceneId } = args;
  if (sceneId === 'start') {
    return '不能删除 start 场景';
  }

  ctx.setNodes((nds) => nds.filter((n) => n.id !== sceneId));
  ctx.setEdges((eds) => eds.filter((e) => e.source !== sceneId && e.target !== sceneId));
  return `已删除场景 "${sceneId}"`;
}

export function handleRenameScene(args: RenameSceneArgs, ctx: HandlerContext): string {
  const { oldId, newId } = args;
  if (!newId || oldId === newId) {
    return '新旧场景 ID 相同';
  }
  if (ctx.nodes.some((n) => n.id === newId)) {
    return `场景 "${newId}" 已存在`;
  }

  ctx.setNodes((nds) =>
    nds.map((node) => (node.id === oldId ? { ...node, id: newId, data: { ...node.data, label: newId } } : node)),
  );
  ctx.setEdges((eds) =>
    eds.map((edge) => {
      let updated = false;
      let source = edge.source;
      let target = edge.target;
      if (source === oldId) {
        source = newId;
        updated = true;
      }
      if (target === oldId) {
        target = newId;
        updated = true;
      }
      return updated ? { ...edge, source, target } : edge;
    }),
  );
  return `已将场景 "${oldId}" 重命名为 "${newId}"`;
}
