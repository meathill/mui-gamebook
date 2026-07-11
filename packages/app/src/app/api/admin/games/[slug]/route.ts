import { parse, stringify } from '@mui-gamebook/parser';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';
import { isRootUser } from '@/lib/config';

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * 验证管理员访问：ADMIN_PASSWORD Bearer（脚本通道）或 root 用户 session（后台通道）
 */
async function validateAdminAccess(req: Request, env: { ADMIN_PASSWORD?: string }): Promise<boolean> {
  const secret = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const authHeader = req.headers.get('Authorization');
  if (secret && authHeader === `Bearer ${secret}`) {
    return true;
  }

  const session = await getSession();
  return Boolean(session?.user?.email && isRootUser(session.user.email));
}

/**
 * GET /api/admin/games/[slug]
 * 获取剧本完整内容
 */
export async function GET(req: Request, { params }: Props) {
  const { env } = getCloudflareContext();

  if (!(await validateAdminAccess(req, env))) {
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

  if (!(await validateAdminAccess(req, env))) {
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

/**
 * PATCH /api/admin/games/[slug]
 * 切换发布状态
 */
export async function PATCH(req: Request, { params }: Props) {
  const { env } = getCloudflareContext();

  if (!(await validateAdminAccess(req, env))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = (await params).slug;
  const { published } = (await req.json()) as { published?: boolean };

  if (typeof published !== 'boolean') {
    return NextResponse.json({ error: 'published 必须为布尔值' }, { status: 400 });
  }

  const db = drizzle(env.DB);
  const game = await db.select().from(schema.games).where(eq(schema.games.slug, slug)).get();

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  await db.update(schema.games).set({ published, updatedAt: new Date() }).where(eq(schema.games.id, game.id));

  return NextResponse.json({ success: true, published });
}

/**
 * DELETE /api/admin/games/[slug]
 * 删除游戏（GameContent/GameTags/analytics 通过外键级联清理）
 */
export async function DELETE(req: Request, { params }: Props) {
  const { env } = getCloudflareContext();

  if (!(await validateAdminAccess(req, env))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = (await params).slug;
  const db = drizzle(env.DB);

  const game = await db.select().from(schema.games).where(eq(schema.games.slug, slug)).get();
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  await db.delete(schema.games).where(eq(schema.games.id, game.id));

  return NextResponse.json({ success: true });
}
