import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import { recordDailyAnalytics } from '@/lib/daily-analytics';

/**
 * POST /api/analytics/complete
 * 记录游戏完成事件
 * Body: { gameId: number, duration: number, rating?: number }
 * - duration: 游戏时长（秒）
 * - rating: 可选，1-5 星评分
 */
export async function POST(request: Request) {
  try {
    const { env } = getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = (await request.json()) as { gameId: number; duration: number; rating?: number };
    const { gameId, duration, rating } = body;

    if (!gameId || typeof gameId !== 'number') {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    if (typeof duration !== 'number' || duration < 0) {
      return NextResponse.json({ error: 'duration must be a positive number' }, { status: 400 });
    }

    const ratingValue = typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : 0;

    // 直接增量写入 D1，避免 KV 读-改-写在并发下丢计数
    const db = drizzle(env.DB);
    await db.run(sql`
      INSERT INTO GameAnalytics (game_id, completion_count, total_duration, session_count, rating_count, rating_sum)
      VALUES (${gameId}, 1, ${duration}, 1, ${ratingValue > 0 ? 1 : 0}, ${ratingValue})
      ON CONFLICT (game_id) DO UPDATE SET
        completion_count = COALESCE(completion_count, 0) + 1,
        total_duration = COALESCE(total_duration, 0) + ${duration},
        session_count = COALESCE(session_count, 0) + 1,
        rating_count = COALESCE(rating_count, 0) + ${ratingValue > 0 ? 1 : 0},
        rating_sum = COALESCE(rating_sum, 0) + ${ratingValue}
    `);

    // 按天落库（失败不影响总量）
    await recordDailyAnalytics(gameId, 'complete');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
