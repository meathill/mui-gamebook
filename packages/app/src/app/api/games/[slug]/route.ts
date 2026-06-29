import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { parse } from '@mui-gamebook/parser';
import { getSession } from '@/lib/auth-server';

type Props = {
  params: Promise<{ slug: string }>;
};
export async function GET(request: Request, { params }: Props) {
  const { slug } = await params;
  const { env } = getCloudflareContext();
  const db = drizzle(env.DB);

  if (!env.DB) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // 获取当前用户 session
  let currentUserId: string | null = null;
  try {
    const session = await getSession();
    currentUserId = session?.user?.id || null;
  } catch {
    // 未登录用户，继续
  }

  // 1. Find Game by Slug
  let game = await db.select().from(schema.games).where(eq(schema.games.slug, slug)).get();

  if (!game && /^\d+$/.test(slug)) {
    game = await db
      .select()
      .from(schema.games)
      .where(eq(schema.games.id, Number(slug)))
      .get();
  }

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // 2. Fetch Content
  const contentRecord = await db.select().from(schema.gameContent).where(eq(schema.gameContent.gameId, game.id)).get();

  if (!contentRecord) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  const result = parse(contentRecord.content);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const isOwner = currentUserId && game.ownerId === currentUserId;
  // 满足以下任一条件即视为已发布/允许公开访问：
  // 1. 数据库中 published 为 true
  // 2. DSL 文本 frontmatter 中 published 为 true
  // 3. DSL 文本 frontmatter 中配置了 subdomain (用于独立子站宣传)
  const isPublished = game.published || result.data.published || !!result.data.subdomain;

  // 如果游戏未发布且当前用户不是所有者，拒绝访问
  if (!isPublished && !isOwner) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  // Ensure metadata is consistent with DB
  const finalGame = {
    ...result.data,
    title: game.title,
    description: game.description,
    backgroundStory: game.backgroundStory,
    cover_image: game.coverImage,
    tags: game.tags ? JSON.parse(game.tags) : [],
    published: game.published,
    slug: game.slug, // Inject slug for frontend use
  };

  return NextResponse.json(finalGame);
}
