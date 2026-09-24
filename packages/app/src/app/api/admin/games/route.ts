import { getCloudflareContext } from '@opennextjs/cloudflare';
import { asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import * as schema from '@/db/schema';
import { isAdminUser } from '@/lib/admin';
import { OPEN_COUNT_SUBQUERY } from '@/lib/admin-queries';
import { getSession } from '@/lib/auth-server';
import { parseEnumFilter, parseListQuery } from '@/lib/list-query';

/** 可排序字段：键 → drizzle 列，未知键回退默认值 */
const GAME_SORT_COLUMNS = {
  updatedAt: schema.games.updatedAt,
  createdAt: schema.games.createdAt,
  title: schema.games.title,
  openCount: OPEN_COUNT_SUBQUERY,
} as const;

const STATUS_FILTERS = ['all', 'published', 'draft', 'banned'] as const;

/**
 * GET /api/admin/games
 * 获取全站游戏列表（分页 + 搜索 + 排序 + 状态筛选），root 与内容管理员可用
 * Query: ?page=1&limit=20&search=xxx&sort=updatedAt&order=desc&status=all|published|draft|banned
 * 搜索匹配 title/slug/作者邮箱
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !isAdminUser(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);
    const url = new URL(request.url);

    const query = parseListQuery(url, {
      allowedSorts: Object.keys(GAME_SORT_COLUMNS),
      defaultSort: 'updatedAt',
    });
    const status = parseEnumFilter(url.searchParams.get('status'), STATUS_FILTERS, 'all');

    const conditions = [];
    if (query.search) {
      conditions.push(
        or(
          like(schema.games.title, `%${query.search}%`),
          like(schema.games.slug, `%${query.search}%`),
          like(schema.user.email, `%${query.search}%`),
        ),
      );
    }
    if (status === 'published') conditions.push(eq(schema.games.published, true));
    else if (status === 'draft') conditions.push(eq(schema.games.published, false));
    else if (status === 'banned') conditions.push(eq(schema.games.shadowBanned, true));

    const where = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;
    const sortColumn = GAME_SORT_COLUMNS[query.sort as keyof typeof GAME_SORT_COLUMNS] ?? GAME_SORT_COLUMNS.updatedAt;

    const baseQuery = db
      .select({
        id: schema.games.id,
        slug: schema.games.slug,
        title: schema.games.title,
        published: schema.games.published,
        shadowBanned: schema.games.shadowBanned,
        ownerEmail: schema.user.email,
        createdAt: schema.games.createdAt,
        updatedAt: schema.games.updatedAt,
        openCount: OPEN_COUNT_SUBQUERY,
      })
      .from(schema.games)
      .leftJoin(schema.user, eq(schema.games.ownerId, schema.user.id));

    const ordered = baseQuery.orderBy(query.order === 'asc' ? asc(sortColumn) : desc(sortColumn));
    const games = await (where ? ordered.where(where) : ordered).limit(query.limit).offset(query.offset);

    const countBase = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.games)
      .leftJoin(schema.user, eq(schema.games.ownerId, schema.user.id));
    const countResult = await (where ? countBase.where(where) : countBase).get();
    const total = countResult?.count || 0;

    return NextResponse.json({
      games: games.map((game) => ({
        ...game,
        published: Boolean(game.published),
        shadowBanned: Boolean(game.shadowBanned),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    console.error('Admin games list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
