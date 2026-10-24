import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { executeAssistanceTool } from '@/lib/media-assistance/execute';
import { requireAssistanceAdmin } from '@/lib/media-assistance/auth';
import { MEDIA_ASSISTANCE_TOOLS } from '@/lib/media-assistance/tools';
import { AssistanceError } from '@/lib/media-assistance/types';
import { getDb, resolveMcpActorUser } from '@/lib/mcp-agent';
import { resolveMcpAuth } from '@/lib/mcp-auth';
import {
  handleMcpPost,
  methodNotAllowed,
  rpcError,
  rpcOk,
  structuredResult,
  APP_ERROR_FORBIDDEN,
  APP_ERROR_RATE_LIMITED,
  APP_ERROR_UNAUTHORIZED,
  type McpRouteDescriptor,
} from '@/lib/mcp-route-core';

/**
 * 站方素材协助专用 MCP endpoint（dual-era，与 /api/mcp 同协议面）。
 * 只暴露 MEDIA_ASSISTANCE_TOOLS；每个方法（含 initialize/tools/list）都要求
 * 管理员：Bearer ADMIN_PASSWORD 或 is_admin 用户的 API Key / cookie session。
 * 生成结果文件走 /api/agent/media-assistance/upload，同样仅管理员。
 */

export async function GET() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}

async function authorize(req: Request, id: Parameters<McpRouteDescriptor['onToolsCall']>[0]) {
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
  const { auth } = resolved;
  try {
    await requireAssistanceAdmin(
      getCloudflareContext().env.DB,
      auth.mode,
      auth.mode === 'session' ? auth.session.user.id : undefined,
    );
  } catch (error) {
    const status = error instanceof AssistanceError ? error.status : 500;
    const message = error instanceof AssistanceError ? error.message : 'Forbidden';
    return { auth: null, errorResponse: rpcError(status, id, APP_ERROR_FORBIDDEN, message) };
  }
  return { auth, errorResponse: undefined };
}

async function handleToolsCall(
  id: Parameters<McpRouteDescriptor['onToolsCall']>[0],
  params: Record<string, unknown> | undefined,
  ctx: { auth: NonNullable<Awaited<ReturnType<typeof resolveMcpAuth>>['auth']> | null },
  modern: boolean,
): Promise<NextResponse> {
  const toolName = params?.name as string | undefined;
  if (!toolName) return rpcError(400, id, -32602, 'Missing params.name');
  if (!MEDIA_ASSISTANCE_TOOLS.some((tool) => tool.name === toolName)) {
    return rpcError(400, id, -32602, `Unknown tool: ${toolName}`);
  }
  if (!ctx.auth) return rpcError(401, id, APP_ERROR_UNAUTHORIZED, 'Unauthorized');

  const sessionUser =
    ctx.auth.mode === 'session' ? { id: ctx.auth.session.user.id, email: ctx.auth.session.user.email } : undefined;
  const actor = await resolveMcpActorUser(getDb(), ctx.auth.mode, sessionUser);
  if (!actor) return rpcError(401, id, APP_ERROR_UNAUTHORIZED, 'Unauthorized: no billing user');

  const outcome = await executeAssistanceTool(toolName, (params?.arguments ?? {}) as Record<string, unknown>, actor);
  return rpcOk(id, structuredResult(outcome.message, outcome.data, !outcome.ok), modern);
}

const routeDescriptor: McpRouteDescriptor = {
  serverName: 'mui-gamebook-media-assistance-mcp',
  instructions:
    '站方素材协助 MCP（仅管理员）。流程：claimMediaAssistanceWork 领取作品 → saveMediaAssistancePlan 规划 → claimMediaAssistanceItem 领取条目 → 本地生成 → 上传接口 + applyMediaAssistanceAsset 应用 → finishMediaAssistanceWork 释放。鉴权：Authorization Bearer <ADMIN_PASSWORD 或站方管理员账号 API Key>。',
  tools: () =>
    MEDIA_ASSISTANCE_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: { readOnlyHint: false },
    })),
  authScope: 'all',
  authorize,
  onToolsCall: handleToolsCall,
};

export async function POST(req: Request) {
  return handleMcpPost(req, routeDescriptor);
}
