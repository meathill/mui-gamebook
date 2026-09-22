import { parse, stringify } from '@mui-gamebook/parser';
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
  isModernMcpRequest,
  isOriginAllowed,
  JsonRpcRequest,
  mcpServerMeta,
  McpAuth,
  MCP_LEGACY_PROTOCOL_VERSION,
  MCP_SUPPORTED_PROTOCOL_VERSIONS,
  validateMcpTransport,
} from '@/lib/mcp-http';
import { revalidatePublicCatalog } from '@/lib/public-cache';

/**
 * MCP endpoint（dual-era）：
 * - Modern 2026-07-28：每请求 header + _meta，无 initialize
 * - Legacy 2025-03-26：initialize / ping / tools/list / tools/call（MiMoCode 等客户端）
 * 鉴权 per-request：Bearer ADMIN_PASSWORD 或 cookie session。
 * 工具 = WEBMCP_TOOLS（剧本细粒度）+ MCP_AGENT_TOOLS（CRUD/AI）。
 */

const ALL_TOOLS = [
  ...WEBMCP_TOOLS.map((tool) => ({ kind: 'dsl' as const, tool })),
  ...MCP_AGENT_TOOLS.map((tool) => ({ kind: 'agent' as const, tool })),
];

const APP_ERROR_UNAUTHORIZED = 40101;
const APP_ERROR_FORBIDDEN = 40103;
const APP_ERROR_GAME_NOT_FOUND = 40104;
const APP_ERROR_SCRIPT_INVALID = 50001;
const APP_ERROR_INVALID_ORIGIN = 40301;

function rpcOk(id: JsonRpcRequest['id'], result: Record<string, unknown>, modern: boolean) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id: id ?? null,
    result: {
      ...(modern ? { resultType: 'complete' } : {}),
      ...result,
      _meta: { ...mcpServerMeta(), ...(result._meta && typeof result._meta === 'object' ? result._meta : {}) },
    },
  });
}

function rpcError(httpStatus: number, id: JsonRpcRequest['id'], code: number, message: string, data?: unknown) {
  return NextResponse.json(
    { jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } },
    { status: httpStatus },
  );
}

function textResult(text: string, isError = false) {
  return { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) };
}

function structuredResult(message: string, data: Record<string, unknown> | undefined, isError: boolean) {
  return {
    content: [{ type: 'text', text: data ? `${message}\n${JSON.stringify(data, null, 2)}` : message }],
    ...(data ? { structuredContent: data } : {}),
    ...(isError ? { isError: true } : {}),
  };
}

function methodNotAllowed() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'POST' } });
}

export async function GET() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}

function toolDescriptors() {
  return ALL_TOOLS.map(({ tool }) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: { readOnlyHint: Boolean(tool.readonly) },
  }));
}

async function handleToolsCall(
  id: JsonRpcRequest['id'],
  params: Record<string, unknown> | undefined,
  auth: McpAuth,
  modern: boolean,
) {
  const toolName = params?.name as string | undefined;
  if (!toolName) return rpcError(400, id, -32602, 'Missing params.name');
  const entry = ALL_TOOLS.find(({ tool }) => tool.name === toolName);
  if (!entry) return rpcError(400, id, -32602, `Unknown tool: ${toolName}`);

  const callArgs = (params?.arguments ?? {}) as Record<string, unknown>;
  const gameId = Number(callArgs.gameId);
  const needsGame = !['listGames', 'createGame'].includes(toolName);
  if (needsGame && !gameId) return rpcError(400, id, -32602, 'Missing arguments.gameId');

  const db = getDb();
  const sessionUser =
    auth.mode === 'session' ? { id: auth.session.user.id, email: auth.session.user.email } : undefined;
  const actor = await resolveMcpActorUser(db, auth.mode, sessionUser);
  if (!actor) return rpcError(401, id, APP_ERROR_UNAUTHORIZED, 'Unauthorized: no billing user');
  if (!actor) return rpcError(401, id, APP_ERROR_UNAUTHORIZED, 'Unauthorized: no billing user');

  if (entry.kind === 'agent') {
    const outcome = await executeMcpAgentTool(toolName, callArgs, actor);
    return rpcOk(id, structuredResult(outcome.message, outcome.data, !outcome.ok), modern);
  }

  // DSL 细粒度工具：沿用 webmcp 纯核 + getManagedGame 语义
  const game = await db.select().from(schema.games).where(eq(schema.games.id, gameId)).get();
  if (!game) return rpcError(404, id, APP_ERROR_GAME_NOT_FOUND, 'Game not found');
  if (
    auth.mode === 'session' &&
    !canManageGame({ user: { id: auth.session.user.id, email: auth.session.user.email } }, game)
  ) {
    return rpcError(403, id, APP_ERROR_FORBIDDEN, 'Forbidden');
  }

  const content = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, gameId)).get();
  const parsed = parse(content?.content || '');
  if (!parsed.success) return rpcError(500, id, APP_ERROR_SCRIPT_INVALID, `剧本解析失败: ${parsed.error}`);
  const gameData = parsed.data;

  if (toolName === 'getDsl') {
    return rpcOk(id, textResult(content?.content || '暂无内容'), modern);
  }
  if (toolName === 'listScenes') {
    const list = Object.entries(gameData.scenes)
      .map(([sceneId, scene]) => `${sceneId}(${scene.nodes.length})`)
      .join(', ');
    return rpcOk(id, textResult(list || '暂无场景'), modern);
  }

  const { gameId: _omitGameId, dryRun, ...singleArgs } = callArgs as { gameId?: unknown; dryRun?: boolean };
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

export async function POST(req: Request) {
  const { env } = getCloudflareContext();
  if (!isOriginAllowed(req, env as unknown as Record<string, unknown>)) {
    return rpcError(403, null, APP_ERROR_INVALID_ORIGIN, 'Invalid Origin');
  }

  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(400, null, -32700, 'Parse error');
  }

  const { id = null, method, params } = body;
  const modern = isModernMcpRequest(req, body);

  if (modern) {
    const transportFailure = validateMcpTransport(req, body);
    if (transportFailure) {
      return rpcError(400, id, transportFailure.code, transportFailure.message, transportFailure.data);
    }
    if (id === null || id === undefined) {
      return new NextResponse(null, { status: 202 });
    }
  }

  if (method === 'initialize') {
    if (modern) return rpcError(404, id, -32601, 'Method not found: initialize');
    return rpcOk(
      id,
      {
        protocolVersion: MCP_LEGACY_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'mui-gamebook-mcp', version: '0.3.0' },
      },
      false,
    );
  }
  if (method === 'notifications/initialized') {
    return new NextResponse(null, { status: 202 });
  }
  if (method === 'ping') {
    return rpcOk(id, {}, modern);
  }
  if (method === 'server/discover') {
    return rpcOk(
      id,
      {
        supportedVersions: [...MCP_SUPPORTED_PROTOCOL_VERSIONS],
        capabilities: { tools: { listChanged: false } },
        instructions:
          '游戏剧本 MCP。tools/call 传 arguments.gameId；写操作建议 dryRun。鉴权：Authorization Bearer <ADMIN_PASSWORD>。',
        ttlMs: 3_600_000,
        cacheScope: 'public',
      },
      true,
    );
  }
  if (method === 'tools/list') {
    return rpcOk(
      id,
      {
        tools: toolDescriptors(),
        ttlMs: 300_000,
        cacheScope: 'private',
      },
      modern,
    );
  }
  if (method !== 'tools/call') {
    return rpcError(404, id, -32601, `Method not found: ${method ?? ''}`);
  }

  const auth = await resolveMcpAuth(req);
  if (!auth) return rpcError(401, id, APP_ERROR_UNAUTHORIZED, 'Unauthorized');

  return handleToolsCall(id, params, auth, modern);
}
