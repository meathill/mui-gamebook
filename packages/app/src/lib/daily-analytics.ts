import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

export type DailyAnalyticsEventType = 'open' | 'complete';

/** 当前 UTC 日期，格式 YYYY-MM-DD */
export function getUtcDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * 向 GameDailyAnalytics 记录每日事件增量（UPSERT）。
 * 失败仅打日志不阻断主流程——KV 与 GameAnalytics 总量不受影响，只缺按天数据。
 */
export async function recordDailyAnalytics(gameId: number, type: DailyAnalyticsEventType): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    const db = drizzle(env.DB);

    await db.run(sql`
      INSERT INTO GameDailyAnalytics (game_id, date, open_count, completion_count)
      VALUES (${gameId}, ${getUtcDate()}, ${type === 'open' ? 1 : 0}, ${type === 'complete' ? 1 : 0})
      ON CONFLICT (game_id, date) DO UPDATE SET
        open_count = open_count + excluded.open_count,
        completion_count = completion_count + excluded.completion_count
    `);
  } catch (error) {
    console.error('[Daily Analytics] 记录每日统计失败:', error);
  }
}
