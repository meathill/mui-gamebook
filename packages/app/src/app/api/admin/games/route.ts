import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq, like, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';
import { isRootUser } from '@/lib/config';

/**
 * GET /api/admin/games
 * 获取全站游戏列表（分页 + 搜索），仅管理员可用
 * Query: ?page=1&limit=20&search=xxx（搜索 title/slug/作者邮箱）
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isRootUser(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const url = new URL(request.url);

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';

    const searchCondition = search
      ? or(
          like(schema.games.title, `%${search}%`),
          like(schema.games.slug, `%${search}%`),
          like(schema.user.email, `%${search}%`),
        )
      : undefined;

    const baseQuery = db
      .select({
        id: schema.games.id,
        slug: schema.games.slug,
        title: schema.games.title,
        published: schema.games.published,
        ownerEmail: schema.user.email,
        createdAt: schema.games.createdAt,
        updatedAt: schema.games.updatedAt,
      })
      .from(schema.games)
      .leftJoin(schema.user, eq(schema.games.ownerId, schema.user.id));

    const games = await (searchCondition ? baseQuery.where(searchCondition) : baseQuery)
      .orderBy(sql`${schema.games.updatedAt} DESC`)
      .limit(limit)
      .offset(offset);

    const countBase = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.games)
      .leftJoin(schema.user, eq(schema.games.ownerId, schema.user.id));
    const countResult = await (searchCondition ? countBase.where(searchCondition) : countBase).get();
    const total = countResult?.count || 0;

    return NextResponse.json({
      games: games.map((game) => ({ ...game, published: Boolean(game.published) })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin games list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
