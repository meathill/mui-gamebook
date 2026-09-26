import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { and, desc, eq, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';

/** 留言上限（字符数），超出直接 400 */
const MAX_CONTENT_LENGTH = 500;
/** 公开列表默认/最大条数 */
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type Props = {
  params: Promise<{ slug: string }>;
};

type Db = ReturnType<typeof drizzle>;

/** 按 slug（纯数字时回退按 id）找游戏行 */
async function findGame(db: Db, slug: string) {
  const game = await db
    .select({
      id: schema.games.id,
      slug: schema.games.slug,
      published: schema.games.published,
      shadowBanned: schema.games.shadowBanned,
      ownerId: schema.games.ownerId,
    })
    .from(schema.games)
    .where(eq(schema.games.slug, slug))
    .get();
  if (game || !/^\d+$/.test(slug)) return game ?? null;
  return db
    .select({
      id: schema.games.id,
      slug: schema.games.slug,
      published: schema.games.published,
      shadowBanned: schema.games.shadowBanned,
      ownerId: schema.games.ownerId,
    })
    .from(schema.games)
    .where(eq(schema.games.id, Number(slug)))
    .get();
}

/** 未发布/被封禁的作品仅作者可见 */
function isVisibleTo(
  game: { published: boolean | null; shadowBanned: boolean | null; ownerId: string | null },
  userId: string | null,
): boolean {
  const isOwner = !!userId && game.ownerId === userId;
  if (!game.published && !isOwner) return false;
  if (game.shadowBanned && !isOwner) return false;
  return true;
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** 公开口径聚合：只统计未隐藏的 */
async function getAggregate(db: Db, gameId: number) {
  const row = await db
    .select({
      avg: sql<number | null>`AVG(${schema.gameRatings.rating})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(schema.gameRatings)
    .where(and(eq(schema.gameRatings.gameId, gameId), eq(schema.gameRatings.hidden, false)))
    .get();
  return { avg: row?.avg ?? 0, count: row?.count ?? 0 };
}

function parseRating(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 5) return null;
  return raw;
}

/**
 * POST /api/games/[slug]/ratings
 * 匿名可打星；content 非空时要求登录（401 + LOGIN_REQUIRED）。
 * 登录用户同一游戏只有一行（改分走更新），匿名每次插入新行（去重靠客户端 localStorage）。
 */
export async function POST(request: Request, { params }: Props) {
  const { slug } = await params;
  const { env } = getCloudflareContext();
  if (!env.DB) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  let body: { rating?: unknown; content?: unknown };
  try {
    body = (await request.json()) as { rating?: unknown; content?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rating = parseRating(body.rating);
  if (rating === null) {
    return NextResponse.json({ error: 'rating 必须是 1-5 的整数' }, { status: 400 });
  }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json({ error: `评价最多 ${MAX_CONTENT_LENGTH} 字` }, { status: 400 });
  }

  const userId = await getSessionUserId();
  if (content && !userId) {
    return NextResponse.json({ error: 'LOGIN_REQUIRED' }, { status: 401 });
  }

  const db = drizzle(env.DB);
  const game = await findGame(db, slug);
  if (!game || !isVisibleTo(game, userId)) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const now = new Date();
  if (userId) {
    const existing = await db
      .select({ id: schema.gameRatings.id })
      .from(schema.gameRatings)
      .where(and(eq(schema.gameRatings.gameId, game.id), eq(schema.gameRatings.userId, userId)))
      .get();
    if (existing) {
      await db
        .update(schema.gameRatings)
        .set({ rating, content: content || null, updatedAt: now })
        .where(eq(schema.gameRatings.id, existing.id));
    } else {
      await db
        .insert(schema.gameRatings)
        .values({ gameId: game.id, userId, rating, content: content || null, createdAt: now, updatedAt: now });
    }
  } else {
    await db.insert(schema.gameRatings).values({ gameId: game.id, rating, createdAt: now, updatedAt: now });
  }

  const { avg, count } = await getAggregate(db, game.id);
  return NextResponse.json({ success: true, avg, count, myRating: rating });
}

/**
 * GET /api/games/[slug]/ratings?limit=&offset=
 * 公开读：均分 + 数量 + 星级分布 + 评价列表（置顶优先，仅未隐藏）。
 * 登录用户额外返回自己的评分 myRating（含留言）。
 */
export async function GET(request: Request, { params }: Props) {
  const { slug } = await params;
  const { env } = getCloudflareContext();
  if (!env.DB) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  const db = drizzle(env.DB);
  const userId = await getSessionUserId();
  const game = await findGame(db, slug);
  if (!game || !isVisibleTo(game, userId)) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const { avg, count } = await getAggregate(db, game.id);

  const distribution = await db
    .select({ rating: schema.gameRatings.rating, count: sql<number>`COUNT(*)` })
    .from(schema.gameRatings)
    .where(and(eq(schema.gameRatings.gameId, game.id), eq(schema.gameRatings.hidden, false)))
    .groupBy(schema.gameRatings.rating)
    .all();

  const ratings = await db
    .select({
      id: schema.gameRatings.id,
      rating: schema.gameRatings.rating,
      content: schema.gameRatings.content,
      pinned: schema.gameRatings.pinned,
      createdAt: schema.gameRatings.createdAt,
      userName: schema.user.name,
    })
    .from(schema.gameRatings)
    .leftJoin(schema.user, eq(schema.gameRatings.userId, schema.user.id))
    .where(and(eq(schema.gameRatings.gameId, game.id), eq(schema.gameRatings.hidden, false)))
    .orderBy(desc(schema.gameRatings.pinned), desc(schema.gameRatings.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  let myRating: { rating: number; content: string | null } | null = null;
  if (userId) {
    myRating =
      (await db
        .select({ rating: schema.gameRatings.rating, content: schema.gameRatings.content })
        .from(schema.gameRatings)
        .where(and(eq(schema.gameRatings.gameId, game.id), eq(schema.gameRatings.userId, userId)))
        .get()) ?? null;
  }

  return NextResponse.json({
    avg,
    count,
    distribution,
    ratings: ratings.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      pinned: Boolean(r.pinned),
      userName: r.userName,
      createdAt: r.createdAt,
    })),
    myRating,
    pagination: { limit, offset, total: count },
  });
}
