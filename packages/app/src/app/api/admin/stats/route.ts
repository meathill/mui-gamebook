import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { asc, desc, eq, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { isAdminUser } from '@/lib/admin';
import { getSession } from '@/lib/auth-server';
import { parseListQuery } from '@/lib/list-query';

interface GameAnalyticsResult {
  id: number;
  slug: string;
  title: string;
  openCount: number;
  completionCount: number;
  completionRate: number;
  avgDuration: number;
  avgRating: number;
  ratingCount: number;
}

/** 可排序字段：键 → drizzle 列 */
const STATS_SORT_COLUMNS = {
  openCount: sql`COALESCE(${schema.gameAnalytics.openCount}, 0)`,
  completionCount: sql`COALESCE(${schema.gameAnalytics.completionCount}, 0)`,
  avgRating: sql`COALESCE(${schema.gameAnalytics.ratingSum}, 0) * 1.0 / MAX(COALESCE(${schema.gameAnalytics.ratingCount}, 0), 1)`,
  title: schema.games.title,
} as const;

/**
 * GET /api/admin/stats
 * 获取全站游戏的统计数据汇总，root 与内容管理员可见
 * Query: ?page=1&limit=20&sort=openCount|completionCount|avgRating|title&order=asc|desc
 */
export async function GET(request: Request) {
  try {
    // 验证用户身份
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { env } = getCloudflareContext();
    if (!env.DB) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // root 或内容管理员
    if (!isAdminUser(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = drizzle(env.DB);
    const url = new URL(request.url);

    const query = parseListQuery(url, {
      allowedSorts: Object.keys(STATS_SORT_COLUMNS),
      defaultSort: 'openCount',
    });
    const sortColumn =
      STATS_SORT_COLUMNS[query.sort as keyof typeof STATS_SORT_COLUMNS] ?? STATS_SORT_COLUMNS.openCount;

    // 获取所有游戏的统计数据
    const results = await db
      .select({
        id: schema.games.id,
        slug: schema.games.slug,
        title: schema.games.title,
        openCount: sql<number>`COALESCE(${schema.gameAnalytics.openCount}, 0)`,
        completionCount: sql<number>`COALESCE(${schema.gameAnalytics.completionCount}, 0)`,
        totalDuration: sql<number>`COALESCE(${schema.gameAnalytics.totalDuration}, 0)`,
        sessionCount: sql<number>`COALESCE(${schema.gameAnalytics.sessionCount}, 0)`,
        ratingSum: sql<number>`COALESCE(${schema.gameAnalytics.ratingSum}, 0)`,
        ratingCount: sql<number>`COALESCE(${schema.gameAnalytics.ratingCount}, 0)`,
      })
      .from(schema.games)
      .leftJoin(schema.gameAnalytics, eq(schema.games.id, schema.gameAnalytics.gameId))
      .orderBy(query.order === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(query.limit)
      .offset(query.offset);

    // 计算衍生指标
    const analytics: GameAnalyticsResult[] = results.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      openCount: row.openCount,
      completionCount: row.completionCount,
      completionRate: row.openCount > 0 ? (row.completionCount / row.openCount) * 100 : 0,
      avgDuration: row.sessionCount > 0 ? row.totalDuration / row.sessionCount : 0,
      avgRating: row.ratingCount > 0 ? row.ratingSum / row.ratingCount : 0,
      ratingCount: row.ratingCount,
    }));

    // 获取总体统计
    const totals = await db
      .select({
        totalOpens: sql<number>`COALESCE(SUM(${schema.gameAnalytics.openCount}), 0)`,
        totalCompletions: sql<number>`COALESCE(SUM(${schema.gameAnalytics.completionCount}), 0)`,
        totalRatings: sql<number>`COALESCE(SUM(${schema.gameAnalytics.ratingCount}), 0)`,
        totalRatingSum: sql<number>`COALESCE(SUM(${schema.gameAnalytics.ratingSum}), 0)`,
      })
      .from(schema.gameAnalytics)
      .get();

    // 获取游戏总数
    const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.games).get();

    const totalGames = countResult?.count || 0;

    return NextResponse.json({
      analytics,
      summary: {
        totalOpens: totals?.totalOpens || 0,
        totalCompletions: totals?.totalCompletions || 0,
        overallCompletionRate:
          totals && totals.totalOpens > 0 ? ((totals.totalCompletions / totals.totalOpens) * 100).toFixed(1) : '0',
        avgRating: totals && totals.totalRatings > 0 ? (totals.totalRatingSum / totals.totalRatings).toFixed(1) : '0',
        totalRatings: totals?.totalRatings || 0,
      },
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalGames,
        totalPages: Math.ceil(totalGames / query.limit),
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
