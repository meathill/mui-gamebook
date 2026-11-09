import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';
import { parseDeviceType, parseReferrer } from '@/lib/analytics';
import { recordDailyAnalytics } from '@/lib/daily-analytics';

/**
 * POST /api/analytics/open
 * 记录游戏打开事件
 * Body: { gameId: number }
 * Headers: Referer, User-Agent
 */
export async function POST(request: Request) {
  try {
    const { env } = getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = (await request.json()) as { gameId: number };
    const { gameId } = body;

    if (!gameId || typeof gameId !== 'number') {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    // 获取来源和设备信息
    const referrerDomain = parseReferrer(request.headers.get('referer'));
    const deviceType = parseDeviceType(request.headers.get('user-agent'));

    // 直接增量写入 D1，避免 KV 读-改-写在并发下丢计数
    const db = drizzle(env.DB);
    await db.run(sql`
      INSERT INTO GameAnalytics (game_id, open_count)
      VALUES (${gameId}, 1)
      ON CONFLICT (game_id) DO UPDATE SET open_count = COALESCE(open_count, 0) + 1
    `);

    await db.run(sql`
      INSERT INTO ReferrerAnalytics (game_id, referrer, count)
      VALUES (${gameId}, ${referrerDomain}, 1)
      ON CONFLICT (game_id, referrer) DO UPDATE SET count = COALESCE(count, 0) + 1
    `);

    await db.run(sql`
      INSERT INTO DeviceAnalytics (game_id, device_type, count)
      VALUES (${gameId}, ${deviceType}, 1)
      ON CONFLICT (game_id, device_type) DO UPDATE SET count = COALESCE(count, 0) + 1
    `);

    // 按天落库（失败不影响总量）
    await recordDailyAnalytics(gameId, 'open');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics open error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
