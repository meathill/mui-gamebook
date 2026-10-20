/**
 * 编辑器 AI 工具执行引擎。
 *
 * 与旧实现的区别：
 * - 在克隆出的工作副本上执行，批量内前序新增/删除对后续调用立即可见；
 * - 每个调用返回真实的 { ok, message }，不再“先返回成功、后异步执行”；
 * - 所有写操作结束后统一 stringify + parse 校验，失败整批回滚；
 * - 只读工具复用 @mui-gamebook/webmcp 的无头实现，保证与 /api/mcp 语义一致。
 */
import { parse, stringify } from '@roudanio/parser';
import type { Game } from '@roudanio/parser/src/types';
import { executeWebMcpCall, sortWebMcpCalls, WEBMCP_TOOLS } from '@mui-gamebook/webmcp';
import { MAX_TOOL_CALLS_PER_ROUND } from './chat-declarations';
import { flowToGame } from '@/lib/editor/transformers';
import {
  handleAddChoice,
  handleDeleteChoice,
  handleUpdateChoice,
  handleUpdateChoiceCondition,
  handleUpdateChoiceTarget,
  handleUpdateChoiceText,
} from './handlers/choiceHandlers';
import { handleAddCharacter, handleDeleteCharacter, handleUpdateCharacter } from './handlers/characterHandlers';
import {
  handleAddDialogueLine,
  handleAddRedirect,
  handleAddScene,
  handleDeleteScene,
  handleRenameScene,
  handleSetSceneImage,
  handleUpdateScene,
  handleUpdateSceneImagePrompt,
  handleUpdateSceneText,
} from './handlers/sceneHandlers';
import type { EditorDocument, EditorToolResult } from './handlers/types';
import { failResult } from './handlers/types';
import { handleAddVariable, handleDeleteVariable, handleUpdateVariable } from './handlers/variableHandlers';

export type { EditorDocument, EditorToolResult } from './handlers/types';

export interface FunctionCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export interface EditorToolBatchResult {
  /** 整批是否成功提交（只读批次恒为 true） */
  ok: boolean;
  /** 是否有写操作实际执行 */
  changed: boolean;
  results: EditorToolResult[];
  /** 执行后的工作副本；无法构建基础状态时缺省 */
  document?: EditorDocument;
  dsl: string;
  warnings?: string[];
  error?: string;
}

const READONLY_TOOL_NAMES = new Set(WEBMCP_TOOLS.filter((tool) => tool.readonly).map((tool) => tool.name));

function isReadonlyTool(name: string): boolean {
  return READONLY_TOOL_NAMES.has(name);
}

function cloneDocument(doc: EditorDocument): EditorDocument {
  return JSON.parse(JSON.stringify(doc)) as EditorDocument;
}

function stableArgsKey(args: Record<string, unknown>): string {
  const keys = Object.keys(args).sort();
  return JSON.stringify(keys.map((key) => [key, args[key]]));
}

/** 按工具 schema 做最小运行时校验，避免模型传错类型导致 handler 崩溃 */
function validateCallArgs(name: string, args: Record<string, unknown>): string | null {
  const tool = WEBMCP_TOOLS.find((item) => item.name === name);
  if (!tool) return `未知工具：${name}`;
  for (const key of tool.inputSchema.required ?? []) {
    if (args[key] === undefined || args[key] === null) return `缺少参数: ${key}`;
  }
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined) continue;
    const schema = tool.inputSchema.properties[key] as { type?: string } | undefined;
    if (!schema?.type) continue;
    if (schema.type === 'string' && typeof value !== 'string') return `参数 ${key} 必须是字符串`;
    if (schema.type === 'integer' && !Number.isInteger(value)) return `参数 ${key} 必须是整数`;
    if (schema.type === 'boolean' && typeof value !== 'boolean') return `参数 ${key} 必须是布尔值`;
  }
  return null;
}

function gameFromDocument(doc: EditorDocument): Game {
  return flowToGame(doc.nodes, doc.edges, doc.game);
}

/** 清理指向不存在场景的边，返回清理数量 */
export function cleanupInvalidEdges(ctx: EditorDocument): number {
  const nodeIds = new Set(ctx.nodes.map((node) => node.id));
  const before = ctx.edges.length;
  ctx.edges = ctx.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  return before - ctx.edges.length;
}

function executeReadonlyTool(call: FunctionCall, ctx: EditorDocument): EditorToolResult {
  const argError = validateCallArgs(call.name, call.args);
  if (argError) {
    return { ...(call.id ? { id: call.id } : {}), name: call.name, ok: false, message: argError };
  }
  try {
    const game = gameFromDocument(ctx);
    const result = executeWebMcpCall(game, { name: call.name, args: call.args });
    return {
      ...(call.id ? { id: call.id } : {}),
      name: call.name,
      ok: result.ok,
      message: result.message,
    };
  } catch (error) {
    return {
      ...(call.id ? { id: call.id } : {}),
      name: call.name,
      ok: false,
      message: `读取失败：${(error as Error).message}`,
    };
  }
}

function executeWriteTool(call: FunctionCall, ctx: EditorDocument): EditorToolResult {
  const argError = validateCallArgs(call.name, call.args);
  if (argError) {
    return { ...(call.id ? { id: call.id } : {}), name: call.name, ok: false, message: argError };
  }
  const args = call.args;
  switch (call.name) {
    case 'updateScene':
      return handleUpdateScene(args as never, ctx);
    case 'updateSceneText':
      return handleUpdateSceneText(args as never, ctx);
    case 'updateSceneImagePrompt':
      return handleUpdateSceneImagePrompt(args as never, ctx);
    case 'setSceneImage':
      return handleSetSceneImage(args as never, ctx);
    case 'addScene':
      return handleAddScene(args as never, ctx);
    case 'deleteScene':
      return handleDeleteScene(args as never, ctx);
    case 'renameScene':
      return handleRenameScene(args as never, ctx);
    case 'addDialogueLine':
      return handleAddDialogueLine(args as never, ctx);
    case 'addRedirect':
      return handleAddRedirect(args as never, ctx);
    case 'addChoice':
      return handleAddChoice(args as never, ctx);
    case 'updateChoice':
      return handleUpdateChoice(args as never, ctx);
    case 'updateChoiceText':
      return handleUpdateChoiceText(args as never, ctx);
    case 'updateChoiceTarget':
      return handleUpdateChoiceTarget(args as never, ctx);
    case 'updateChoiceCondition':
      return handleUpdateChoiceCondition(args as never, ctx);
    case 'deleteChoice':
      return handleDeleteChoice(args as never, ctx);
    case 'addVariable':
      return handleAddVariable(args as never, ctx);
    case 'updateVariable':
      return handleUpdateVariable(args as never, ctx);
    case 'deleteVariable':
      return handleDeleteVariable(args as never, ctx);
    case 'addCharacter':
      return handleAddCharacter(args as never, ctx);
    case 'updateCharacter':
      return handleUpdateCharacter(args as never, ctx);
    case 'deleteCharacter':
      return handleDeleteCharacter(args as never, ctx);
    default:
      return failResult(call.name, `未知的写工具：${call.name}`);
  }
}

/** 执行单个调用（就地修改 ctx）；批量入口见 executeEditorToolBatch */
export function handleChatFunctionCall(
  name: string,
  args: Record<string, unknown>,
  ctx: EditorDocument,
): EditorToolResult {
  const call: FunctionCall = { name, args };
  return isReadonlyTool(name) ? executeReadonlyTool(call, ctx) : executeWriteTool(call, ctx);
}

function baseDsl(doc: EditorDocument): string {
  return stringify(gameFromDocument(doc));
}

/**
 * 执行一批工具调用。
 * 返回新的 document；调用方在 ok=true 时一次性提交，ok=false 时保持原状态。
 */
export function executeEditorToolBatch(calls: FunctionCall[], base: EditorDocument): EditorToolBatchResult {
  const originalDsl = baseDsl(base);
  if (calls.length === 0) {
    return { ok: true, changed: false, results: [], document: base, dsl: originalDsl };
  }

  const draft = cloneDocument(base);
  const sorted = sortWebMcpCalls(calls);
  const results: EditorToolResult[] = [];
  const seen = new Set<string>();
  let changed = false;

  for (const [index, call] of sorted.entries()) {
    if (index >= MAX_TOOL_CALLS_PER_ROUND) {
      results.push({
        ...(call.id ? { id: call.id } : {}),
        name: call.name,
        ok: false,
        message: `单轮工具调用超过上限 ${MAX_TOOL_CALLS_PER_ROUND}，本条未执行`,
      });
      continue;
    }

    const key = `${call.name}:${stableArgsKey(call.args)}`;
    if (seen.has(key)) {
      results.push({
        ...(call.id ? { id: call.id } : {}),
        name: call.name,
        ok: true,
        message: '重复调用已跳过（与前面的调用完全相同）',
      });
      continue;
    }
    seen.add(key);

    const readonly = isReadonlyTool(call.name);
    const rawResult = readonly ? executeReadonlyTool(call, draft) : executeWriteTool(call, draft);
    // 统一回填 call id：批量会按优先级重排，客户端/Provider 需要按 id 而不是数组下标对齐结果
    const result = call.id ? { ...rawResult, id: call.id } : rawResult;
    results.push(result);
    if (!readonly && result.ok) changed = true;
  }

  if (!changed) {
    return { ok: true, changed: false, results, document: base, dsl: originalDsl };
  }

  const removedEdges = cleanupInvalidEdges(draft);
  const game = gameFromDocument(draft);
  const finalGame: Game = { ...draft.game, scenes: game.scenes };
  const dsl = stringify(finalGame);
  const parsed = parse(dsl);

  if (!parsed.success) {
    const rolledBack = results.map((result) =>
      isReadonlyTool(result.name) || !result.ok
        ? result
        : {
            ...result,
            ok: false,
            message: `未提交（整批校验失败）：${result.message}`,
          },
    );
    return {
      ok: false,
      changed: false,
      results: rolledBack,
      document: base,
      dsl: originalDsl,
      error: `剧本校验失败，整批修改已回滚：${parsed.error}`,
    };
  }

  const warnings = [
    ...(removedEdges > 0 ? [`清理了 ${removedEdges} 条指向不存在场景的选项/引用`] : []),
    ...parsed.warnings,
  ];

  return {
    ok: true,
    changed: true,
    results,
    document: { nodes: draft.nodes, edges: draft.edges, game: finalGame },
    dsl,
    ...(warnings.length > 0 ? { warnings: [...new Set(warnings)] } : {}),
  };
}
