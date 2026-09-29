/**
 * MCP Agent 工具执行入口：CRUD + AI 生成 + 素材上传。
 * 工具实现按域拆在同目录的 handlers-* 模块，这里只做参数解析、
 * 归属权校验和分发；错误语义与拆分前保持一致。
 */
import {
  handleCreateGame,
  handleDeleteGame,
  handleGetGameInfo,
  handleListGames,
  handleSetGameDsl,
  handleUpdateGameMeta,
} from './handlers-crud';
import { handleGenerateImage, handleGenerateScript } from './handlers-ai';
import { handleUploadAsset } from './handlers-upload';
import {
  type McpActor,
  type McpGameContext,
  type McpGameRow,
  type McpToolContext,
  type McpToolOutcome,
  fail,
  getDb,
  loadManagedGame,
  resolveMcpActorUser,
} from './shared';

export { getDb, resolveMcpActorUser };
export type { McpActor, McpToolOutcome, McpToolContext, McpGameContext, McpGameRow };

/** 需要 gameId + 归属权校验的游戏工具（listGames/createGame 之外的其余工具） */
const GAME_TOOL_HANDLERS: Record<
  string,
  (ctx: McpGameContext, args: Record<string, unknown>) => Promise<McpToolOutcome>
> = {
  getGameInfo: handleGetGameInfo,
  updateGameMeta: handleUpdateGameMeta,
  setGameDsl: handleSetGameDsl,
  generateScript: handleGenerateScript,
  generateImage: handleGenerateImage,
  uploadAsset: handleUploadAsset,
  deleteGame: handleDeleteGame,
};

export async function executeMcpAgentTool(
  toolName: string,
  args: Record<string, unknown>,
  actor: McpActor,
): Promise<McpToolOutcome> {
  const db = getDb();

  if (toolName === 'listGames') {
    return handleListGames({ db, actor }, args);
  }

  const gameId = Number(args.gameId);
  if (toolName !== 'createGame' && !gameId) return fail('缺少 gameId');

  if (toolName === 'createGame') {
    return handleCreateGame({ db, actor }, args);
  }

  const loaded = await loadManagedGame(db, gameId, actor);
  if (loaded.error) return loaded.error;
  const game = loaded.game;
  if (!game) return fail(`游戏不存在: ${gameId}`);

  const handler = GAME_TOOL_HANDLERS[toolName];
  if (!handler) return fail(`未知 Agent 工具: ${toolName}`);
  return handler({ db, actor, gameId, game }, args);
}
