/**
 * AI Chatbot Function Call 主入口
 * 接收 AI 返回的 function call，分发到对应的处理器
 */
import type {
  HandlerContext,
  UpdateSceneArgs,
  AddSceneArgs,
  DeleteSceneArgs,
  RenameSceneArgs,
  AddChoiceArgs,
  UpdateChoiceArgs,
  DeleteChoiceArgs,
  AddVariableArgs,
  UpdateVariableArgs,
  DeleteVariableArgs,
  AddCharacterArgs,
  UpdateCharacterArgs,
  DeleteCharacterArgs,
  UpdateSceneTextArgs,
  UpdateSceneImagePromptArgs,
  UpdateChoiceTextArgs,
  UpdateChoiceTargetArgs,
  UpdateChoiceConditionArgs,
} from './handlers/types';
import {
  handleUpdateScene,
  handleAddScene,
  handleDeleteScene,
  handleRenameScene,
  handleUpdateSceneText,
  handleUpdateSceneImagePrompt,
} from './handlers/sceneHandlers';
import {
  handleAddChoice,
  handleUpdateChoice,
  handleDeleteChoice,
  handleUpdateChoiceText,
  handleUpdateChoiceTarget,
  handleUpdateChoiceCondition,
} from './handlers/choiceHandlers';
import { handleAddVariable, handleUpdateVariable, handleDeleteVariable } from './handlers/variableHandlers';
import { handleAddCharacter, handleUpdateCharacter, handleDeleteCharacter } from './handlers/characterHandlers';

export type { HandlerContext } from './handlers/types';

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

// 操作优先级：添加 > 删除 > 更新
const OPERATION_PRIORITY: Record<string, number> = {
  // 添加操作优先级最高
  addScene: 1,
  addChoice: 1,
  addVariable: 1,
  addCharacter: 1,
  // 删除操作次之
  deleteScene: 2,
  deleteChoice: 2,
  deleteVariable: 2,
  deleteCharacter: 2,
  // 更新操作最后
  updateScene: 3,
  updateSceneText: 3,
  updateSceneImagePrompt: 3,
  renameScene: 3,
  updateChoice: 3,
  updateChoiceText: 3,
  updateChoiceTarget: 3,
  updateChoiceCondition: 3,
  updateVariable: 3,
  updateCharacter: 3,
};

/**
 * 对 function calls 按优先级排序
 * 顺序：添加 -> 删除 -> 更新
 */
function sortFunctionCalls(calls: FunctionCall[]): FunctionCall[] {
  return [...calls].sort((a, b) => {
    const priorityA = OPERATION_PRIORITY[a.name] ?? 99;
    const priorityB = OPERATION_PRIORITY[b.name] ?? 99;
    return priorityA - priorityB;
  });
}

/**
 * 清理无效连线（指向不存在节点的边）
 */
export function cleanupInvalidEdges(ctx: HandlerContext): void {
  ctx.setEdges((eds) => {
    // 先获取所有有效节点 ID
    let validNodeIds: Set<string> = new Set();
    ctx.setNodes((nds) => {
      validNodeIds = new Set(nds.map((n) => n.id));
      return nds; // 不修改节点
    });

    // 过滤掉指向无效节点的边
    const validEdges = eds.filter((edge) => {
      const sourceValid = validNodeIds.has(edge.source);
      const targetValid = validNodeIds.has(edge.target);
      if (!sourceValid || !targetValid) {
        console.log(`清理无效连线: ${edge.source} -> ${edge.target}`);
      }
      return sourceValid && targetValid;
    });

    return validEdges;
  });
}

/**
 * 处理单个 AI 返回的 function call
 */
export function handleChatFunctionCall(name: string, args: Record<string, unknown>, ctx: HandlerContext): string {
  console.log('执行 AI 函数:', name, args);

  switch (name) {
    // 场景操作
    case 'updateScene':
      return handleUpdateScene(args as unknown as UpdateSceneArgs, ctx);
    case 'updateSceneText':
      return handleUpdateSceneText(args as unknown as UpdateSceneTextArgs, ctx);
    case 'updateSceneImagePrompt':
      return handleUpdateSceneImagePrompt(args as unknown as UpdateSceneImagePromptArgs, ctx);
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
    case 'updateChoiceText':
      return handleUpdateChoiceText(args as unknown as UpdateChoiceTextArgs, ctx);
    case 'updateChoiceTarget':
      return handleUpdateChoiceTarget(args as unknown as UpdateChoiceTargetArgs, ctx);
    case 'updateChoiceCondition':
      return handleUpdateChoiceCondition(args as unknown as UpdateChoiceConditionArgs, ctx);
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

/**
 * 批量处理 function calls
 * 1. 按优先级排序：添加 -> 删除 -> 更新
 * 2. 逐个执行
 * 3. 最后清理无效连线
 */
export function handleBatchFunctionCalls(calls: FunctionCall[], ctx: HandlerContext): string[] {
  const sortedCalls = sortFunctionCalls(calls);
  console.log(
    '批量执行 AI 函数（已排序）:',
    sortedCalls.map((c) => c.name),
  );

  const results: string[] = [];
  for (const call of sortedCalls) {
    const result = handleChatFunctionCall(call.name, call.args, ctx);
    results.push(result);
  }

  // 清理无效连线
  cleanupInvalidEdges(ctx);

  return results;
}
