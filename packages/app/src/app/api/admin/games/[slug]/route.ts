import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { parse, stringify } from '@mui-gamebook/parser';

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * 验证管理员密钥
 */
function validateAdminAuth(req: Request, env: { ADMIN_PASSWORD?: string }): boolean {
  const secret = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const authHeader = req.headers.get('Authorization');
  return !!(secret && authHeader === `Bearer ${secret}`);
}

/**
 * GET /api/admin/games/[slug]
 * 获取剧本完整内容
 */
export async function GET(req: Request, { params }: Props) {
  const { env } = getCloudflareContext();

  if (!validateAdminAuth(req, env)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = (await params).slug;
  const db = drizzle(env.DB);

  const game = await db.select().from(schema.games).where(eq(schema.games.slug, slug)).get();

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const content = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, game.id)).get();

  return NextResponse.json({
    id: game.id,
    slug: game.slug,
    title: game.title,
    published: Boolean(game.published),
    content: content?.content || '',
  });
}

/**
 * PUT /api/admin/games/[slug]
 * 更新剧本内容
 */
export async function PUT(req: Request, { params }: Props) {
  const { env } = getCloudflareContext();

  if (!validateAdminAuth(req, env)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = (await params).slug;
  const { content } = (await req.json()) as { content: string };

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  // 验证内容
  const parseResult = parse(content);
  if (!parseResult.success) {
    return NextResponse.json({ error: `Invalid content: ${parseResult.error}` }, { status: 400 });
  }

  const db = drizzle(env.DB);
  const { title, description, backgroundStory, cover_image, tags, published } = parseResult.data;
  const now = new Date();

  const game = await db.select().from(schema.games).where(eq(schema.games.slug, slug)).get();

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // 更新 Games 表
  await db
    .update(schema.games)
    .set({
      title,
      description,
      backgroundStory,
      coverImage: cover_image,
      tags: JSON.stringify(tags),
      published,
      updatedAt: now,
    })
    .where(eq(schema.games.id, game.id));

  // 更新 GameContent 表
  await db.update(schema.gameContent).set({ content }).where(eq(schema.gameContent.gameId, game.id));

  return NextResponse.json({ success: true, slug });
}
