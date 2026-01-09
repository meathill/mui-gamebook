import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * 验证管理员密钥
 */
function validateAdminAuth(req: Request, env: { ADMIN_PASSWORD?: string }): boolean {
  const secret = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const authHeader = req.headers.get('Authorization');
  return !!(secret && authHeader === `Bearer ${secret}`);
}

interface MinigameInput {
  name: string;
  description?: string;
  prompt: string;
  code: string;
  variables?: Record<string, string>;
  gameSlug?: string; // 关联的游戏 slug
  ownerId?: string;
}

/**
 * POST /api/agent/minigames
 * 创建或更新小游戏（供 AI Agent 使用）
 */
export async function POST(req: Request) {
  const { env } = getCloudflareContext();

  if (!validateAdminAuth(req, env)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as MinigameInput | MinigameInput[];
  const minigames = Array.isArray(body) ? body : [body];

  if (minigames.length === 0) {
    return NextResponse.json({ error: 'No minigames provided' }, { status: 400 });
  }

  const db = drizzle(env.DB);
  const results: { id: number; name: string; action: string }[] = [];
  const now = new Date();

  try {
    // 确定 Owner ID
    let finalOwnerId: string | null = null;
    const requestOwnerId = minigames[0]?.ownerId;

    if (requestOwnerId) {
      const userExists = await db.select().from(schema.user).where(eq(schema.user.id, requestOwnerId)).get();
      if (!userExists) {
        return NextResponse.json({ error: `User ID ${requestOwnerId} not found` }, { status: 400 });
      }
      finalOwnerId = requestOwnerId;
    } else {
      const users = await db.select().from(schema.user).limit(1);
      finalOwnerId = users[0]?.id || null;
    }

    for (const mg of minigames) {
      if (!mg.name || !mg.prompt || !mg.code) {
        results.push({ id: 0, name: mg.name || 'unknown', action: 'skipped - missing required fields' });
        continue;
      }

      // 检查是否已存在同名小游戏
      const existing = await db
        .select()
        .from(schema.minigames)
        .where(and(eq(schema.minigames.name, mg.name), eq(schema.minigames.ownerId, finalOwnerId!)))
        .get();

      const variablesJson = mg.variables ? JSON.stringify(mg.variables) : null;

      if (existing) {
        // 更新
        await db
          .update(schema.minigames)
          .set({
            description: mg.description || null,
            prompt: mg.prompt,
            code: mg.code,
            variables: variablesJson,
            status: 'completed',
            updatedAt: now,
          })
          .where(eq(schema.minigames.id, existing.id));

        results.push({ id: existing.id, name: mg.name, action: 'updated' });
      } else {
        // 插入
        const result = await db
          .insert(schema.minigames)
          .values({
            ownerId: finalOwnerId,
            name: mg.name,
            description: mg.description || null,
            prompt: mg.prompt,
            code: mg.code,
            variables: variablesJson,
            status: 'completed',
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        results.push({ id: result[0].id, name: mg.name, action: 'created' });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (e: unknown) {
    console.error('Create/Update minigames error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
