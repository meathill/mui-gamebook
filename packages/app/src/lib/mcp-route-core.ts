/**
 * MCP 端点共享协议层：/api/mcp 与 /api/mcp/media-assistance 共用。
 * 负责 dual-era 协议面（2026-07-28 无握手 / 2025-03-26 legacy 握手）、
 * Origin 与 transport 校验、initialize/ping/discover/tools-list 路由；
 * 鉴权策略与工具执行由各端点通过 McpRouteDescriptor 注入。
 */
import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  isModernMcpRequest,
  isOriginAllowed,
  JsonRpcRequest,
  mcpServerMeta,
  McpAuth,
  MCP_LEGACY_PROTOCOL_VERSION,
  MCP_SERVER_VERSION,
  MCP_SUPPORTED_PROTOCOL_VERSIONS,
  validateMcpTransport,
} from '@/lib/mcp-http';

export const APP_ERROR_UNAUTHORIZED = 40101;
export const APP_ERROR_FORBIDDEN = 40103;
export const APP_ERROR_GAME_NOT_FOUND = 40104;
export const APP_ERROR_SCRIPT_INVALID = 50001;
export const APP_ERROR_INVALID_ORIGIN = 40301;
export const APP_ERROR_RATE_LIMITED = 40129;

export function rpcOk(id: JsonRpcRequest['id'], result: Record<string, unknown>, modern: boolean, serverName?: string) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id: id ?? null,
    result: {
      ...(modern ? { resultType: 'complete' } : {}),
      ...result,
      _meta: {
        ...mcpServerMeta(serverName),
        ...(result._meta && typeof result._meta === 'object' ? result._meta : {}),
      },
    },
  });
}

export function rpcError(httpStatus: number, id: JsonRpcRequest['id'], code: number, message: string, data?: unknown) {
  return NextResponse.json(
    { jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } },
    { status: httpStatus },
  );
}

export function textResult(text: string, isError = false) {
  return { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) };
}

export function structuredResult(message: string, data: Record<string, unknown> | undefined, isError: boolean) {
  return {
    content: [{ type: 'text', text: data ? `${message}\n${JSON.stringify(data, null, 2)}` : message }],
    ...(data ? { structuredContent: data } : {}),
    ...(isError ? { isError: true } : {}),
  };
}

export function methodNotAllowed() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'POST' } });
}

export interface McpRouteContext {
  /** authorize 通过后的鉴权上下文；'tools-call' 模式下由 onToolsCall 自行解析 */
  auth: McpAuth | null;
}

export interface McpRouteDescriptor {
  /** initialize/serverInfo 与 _meta 里展示的服务名 */
  serverName: string;
  /** server/discover 返回给客户端的使用说明 */
  instructions: string;
  /** tools/list 返回的完整 descriptor（含 annotations / schema 调整） */
  tools: () => unknown[];
  /** 'all'：每个方法先鉴权；'tools-call'：仅工具调用时鉴权（tools/list 匿名） */
  authScope: 'all' | 'tools-call';
  /**
   * 端点鉴权。返回 errorResponse 表示拒绝（401/403/429）；
   * 通过时把 auth 放回 McpRouteContext（'tools-call' 模式可置 null）。
   */
  authorize: (req: Request, id: JsonRpcRequest['id']) => Promise<McpRouteContext & { errorResponse?: NextResponse }>;
  onToolsCall: (
    id: JsonRpcRequest['id'],
    params: Record<string, unknown> | undefined,
    ctx: McpRouteContext,
    modern: boolean,
  ) => Promise<NextResponse>;
}

export async function handleMcpPost(req: Request, descriptor: McpRouteDescriptor): Promise<NextResponse> {
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

  // 端点级鉴权（authScope='all'）：握手之前就拦截非管理员
  let endpointCtx: Awaited<ReturnType<McpRouteDescriptor['authorize']>> | null = null;
  if (descriptor.authScope === 'all') {
    const access = await descriptor.authorize(req, id);
    if (access.errorResponse) return access.errorResponse;
    endpointCtx = access;
  }

  if (method === 'initialize') {
    if (modern) return rpcError(404, id, -32601, 'Method not found: initialize');
    return rpcOk(
      id,
      {
        protocolVersion: MCP_LEGACY_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: descriptor.serverName, version: MCP_SERVER_VERSION },
      },
      false,
      descriptor.serverName,
    );
  }
  if (method === 'notifications/initialized') {
    return new NextResponse(null, { status: 202 });
  }
  if (method === 'ping') {
    return rpcOk(id, {}, modern, descriptor.serverName);
  }
  if (method === 'server/discover') {
    return rpcOk(
      id,
      {
        supportedVersions: [...MCP_SUPPORTED_PROTOCOL_VERSIONS],
        capabilities: { tools: { listChanged: false } },
        instructions: descriptor.instructions,
        ttlMs: 3_600_000,
        cacheScope: 'public',
      },
      true,
      descriptor.serverName,
    );
  }
  if (method === 'tools/list') {
    return rpcOk(
      id,
      {
        tools: descriptor.tools(),
        ttlMs: 300_000,
        cacheScope: 'private',
      },
      modern,
      descriptor.serverName,
    );
  }
  if (method !== 'tools/call') {
    return rpcError(404, id, -32601, `Method not found: ${method ?? ''}`);
  }

  const ctx = endpointCtx ?? (await descriptor.authorize(req, id));
  if (ctx.errorResponse) return ctx.errorResponse;
  return descriptor.onToolsCall(id, params, ctx, modern);
}
