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
} from './handlers/types';
import { handleUpdateScene, handleAddScene, handleDeleteScene, handleRenameScene } from './handlers/sceneHandlers';
import { handleAddChoice, handleUpdateChoice, handleDeleteChoice } from './handlers/choiceHandlers';
import { handleAddVariable, handleUpdateVariable, handleDeleteVariable } from './handlers/variableHandlers';
import { handleAddCharacter, handleUpdateCharacter, handleDeleteCharacter } from './handlers/characterHandlers';

export type { HandlerContext } from './handlers/types';

/**
 * 处理 AI 返回的 function call
 */
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
