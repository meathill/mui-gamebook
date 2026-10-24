import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { gte, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { isAdminUser } from '@/lib/admin';
import { getSession } from '@/lib/auth-server';

export interface DailyPoint {
  /** UTC 日期，YYYY-MM-DD */
  date: string;
  openCount: number;
  completionCount: number;
  newUsers: number;
  newGames: number;
  totalTokens: number;
  imageCount: number;
  videoCount: number;
  audioCount: number;
}

/** 允许的统计范围（天），上期对比取等长周期 */
const ALLOWED_DAYS = [7, 30, 90] as const;

const DAY_MS = 86_400_000;

/** 今天 UTC 0 点起、往前 offsetDays 天的 Date（offsetDays=0 即今天 0 点） */
function utcDayStart(offsetDays: number): Date {
  const now = new Date();
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(todayStart - offsetDays * DAY_MS);
}

function toUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 生成 [offsetEnd, offsetStart] 区间内每天的日期列表（offset 为距今天数，升序返回） */
function buildDateRange(offsetStart: number, offsetEnd: number): string[] {
  const dates: string[] = [];
  for (let offset = offsetEnd; offset >= offsetStart; offset--) {
    dates.push(toUtcDate(utcDayStart(offset)));
  }
  return dates;
}

function emptyPoint(date: string): DailyPoint {
  return {
    date,
    openCount: 0,
    completionCount: 0,
    newUsers: 0,
    newGames: 0,
    totalTokens: 0,
    imageCount: 0,
    videoCount: 0,
    audioCount: 0,
  };
}

/**
 * GET /api/admin/stats/daily
 * 全站按天统计（本期 + 上一等长周期），root 与内容管理员可见
 * Query: ?days=7|30|90
 * 打开/完成数来自 GameDailyAnalytics（上线后才有数据），其余按 created_at 分 UTC 日聚合
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdminUser(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { env } = getCloudflareContext();
    if (!env.DB) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const url = new URL(request.url);
    const parsedDays = Number(url.searchParams.get('days'));
    const days = (ALLOWED_DAYS as readonly number[]).includes(parsedDays) ? parsedDays : 30;

    // 本期 [days-1, 0]，上期 [2*days-1, days]；查询统一从上期起点开始
    const currentDates = buildDateRange(days - 1, 0);
    const previousDates = buildDateRange(2 * days - 1, days);
    const since = utcDayStart(2 * days - 1);

    const db = drizzle(env.DB);

    const [dailyRows, aiUsageRows, userRows, gameRows] = await Promise.all([
      db
        .select({
          date: schema.gameDailyAnalytics.date,
          openCount: sql<number>`SUM(${schema.gameDailyAnalytics.openCount})`,
          completionCount: sql<number>`SUM(${schema.gameDailyAnalytics.completionCount})`,
        })
        .from(schema.gameDailyAnalytics)
        .where(gte(schema.gameDailyAnalytics.date, toUtcDate(since)))
        .groupBy(schema.gameDailyAnalytics.date),
      db
        .select({
          date: sql<string>`DATE(${schema.aiUsage.createdAt}, 'unixepoch')`,
          totalTokens: sql<number>`SUM(${schema.aiUsage.totalTokens})`,
          imageCount: sql<number>`SUM(CASE WHEN ${schema.aiUsage.type} = 'image_generation' THEN 1 ELSE 0 END)`,
          videoCount: sql<number>`SUM(CASE WHEN ${schema.aiUsage.type} = 'video_generation' THEN 1 ELSE 0 END)`,
          audioCount: sql<number>`SUM(CASE WHEN ${schema.aiUsage.type} = 'audio_generation' THEN 1 ELSE 0 END)`,
        })
        .from(schema.aiUsage)
        .where(gte(schema.aiUsage.createdAt, since))
        .groupBy(sql`DATE(${schema.aiUsage.createdAt}, 'unixepoch')`),
      db
        .select({
          date: sql<string>`DATE(${schema.user.createdAt}, 'unixepoch')`,
          newUsers: sql<number>`COUNT(*)`,
        })
        .from(schema.user)
        .where(gte(schema.user.createdAt, since))
        .groupBy(sql`DATE(${schema.user.createdAt}, 'unixepoch')`),
      db
        .select({
          date: sql<string>`DATE(${schema.games.createdAt}, 'unixepoch')`,
          newGames: sql<number>`COUNT(*)`,
        })
        .from(schema.games)
        .where(gte(schema.games.createdAt, since))
        .groupBy(sql`DATE(${schema.games.createdAt}, 'unixepoch')`),
    ]);

    const byDate = new Map<string, Partial<DailyPoint>>();
    for (const row of dailyRows) {
      byDate.set(row.date, {
        openCount: row.openCount || 0,
        completionCount: row.completionCount || 0,
      });
    }
    for (const row of aiUsageRows) {
      const point = byDate.get(row.date) ?? {};
      point.totalTokens = row.totalTokens || 0;
      point.imageCount = row.imageCount || 0;
      point.videoCount = row.videoCount || 0;
      point.audioCount = row.audioCount || 0;
      byDate.set(row.date, point);
    }
    for (const row of userRows) {
      const point = byDate.get(row.date) ?? {};
      point.newUsers = row.newUsers || 0;
      byDate.set(row.date, point);
    }
    for (const row of gameRows) {
      const point = byDate.get(row.date) ?? {};
      point.newGames = row.newGames || 0;
      byDate.set(row.date, point);
    }

    const resolveRange = (dates: string[]): DailyPoint[] =>
      dates.map((date) => ({ ...emptyPoint(date), ...byDate.get(date) }));

    return NextResponse.json({
      days: resolveRange(currentDates),
      previous: resolveRange(previousDates),
    });
  } catch (error) {
    console.error('Admin daily stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
