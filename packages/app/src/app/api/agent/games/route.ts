import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import slugify from 'slugify';

/**
 * 验证管理员密钥
 */
function validateAdminAuth(req: Request, env: { ADMIN_PASSWORD?: string }): boolean {
  const secret = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const authHeader = req.headers.get('Authorization');
  return !!(secret && authHeader === `Bearer ${secret}`);
}

/**
 * POST /api/agent/games
 * 创建新游戏（供 AI Agent 使用）
 */
export async function POST(req: Request) {
  const { env } = getCloudflareContext();

  if (!validateAdminAuth(req, env)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    title,
    slug: customSlug,
    content,
    ownerId: requestOwnerId,
  } = (await req.json()) as {
    title: string;
    slug?: string;
    content?: string;
    ownerId?: string;
  };

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const slug = customSlug || slugify(title, { lower: true, strict: true }) + '-' + Date.now().toString().slice(-4);
  const now = new Date();

  const defaultContent =
    content ||
    `---
title: "${title}"
description: "游戏描述"
published: false
---

# start
欢迎来到游戏！
`;

  const db = drizzle(env.DB);
  const { eq } = await import('drizzle-orm');

  try {
    // 1. 确定 Owner ID
    let finalOwnerId: string | null = null;
    if (requestOwnerId) {
      const userExists = await db.select().from(schema.user).where(eq(schema.user.id, requestOwnerId)).get();
      if (!userExists) {
        return NextResponse.json({ error: `User ID ${requestOwnerId} not found` }, { status: 400 });
      }
      finalOwnerId = requestOwnerId;
    } else {
      // Fallback to first user
      const users = await db.select().from(schema.user).limit(1);
      finalOwnerId = users[0]?.id || null;
    }

    // 2. Check slug
    const existingGame = await db.select().from(schema.games).where(eq(schema.games.slug, slug)).get();

    let id: number;

    if (existingGame) {
      // Update
      id = existingGame.id;
      await db
        .update(schema.games)
        .set({
          title,
          ownerId: finalOwnerId,
          updatedAt: now,
        })
        .where(eq(schema.games.id, id));

      // Update Content
      const contentRecord = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, id)).get();
      if (contentRecord) {
        await db
          .update(schema.gameContent)
          .set({ content: defaultContent })
          .where(eq(schema.gameContent.id, contentRecord.id));
      } else {
        await db.insert(schema.gameContent).values({
          gameId: id,
          content: defaultContent,
        });
      }
    } else {
      // Insert
      const result = await db
        .insert(schema.games)
        .values({
          slug,
          title,
          ownerId: finalOwnerId,
          createdAt: now,
          updatedAt: now,
          published: false,
        })
        .returning();

      id = result[0].id;
      await db.insert(schema.gameContent).values({
        gameId: id,
        content: defaultContent,
      });
    }

    return NextResponse.json({ id, slug, title, action: existingGame ? 'updated' : 'created' });
  } catch (e: unknown) {
    console.error('Create/Update game error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
