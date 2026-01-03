import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { getSession } from '@/lib/auth-server';

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

/**
 * GET /api/admin/analytics
 * 获取所有游戏的统计数据汇总
 * Query: ?sort=opens|completions|rating&order=asc|desc&page=1&limit=20
 */
export async function GET(request: Request) {
  try {
    // 验证用户身份
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { env } = getCloudflareContext();
    if (!env.DB) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const db = drizzle(env.DB);
    const url = new URL(request.url);

    // 分页参数
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    // 获取当前用户的游戏和统计数据
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
      .where(eq(schema.games.ownerId, session.user.id))
      .limit(limit)
      .offset(offset);

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
      .innerJoin(schema.games, eq(schema.games.id, schema.gameAnalytics.gameId))
      .where(eq(schema.games.ownerId, session.user.id))
      .get();

    // 获取游戏总数
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.games)
      .where(eq(schema.games.ownerId, session.user.id))
      .get();

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
        page,
        limit,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
