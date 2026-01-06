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
  } = (await req.json()) as {
    title: string;
    slug?: string;
    content?: string;
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

  try {
    const result = await db
      .insert(schema.games)
      .values({
        slug,
        title,
        ownerId: 'agent', // 标记为 agent 创建
        createdAt: now,
        updatedAt: now,
        published: false,
      })
      .returning();

    const id = result[0].id;
    await db.insert(schema.gameContent).values({
      gameId: id,
      content: defaultContent,
    });

    return NextResponse.json({ id, slug, title });
  } catch (e: unknown) {
    console.error('Create game error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
