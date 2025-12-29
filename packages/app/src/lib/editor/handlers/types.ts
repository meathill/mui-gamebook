/**
 * AI Chatbot Function Call 类型定义
 */
import type { Node, Edge } from '@xyflow/react';
import type { SceneNodeData } from '@/lib/editor/transformers';
import type { Game } from '@mui-gamebook/parser/src/types';

// 处理器上下文
export interface HandlerContext {
  nodes: Node<SceneNodeData>[];
  edges: Edge[];
  originalGame: Game | null;
  setNodes: (fn: (nodes: Node[]) => Node[]) => void;
  setEdges: (fn: (edges: Edge[]) => Edge[]) => void;
  setOriginalGame: (game: Game | ((prev: Game | null) => Game | null)) => void;
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
}

export interface DeleteCharacterArgs {
  id: string;
}

// 细粒度场景操作参数
export interface UpdateSceneTextArgs {
  sceneId: string;
  text: string;
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
