/**
 * MCP 鉴权解析（per-request）：
 * 1. Bearer = better-auth API Key（推荐，绑定真实用户，可吊销/限流）
 * 2. Cookie session
 * 3. Bearer = ADMIN_PASSWORD（遗留脚本通道，不推荐给本地 Agent）
 */
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { createAuth } from '@/lib/auth-config';
import { getSession } from '@/lib/auth-server';
import { getDb } from '@/lib/mcp-agent';
import { isBearerAdmin, type McpAuth } from '@/lib/mcp-http';

function readBearerToken(req: Request): string | null {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim() || null;
}

async function resolveApiKeyActor(
  db: DrizzleD1Database<typeof schema>,
  env: CloudflareEnv,
  token: string,
): Promise<McpAuth | null> {
  const auth = createAuth(env);
  const verified = await auth.api.verifyApiKey({ body: { key: token } });
  if (!verified.valid || !verified.key?.referenceId) return null;
  const user = await db.select().from(schema.user).where(eq(schema.user.id, verified.key.referenceId)).get();
  if (!user?.id || !user.email) return null;
  return {
    mode: 'session',
    session: { user: { id: user.id, email: user.email } },
  };
}

export async function resolveMcpAuth(req: Request): Promise<McpAuth | null> {
  const { env } = getCloudflareContext();
  const token = readBearerToken(req);

  if (token) {
    const viaApiKey = await resolveApiKeyActor(getDb(), env, token).catch(() => null);
    if (viaApiKey) return viaApiKey;
    if (isBearerAdmin(req, env as { ADMIN_PASSWORD?: string })) {
      return { mode: 'admin' };
    }
    return null;
  }

  const session = await getSession();
  if (session?.user?.id && session.user.email) {
    return {
      mode: 'session',
      session: { user: { id: session.user.id, email: session.user.email } },
    };
  }
  return null;
}
