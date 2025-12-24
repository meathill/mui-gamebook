import { Node, Edge } from '@xyflow/react';
import type { SceneNodeData } from '@/lib/editor/transformers';
import type { GameState, AICharacter, Game } from '@mui-gamebook/parser/src/types';

// Function call 参数类型定义
interface UpdateSceneArgs {
  sceneId: string;
  content: string;
}

interface AddSceneArgs {
  sceneId: string;
  content: string;
  afterSceneId?: string;
}

interface DeleteSceneArgs {
  sceneId: string;
}

interface RenameSceneArgs {
  oldId: string;
  newId: string;
}

interface AddChoiceArgs {
  sceneId: string;
  text: string;
  targetSceneId: string;
  condition?: string;
  stateChange?: string;
}

interface UpdateChoiceArgs {
  sceneId: string;
  choiceIndex: number;
  text?: string;
  targetSceneId?: string;
  condition?: string;
  stateChange?: string;
}

interface DeleteChoiceArgs {
  sceneId: string;
  choiceIndex: number;
}

interface AddVariableArgs {
  name: string;
  value: string;
  visible?: boolean;
  label?: string;
}

interface UpdateVariableArgs {
  name: string;
  value?: string;
  visible?: boolean;
  label?: string;
}

interface DeleteVariableArgs {
  name: string;
}

interface AddCharacterArgs {
  id: string;
  name: string;
  description?: string;
  imagePrompt?: string;
}

interface UpdateCharacterArgs {
  id: string;
  name?: string;
  description?: string;
  imagePrompt?: string;
}

interface DeleteCharacterArgs {
  id: string;
}

// 处理器上下文
interface HandlerContext {
  nodes: Node<SceneNodeData>[];
  edges: Edge[];
  originalGame: Game | null;
  setNodes: (fn: (nodes: Node[]) => Node[]) => void;
  setEdges: (fn: (edges: Edge[]) => Edge[]) => void;
  setOriginalGame: (game: Game | ((prev: Game | null) => Game | null)) => void;
}

// 解析变量值
function parseValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (!isNaN(num)) return num;
  return value;
}

// 场景操作
function handleUpdateScene(args: UpdateSceneArgs, ctx: HandlerContext): string {
  const { sceneId, content } = args;
  const nodeExists = ctx.nodes.some((n) => n.id === sceneId);
  if (!nodeExists) {
    return `场景 "${sceneId}" 不存在`;
  }

  ctx.setNodes((nds) => nds.map((node) => (node.id === sceneId ? { ...node, data: { ...node.data, content } } : node)));
  return `已更新场景 "${sceneId}"`;
}

function handleAddScene(args: AddSceneArgs, ctx: HandlerContext): string {
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

function handleDeleteScene(args: DeleteSceneArgs, ctx: HandlerContext): string {
  const { sceneId } = args;
  if (sceneId === 'start') {
    return '不能删除 start 场景';
  }

  ctx.setNodes((nds) => nds.filter((n) => n.id !== sceneId));
  ctx.setEdges((eds) => eds.filter((e) => e.source !== sceneId && e.target !== sceneId));
  return `已删除场景 "${sceneId}"`;
}

function handleRenameScene(args: RenameSceneArgs, ctx: HandlerContext): string {
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

// 选项操作
function handleAddChoice(args: AddChoiceArgs, ctx: HandlerContext): string {
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

function handleUpdateChoice(args: UpdateChoiceArgs, ctx: HandlerContext): string {
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

function handleDeleteChoice(args: DeleteChoiceArgs, ctx: HandlerContext): string {
  const { sceneId, choiceIndex } = args;

  const sceneEdges = ctx.edges.filter((e) => e.source === sceneId);
  if (choiceIndex < 0 || choiceIndex >= sceneEdges.length) {
    return `选项索引 ${choiceIndex} 超出范围`;
  }

  const targetEdge = sceneEdges[choiceIndex];
  ctx.setEdges((eds) => eds.filter((e) => e.id !== targetEdge.id));
  return `已删除场景 "${sceneId}" 的第 ${choiceIndex + 1} 个选项`;
}

// 变量操作
function handleAddVariable(args: AddVariableArgs, ctx: HandlerContext): string {
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

function handleUpdateVariable(args: UpdateVariableArgs, ctx: HandlerContext): string {
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

function handleDeleteVariable(args: DeleteVariableArgs, ctx: HandlerContext): string {
  const { name } = args;
  if (!ctx.originalGame) return '游戏数据未加载';

  const { [name]: _, ...rest } = ctx.originalGame.initialState;
  ctx.setOriginalGame((prev) => (prev ? { ...prev, initialState: rest } : null));
  return `已删除变量 "${name}"`;
}

// 角色操作
function handleAddCharacter(args: AddCharacterArgs, ctx: HandlerContext): string {
  const { id, name, description, imagePrompt } = args;
  if (!ctx.originalGame) return '游戏数据未加载';

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

function handleUpdateCharacter(args: UpdateCharacterArgs, ctx: HandlerContext): string {
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

function handleDeleteCharacter(args: DeleteCharacterArgs, ctx: HandlerContext): string {
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

// 主处理函数
export function handleChatFunctionCall(name: string, args: Record<string, unknown>, ctx: HandlerContext): string {
  console.log('执行 AI 函数:', name, args);

  switch (name) {
    // 场景操作
    case 'updateScene':
      return handleUpdateScene(args as unknown as UpdateSceneArgs, ctx);
    case 'addScene':
      return handleAddScene(args as unknown as AddSceneArgs, ctx);
    case 'deleteScene':
      return handleDeleteScene(args as unknown as DeleteSceneArgs, ctx);
    case 'renameScene':
      return handleRenameScene(args as unknown as RenameSceneArgs, ctx);

    // 选项操作
    case 'addChoice':
      return handleAddChoice(args as unknown as AddChoiceArgs, ctx);
    case 'updateChoice':
      return handleUpdateChoice(args as unknown as UpdateChoiceArgs, ctx);
    case 'deleteChoice':
      return handleDeleteChoice(args as unknown as DeleteChoiceArgs, ctx);

    // 变量操作
    case 'addVariable':
      return handleAddVariable(args as unknown as AddVariableArgs, ctx);
    case 'updateVariable':
      return handleUpdateVariable(args as unknown as UpdateVariableArgs, ctx);
    case 'deleteVariable':
      return handleDeleteVariable(args as unknown as DeleteVariableArgs, ctx);

    // 角色操作
    case 'addCharacter':
      return handleAddCharacter(args as unknown as AddCharacterArgs, ctx);
    case 'updateCharacter':
      return handleUpdateCharacter(args as unknown as UpdateCharacterArgs, ctx);
    case 'deleteCharacter':
      return handleDeleteCharacter(args as unknown as DeleteCharacterArgs, ctx);

    default:
      return `未知的函数: ${name}`;
  }
}
