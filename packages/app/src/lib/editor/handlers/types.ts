/**
 * AI Chatbot Function Call 类型定义与执行上下文。
 *
 * 执行引擎使用可变工作副本（working copy）：一次批量内的所有调用共享同一份
 * nodes/edges/game，前序新增的场景对后续调用立即可见；全部成功后再一次性提交。
 */
import type { Node, Edge } from '@xyflow/react';
import type { Game } from '@roudanio/parser/src/types';
import type { SceneNodeData } from '@/lib/editor/transformers';

/** 编辑器工具执行的工作副本 */
export interface EditorDocument {
  nodes: Node<SceneNodeData>[];
  edges: Edge[];
  game: Game;
}

/** 兼容旧命名：handler 直接修改这份上下文 */
export type HandlerContext = EditorDocument;

/** 单个工具调用的结构化结果 */
export interface EditorToolResult {
  /** 对应 model 返回的 tool call id（in-page 调用可缺省） */
  id?: string;
  name: string;
  ok: boolean;
  message: string;
  warnings?: string[];
}

export function okResult(name: string, message: string, warnings?: string[]): EditorToolResult {
  return { name, ok: true, message, ...(warnings && warnings.length > 0 ? { warnings } : {}) };
}

export function failResult(name: string, message: string, warnings?: string[]): EditorToolResult {
  return { name, ok: false, message, ...(warnings && warnings.length > 0 ? { warnings } : {}) };
}

export function findSceneNode(ctx: HandlerContext, sceneId: string): Node<SceneNodeData> | undefined {
  return ctx.nodes.find((node) => node.id === sceneId);
}

export function outgoingEdges(ctx: HandlerContext, sceneId: string): Edge[] {
  return ctx.edges.filter((edge) => edge.source === sceneId);
}

export function choiceEdge(ctx: HandlerContext, sceneId: string, choiceIndex: number): Edge | undefined {
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0) return undefined;
  return outgoingEdges(ctx, sceneId)[choiceIndex];
}

/** 场景 ID 与 parser 的引用口径一致：字母、数字、下划线、连字符 */
export function isValidSceneId(sceneId: string): boolean {
  return /^[\p{L}\p{N}_-]+$/u.test(sceneId);
}

// 场景操作参数
export interface UpdateSceneArgs {
  sceneId: string;
  content: string;
}

export interface AddSceneArgs {
  sceneId: string;
  content: string;
  afterSceneId?: string;
}

export interface DeleteSceneArgs {
  sceneId: string;
}

export interface RenameSceneArgs {
  oldId: string;
  newId: string;
}

// 选项操作参数
export interface AddChoiceArgs {
  sceneId: string;
  text: string;
  targetSceneId: string;
  condition?: string;
  stateChange?: string;
}

export interface UpdateChoiceArgs {
  sceneId: string;
  choiceIndex: number;
  text?: string;
  targetSceneId?: string;
  condition?: string;
  stateChange?: string;
}

export interface DeleteChoiceArgs {
  sceneId: string;
  choiceIndex: number;
}

// 变量操作参数
export interface AddVariableArgs {
  name: string;
  value: string;
  visible?: boolean;
  label?: string;
}

export interface UpdateVariableArgs {
  name: string;
  value?: string;
  visible?: boolean;
  label?: string;
}

export interface DeleteVariableArgs {
  name: string;
}

// 角色操作参数
export interface AddCharacterArgs {
  id: string;
  name: string;
  description?: string;
  imagePrompt?: string;
}

export interface UpdateCharacterArgs {
  id: string;
  name?: string;
  description?: string;
  imagePrompt?: string;
  imageUrl?: string;
}

export interface DeleteCharacterArgs {
  id: string;
}

// 细粒度场景操作参数
export interface UpdateSceneTextArgs {
  sceneId: string;
  text: string;
}

export interface SetSceneImageArgs {
  sceneId: string;
  url?: string;
  imagePrompt?: string;
  character?: string;
}

// 对话与重定向操作参数（DSL v2）
export interface AddDialogueLineArgs {
  sceneId: string;
  speaker: string;
  content: string;
  emotion?: string;
}

export interface AddRedirectArgs {
  sceneId: string;
  targetSceneId: string;
  condition?: string;
  stateChange?: string;
}

export interface UpdateSceneImagePromptArgs {
  sceneId: string;
  imagePrompt: string;
}

// 细粒度选项操作参数
export interface UpdateChoiceTextArgs {
  sceneId: string;
  choiceIndex: number;
  text: string;
}

export interface UpdateChoiceTargetArgs {
  sceneId: string;
  choiceIndex: number;
  targetSceneId: string;
}

export interface UpdateChoiceConditionArgs {
  sceneId: string;
  choiceIndex: number;
  condition: string;
}

// 工具函数：解析变量值
export function parseValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (!isNaN(num)) return num;
  return value;
}
