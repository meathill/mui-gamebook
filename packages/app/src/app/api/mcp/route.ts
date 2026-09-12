import { parse, stringify } from '@mui-gamebook/parser';
import { executeWebMcpBatch, WEBMCP_TOOLS } from '@mui-gamebook/webmcp';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';
import { revalidatePublicCatalog } from '@/lib/public-cache';

const SERVER_NAME = 'mui-gamebook-mcp';
const SERVER_VERSION = '0.1.0';
const PROTOCOL_VERSION = '2025-03-26';

/** 只读工具：计算即返回，不落库 */
const READONLY_TOOLS = new Set(['getDsl', 'listScenes']);

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
}

function rpcOk(id: JsonRpcRequest['id'], result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, result });
}

function rpcError(id: JsonRpcRequest['id'], code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
}

function textResult(text: string, isError = false) {
  return { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) };
}

/**
 * GET /api/mcp
 * 服务发现（无需登录）：工具清单与只读标注。
 */
export async function GET() {
  return NextResponse.json({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    tools: WEBMCP_TOOLS.map((t) => ({ name: t.name, description: t.description, readonly: Boolean(t.readonly) })),
  });
}

/**
 * POST /api/mcp
 * MCP StreamableHTTP（JSON-RPC）：initialize / tools/list 可匿名，tools/call 需登录且仅可操作自己管理的游戏。
 * tools/call 参数：{ gameId, calls?: [{name, args}], name?: string, args?: object, dryRun?: boolean }
 * 写操作默认直接落库（与 CMS PUT 同路径：parse 校验 → 更新 games/gameContent → 刷新公开目录缓存）；
 * 传 dryRun: true 则只返回执行结果与新 DSL，不写库（安全闸，默认建议先 dryRun）。
 */
export async function POST(req: Request) {
  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, 'Parse error');
  }
  const { id = null, method, params } = body;

  if (method === 'initialize') {
    return rpcOk(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    });
  }
  if (method === 'notifications/initialized') {
    return new NextResponse(null, { status: 202 });
  }
  if (method === 'ping') {
    return rpcOk(id, {});
  }
  if (method === 'tools/list') {
    return rpcOk(id, {
      tools: WEBMCP_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: { readOnlyHint: Boolean(t.readonly) },
      })),
    });
  }
  if (method !== 'tools/call') {
    return rpcError(id, -32601, `Method not found: ${method}`);
  }

  const toolName = params?.name as string | undefined;
  if (!toolName) return rpcError(id, -32602, '缺少 params.name');
  if (!WEBMCP_TOOLS.some((t) => t.name === toolName)) return rpcError(id, -32602, `未知工具: ${toolName}`);

  const callArgs = (params?.arguments ?? {}) as {
    gameId?: number;
    dryRun?: boolean;
    [key: string]: unknown;
  };
  const gameId = Number(callArgs.gameId);
  if (!gameId) return rpcError(id, -32602, '缺少 arguments.gameId');

  const session = await getSession();
  if (!session) return rpcError(id, -32001, 'Unauthorized');

  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);
  const game = await getManagedGame(db, gameId, session);
  if (!game) return rpcError(id, -32004, 'Game not found');

  const content = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, gameId)).get();
  const parsed = parse(content?.content || '');
  if (!parsed.success) return rpcError(id, -32000, `剧本解析失败: ${parsed.error}`);
  const gameData = parsed.data;

  // 归一化为批量调用（单 tool 调用是只有一个元素的 batch，排序/清理语义一致）
  const { gameId: _omit, dryRun, ...singleArgs } = callArgs;
  void _omit;
  const calls = [{ name: toolName, args: singleArgs }];

  if (READONLY_TOOLS.has(toolName)) {
    if (toolName === 'getDsl') {
      return rpcOk(id, textResult(content?.content || '暂无内容'));
    }
    const list = Object.entries(gameData.scenes)
      .map(([sceneId, s]) => `${sceneId}(${s.nodes.length})`)
      .join(', ');
    return rpcOk(id, textResult(list || '暂无场景'));
  }

  const results = executeWebMcpBatch(gameData, calls);
  const nextDsl = stringify(gameData);
  const revalidate = parse(nextDsl);
  if (!revalidate.success) return rpcError(id, -32000, `生成结果校验失败: ${revalidate.error}`);

  if (dryRun) {
    return rpcOk(id, {
      ...textResult(results.map((r) => `${r.ok ? '✓' : '✗'} ${r.message}`).join('\n')),
      dsl: nextDsl,
    });
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

  return rpcOk(id, textResult(results.map((r) => `${r.ok ? '✓' : '✗'} ${r.message}`).join('\n')));
}
