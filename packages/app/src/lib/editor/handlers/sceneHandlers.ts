/**
 * 场景操作处理器（纯工作副本版）。
 * 每个 handler 直接在 ctx 上校验并修改，返回真实成功/失败结果；
 * 由 executeEditorToolBatch 统一克隆、排序、校验和提交。
 */
import type { SceneAiImageNode } from '@roudanio/parser/src/types';
import { createEditorSceneAsset } from '@/lib/editor/transformers';
import {
  failResult,
  findSceneNode,
  isValidSceneId,
  okResult,
  type AddDialogueLineArgs,
  type AddRedirectArgs,
  type AddSceneArgs,
  type DeleteSceneArgs,
  type EditorToolResult,
  type HandlerContext,
  type RenameSceneArgs,
  type SetSceneImageArgs,
  type UpdateSceneArgs,
  type UpdateSceneImagePromptArgs,
  type UpdateSceneTextArgs,
} from './types';

export function handleUpdateScene(args: UpdateSceneArgs, ctx: HandlerContext): EditorToolResult {
  const node = findSceneNode(ctx, args.sceneId);
  if (!node) return failResult('updateScene', `场景 "${args.sceneId}" 不存在，未修改`);
  node.data = { ...node.data, content: args.content };
  return okResult('updateScene', `已覆盖场景 "${args.sceneId}" 的文案（素材与选项保留）`, [
    'updateScene 是覆盖式操作，原正文/对话已被替换',
  ]);
}

export function handleAddScene(args: AddSceneArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId, content, afterSceneId } = args;
  if (!sceneId.trim()) return failResult('addScene', '场景 ID 不能为空');
  if (!isValidSceneId(sceneId)) {
    return failResult('addScene', `场景 ID "${sceneId}" 含不可引用字符，只能使用字母、数字、下划线、连字符`);
  }
  if (findSceneNode(ctx, sceneId)) return failResult('addScene', `场景 "${sceneId}" 已存在，未添加`);

  const anchor = afterSceneId ? findSceneNode(ctx, afterSceneId) : undefined;
  if (afterSceneId && !anchor) {
    return failResult('addScene', `afterSceneId "${afterSceneId}" 不存在；如需添加请去掉 afterSceneId`);
  }
  const position = anchor
    ? { x: anchor.position.x + 260, y: anchor.position.y + 90 }
    : { x: ctx.nodes.length * 40, y: ctx.nodes.length * 40 };

  ctx.nodes.push({
    id: sceneId,
    position,
    data: { label: sceneId, content, assets: [] },
    type: 'scene',
  });
  return okResult('addScene', `已添加场景 "${sceneId}"`);
}

export function handleDeleteScene(args: DeleteSceneArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId } = args;
  if (sceneId === 'start') return failResult('deleteScene', '不能删除 start 场景');
  if (!findSceneNode(ctx, sceneId)) return failResult('deleteScene', `场景 "${sceneId}" 不存在，未删除`);

  const relatedEdges = ctx.edges.filter((edge) => edge.source === sceneId || edge.target === sceneId);
  ctx.nodes = ctx.nodes.filter((node) => node.id !== sceneId);
  ctx.edges = ctx.edges.filter((edge) => edge.source !== sceneId && edge.target !== sceneId);
  delete ctx.game.scenes[sceneId];

  return okResult('deleteScene', `已删除场景 "${sceneId}"，同时清理 ${relatedEdges.length} 条相关选项/引用`);
}

export function handleRenameScene(args: RenameSceneArgs, ctx: HandlerContext): EditorToolResult {
  const { oldId, newId } = args;
  if (!newId.trim() || oldId === newId) return failResult('renameScene', '新旧场景 ID 相同或为空');
  if (!isValidSceneId(newId)) {
    return failResult('renameScene', `新场景 ID "${newId}" 含不可引用字符，只能使用字母、数字、下划线、连字符`);
  }
  if (!findSceneNode(ctx, oldId)) return failResult('renameScene', `场景 "${oldId}" 不存在，未重命名`);
  if (findSceneNode(ctx, newId)) return failResult('renameScene', `场景 "${newId}" 已存在，未重命名`);

  let updatedRefs = 0;
  ctx.nodes = ctx.nodes.map((node) =>
    node.id === oldId ? { ...node, id: newId, data: { ...node.data, label: newId } } : node,
  );
  ctx.edges = ctx.edges.map((edge) => {
    if (edge.source !== oldId && edge.target !== oldId) return edge;
    updatedRefs += 1;
    return {
      ...edge,
      source: edge.source === oldId ? newId : edge.source,
      target: edge.target === oldId ? newId : edge.target,
    };
  });

  return okResult('renameScene', `已将场景 "${oldId}" 重命名为 "${newId}"，同步更新 ${updatedRefs} 条引用`);
}

export function handleUpdateSceneText(args: UpdateSceneTextArgs, ctx: HandlerContext): EditorToolResult {
  const node = findSceneNode(ctx, args.sceneId);
  if (!node) return failResult('updateSceneText', `场景 "${args.sceneId}" 不存在，未修改`);
  node.data = { ...node.data, content: args.text };
  return okResult('updateSceneText', `已更新场景 "${args.sceneId}" 的文案`);
}

/** 更新/创建场景的 ai_image 素材 */
export function handleUpdateSceneImagePrompt(args: UpdateSceneImagePromptArgs, ctx: HandlerContext): EditorToolResult {
  const node = findSceneNode(ctx, args.sceneId);
  if (!node) return failResult('updateSceneImagePrompt', `场景 "${args.sceneId}" 不存在，未修改`);

  const assets = node.data.assets ?? [];
  const index = assets.findIndex((entry) => entry.asset.type === 'ai_image');
  if (index >= 0) {
    const existing = assets[index];
    const updatedAsset: SceneAiImageNode = { ...(existing.asset as SceneAiImageNode), prompt: args.imagePrompt };
    node.data = {
      ...node.data,
      assets: assets.map((entry, i) => (i === index ? { ...existing, asset: updatedAsset } : entry)),
    };
  } else {
    node.data = {
      ...node.data,
      assets: [...assets, createEditorSceneAsset({ type: 'ai_image', prompt: args.imagePrompt })],
    };
  }
  return okResult('updateSceneImagePrompt', `已更新场景 "${args.sceneId}" 的配图 prompt`);
}

/** 设置场景配图 url / prompt / character */
export function handleSetSceneImage(args: SetSceneImageArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId, url, imagePrompt, character } = args;
  if (!url && !imagePrompt) {
    return failResult('setSceneImage', 'url 与 imagePrompt 至少提供一个');
  }
  const node = findSceneNode(ctx, sceneId);
  if (!node) return failResult('setSceneImage', `场景 "${sceneId}" 不存在，未设置`);

  const assets = node.data.assets ?? [];
  const index = assets.findIndex((entry) => entry.asset.type === 'ai_image');
  if (index >= 0) {
    const existing = assets[index];
    const updatedAsset: SceneAiImageNode = {
      ...(existing.asset as SceneAiImageNode),
      ...(url ? { url } : {}),
      ...(imagePrompt ? { prompt: imagePrompt } : {}),
      ...(character ? { character } : {}),
    };
    node.data = {
      ...node.data,
      assets: assets.map((entry, i) => (i === index ? { ...existing, asset: updatedAsset } : entry)),
    };
  } else {
    const newAsset: SceneAiImageNode = {
      type: 'ai_image',
      prompt: imagePrompt ?? '',
      ...(url ? { url } : {}),
      ...(character ? { character } : {}),
    };
    node.data = { ...node.data, assets: [...assets, createEditorSceneAsset(newAsset)] };
  }
  return okResult('setSceneImage', `已设置场景 "${sceneId}" 的配图`);
}

function appendLineToSceneContent(ctx: HandlerContext, sceneId: string, line: string): boolean {
  const node = findSceneNode(ctx, sceneId);
  if (!node) return false;
  node.data = {
    ...node.data,
    content: node.data.content ? `${node.data.content}\n\n${line}` : line,
  };
  return true;
}

export function handleAddDialogueLine(args: AddDialogueLineArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId, speaker, content, emotion } = args;
  if (!ctx.game.ai.characters?.[speaker]) {
    return failResult(
      'addDialogueLine',
      `角色 "${speaker}" 未在角色列表注册，未追加对话。请先用 addCharacter 创建该角色`,
    );
  }
  const line = `@${speaker}${emotion ? ` (${emotion})` : ''}: ${content}`;
  if (!appendLineToSceneContent(ctx, sceneId, line)) {
    return failResult('addDialogueLine', `场景 "${sceneId}" 不存在，未追加对话`);
  }
  return okResult('addDialogueLine', `已向场景 "${sceneId}" 追加 ${speaker} 的对话`);
}

export function handleAddRedirect(args: AddRedirectArgs, ctx: HandlerContext): EditorToolResult {
  const { sceneId, targetSceneId, condition, stateChange } = args;
  if (!findSceneNode(ctx, targetSceneId)) {
    return failResult('addRedirect', `目标场景 "${targetSceneId}" 不存在，未追加重定向`);
  }
  const clauses: string[] = [];
  if (condition) clauses.push(`(if: ${condition})`);
  if (stateChange) clauses.push(`(set: ${stateChange})`);
  const line = [`-> ${targetSceneId}`, ...clauses].join(' ');
  if (!appendLineToSceneContent(ctx, sceneId, line)) {
    return failResult('addRedirect', `场景 "${sceneId}" 不存在，未追加重定向`);
  }
  return okResult('addRedirect', `已向场景 "${sceneId}" 追加重定向 -> ${targetSceneId}`);
}
