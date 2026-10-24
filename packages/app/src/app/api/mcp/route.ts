import { parse, stringify } from '@roudanio/parser';
import { executeWebMcpBatch, WEBMCP_TOOLS } from '@mui-gamebook/webmcp';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { canManageGame } from '@/lib/game-access';
import { executeMcpAgentTool, getDb, resolveMcpActorUser } from '@/lib/mcp-agent';
import { MCP_AGENT_TOOLS } from '@/lib/mcp-agent-tools';
import { resolveMcpAuth } from '@/lib/mcp-auth';
import {
  handleMcpPost,
  methodNotAllowed,
  rpcError,
  rpcOk,
  structuredResult,
  textResult,
  APP_ERROR_FORBIDDEN,
  APP_ERROR_GAME_NOT_FOUND,
  APP_ERROR_RATE_LIMITED,
  APP_ERROR_SCRIPT_INVALID,
  APP_ERROR_UNAUTHORIZED,
  type McpRouteDescriptor,
} from '@/lib/mcp-route-core';
import type { McpAuth } from '@/lib/mcp-http';
import { MCP_SERVER_NAME } from '@/lib/mcp-http';
import { revalidatePublicCatalog } from '@/lib/public-cache';
import { saveEditorContent } from '@/lib/media-assistance/editor-save';
import { AssistanceError } from '@/lib/media-assistance/types';

/**
 * MCP endpoint（dual-era）：
 * - Modern 2026-07-28：每请求 header + _meta，无 initialize
 * - Legacy 2025-03-26：initialize / ping / tools/list / tools/call（MiMoCode 等客户端）
 * 鉴权 per-request：Bearer API Key / ADMIN_PASSWORD / cookie session。
 * 工具 = WEBMCP_TOOLS（剧本细粒度）+ MCP_AGENT_TOOLS（CRUD/AI/上传）。
 * 站方素材协助工具在专用端点 /api/mcp/media-assistance（仅管理员），不在此暴露。
 */

const ALL_TOOLS = [
  ...WEBMCP_TOOLS.map((tool) => ({ kind: 'dsl' as const, tool })),
  ...MCP_AGENT_TOOLS.map((tool) => ({ kind: 'agent' as const, tool })),
];

export async function GET() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}

function toolDescriptors() {
  return ALL_TOOLS.map(({ tool, kind }) => ({
    name: tool.name,
    description: tool.description,
    inputSchema:
      kind === 'dsl' && !tool.readonly
        ? {
            ...tool.inputSchema,
            properties: {
              ...tool.inputSchema.properties,
              expectedRevision: { type: 'integer', description: '当前内容版本；开启站方协助的作品必填' },
            },
          }
        : tool.inputSchema,
    annotations: { readOnlyHint: Boolean(tool.readonly) },
  }));
}

async function handleToolsCall(
  id: Parameters<McpRouteDescriptor['onToolsCall']>[0],
  params: Record<string, unknown> | undefined,
  ctx: { auth: McpAuth | null },
  modern: boolean,
): Promise<NextResponse> {
  const toolName = params?.name as string | undefined;
  if (!toolName) return rpcError(400, id, -32602, 'Missing params.name');
  const entry = ALL_TOOLS.find(({ tool }) => tool.name === toolName);
  if (!entry) return rpcError(400, id, -32602, `Unknown tool: ${toolName}`);

  const callArgs = (params?.arguments ?? {}) as Record<string, unknown>;
  const gameId = Number(callArgs.gameId);
  if (!['listGames', 'createGame'].includes(toolName) && !gameId) {
    return rpcError(400, id, -32602, 'Missing arguments.gameId');
  }

  const db = getDb();
  const sessionUser =
    ctx.auth?.mode === 'session' ? { id: ctx.auth.session.user.id, email: ctx.auth.session.user.email } : undefined;
  const actor = await resolveMcpActorUser(db, ctx.auth?.mode ?? 'session', sessionUser);
  if (!actor) return rpcError(401, id, APP_ERROR_UNAUTHORIZED, 'Unauthorized: no billing user');

  if (entry.kind === 'agent') {
    const outcome = await executeMcpAgentTool(toolName, callArgs, actor);
    return rpcOk(id, structuredResult(outcome.message, outcome.data, !outcome.ok), modern);
  }

  // DSL 细粒度工具：沿用 webmcp 纯核 + getManagedGame 语义
  const game = await db.select().from(schema.games).where(eq(schema.games.id, gameId)).get();
  if (!game) return rpcError(404, id, APP_ERROR_GAME_NOT_FOUND, 'Game not found');
  if (
    ctx.auth?.mode === 'session' &&
    !canManageGame({ user: { id: ctx.auth.session.user.id, email: ctx.auth.session.user.email } }, game)
  ) {
    return rpcError(403, id, APP_ERROR_FORBIDDEN, 'Forbidden');
  }

  const content = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, gameId)).get();
  const parsed = parse(content?.content || '');
  if (!parsed.success) return rpcError(500, id, APP_ERROR_SCRIPT_INVALID, `剧本解析失败: ${parsed.error}`);
  const gameData = parsed.data;

  if (toolName === 'getDsl') {
    return rpcOk(id, { ...textResult(content?.content || '暂无内容'), revision: content?.revision ?? 0 }, modern);
  }
  if (toolName === 'listScenes') {
    const list = Object.entries(gameData.scenes)
      .map(([sceneId, scene]) => `${sceneId}(${scene.nodes.length})`)
      .join(', ');
    return rpcOk(id, textResult(list || '暂无场景'), modern);
  }

  const {
    gameId: _omitGameId,
    dryRun,
    expectedRevision,
    ...singleArgs
  } = callArgs as { gameId?: unknown; dryRun?: boolean; expectedRevision?: number };
  void _omitGameId;
  const results = executeWebMcpBatch(gameData, [{ name: toolName, args: singleArgs }]);
  const nextDsl = stringify(gameData);
  const revalidate = parse(nextDsl);
  if (!revalidate.success) {
    return rpcError(500, id, APP_ERROR_SCRIPT_INVALID, `生成结果校验失败: ${revalidate.error}`);
  }
  const summary = results.map((result) => `${result.ok ? '✓' : '✗'} ${result.message}`).join('\n');
  const hasFailure = results.some((result) => !result.ok);

  if (dryRun) {
    return rpcOk(id, { ...textResult(summary, hasFailure), dsl: nextDsl }, modern);
  }
  if (hasFailure) {
    return rpcOk(id, textResult(summary, true), modern);
  }
  if (entry.tool.readonly) return rpcOk(id, textResult(summary), modern);

  if (game.mediaAssistanceEnabled || expectedRevision !== undefined) {
    try {
      const revision = await saveEditorContent(getCloudflareContext().env.DB, {
        gameId,
        content: nextDsl,
        game: revalidate.data,
        expectedRevision: expectedRevision as number,
        slug: game.slug,
        actorId: actor.user.id,
      });
      revalidatePublicCatalog({ slug: game.slug, tags: revalidate.data.tags });
      return rpcOk(id, { ...textResult(summary), revision }, modern);
    } catch (error) {
      if (error instanceof AssistanceError) return rpcOk(id, textResult(error.message, true), modern);
      throw error;
    }
  }

  const { title, description, backgroundStory, cover_image, tags, published } = revalidate.data;
  await db
    .update(schema.games)
    .set({
      title,
      description,
      backgroundStory,
      coverImage: cover_image,
      tags: JSON.stringify(tags),
      published,
      updatedAt: new Date(),
    })
    .where(eq(schema.games.id, gameId));
  await db.update(schema.gameContent).set({ content: nextDsl }).where(eq(schema.gameContent.gameId, gameId));
  revalidatePublicCatalog({ slug: game.slug, tags });
  return rpcOk(id, textResult(summary, hasFailure), modern);
}

const routeDescriptor: McpRouteDescriptor = {
  serverName: MCP_SERVER_NAME,
  instructions:
    '游戏剧本 MCP。tools/call 传 arguments.gameId；写操作建议 dryRun。鉴权：Authorization Bearer <API_KEY 或 ADMIN_PASSWORD>。',
  tools: toolDescriptors,
  authScope: 'tools-call',
  authorize: async (req, id) => {
    const resolved = await resolveMcpAuth(req);
    if (!resolved.auth) {
      const rateLimited = resolved.error === 'rate-limited';
      return {
        auth: null,
        errorResponse: rpcError(
          rateLimited ? 429 : 401,
          id,
          rateLimited ? APP_ERROR_RATE_LIMITED : APP_ERROR_UNAUTHORIZED,
          rateLimited ? 'API key rate limited' : 'Unauthorized',
        ),
      };
    }
    return { auth: resolved.auth };
  },
  onToolsCall: handleToolsCall,
};

export async function POST(req: Request) {
  return handleMcpPost(req, routeDescriptor);
}
