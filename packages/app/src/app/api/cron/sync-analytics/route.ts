import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';

/**
 * POST /api/cron/sync-analytics
 * 从 KV 同步统计数据到 D1 数据库
 * 应由 Cron Job 定期调用（建议每 5-15 分钟）
 */
export async function POST(request: Request) {
  try {
    const { env } = getCloudflareContext();

    if (!env.KV || !env.DB) {
      return NextResponse.json({ error: 'KV or DB not configured' }, { status: 500 });
    }

    // 验证 Cron 密钥（可选，建议在生产环境启用）
    const authHeader = request.headers.get('Authorization');
    const cronSecret = env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = drizzle(env.DB);
    const kv = env.KV;

    // 获取所有游戏
    const games = await db.select({ id: schema.games.id }).from(schema.games);

    let syncedGames = 0;

    for (const game of games) {
      const gameId = game.id;
      const prefix = `analytics:game:${gameId}:`;

      // 获取 KV 中的统计数据
      const opens = parseInt((await kv.get(`${prefix}opens`)) || '0', 10);
      const completions = parseInt((await kv.get(`${prefix}completions`)) || '0', 10);
      const duration = parseInt((await kv.get(`${prefix}duration`)) || '0', 10);
      const sessions = parseInt((await kv.get(`${prefix}sessions`)) || '0', 10);
      const ratingsRaw = await kv.get(`${prefix}ratings`);
      const ratings = ratingsRaw ? JSON.parse(ratingsRaw) : { count: 0, sum: 0 };

      // 更新或插入 GameAnalytics
      const existing = await db
        .select()
        .from(schema.gameAnalytics)
        .where(eq(schema.gameAnalytics.gameId, gameId))
        .get();

      if (existing) {
        await db
          .update(schema.gameAnalytics)
          .set({
            openCount: opens,
            completionCount: completions,
            totalDuration: duration,
            sessionCount: sessions,
            ratingCount: ratings.count,
            ratingSum: ratings.sum,
            syncedAt: new Date(),
          })
          .where(eq(schema.gameAnalytics.gameId, gameId));
      } else {
        await db.insert(schema.gameAnalytics).values({
          gameId,
          openCount: opens,
          completionCount: completions,
          totalDuration: duration,
          sessionCount: sessions,
          ratingCount: ratings.count,
          ratingSum: ratings.sum,
          syncedAt: new Date(),
        });
      }

      // 同步来源统计
      const referrersRaw = await kv.get(`${prefix}referrers`);
      if (referrersRaw) {
        const referrers = JSON.parse(referrersRaw) as Record<string, number>;
        for (const [referrer, count] of Object.entries(referrers)) {
          await db
            .insert(schema.referrerAnalytics)
            .values({ gameId, referrer, count })
            .onConflictDoUpdate({
              target: [schema.referrerAnalytics.gameId, schema.referrerAnalytics.referrer],
              set: { count },
            });
        }
      }

      // 同步设备统计
      const devicesRaw = await kv.get(`${prefix}devices`);
      if (devicesRaw) {
        const devices = JSON.parse(devicesRaw) as Record<string, number>;
        for (const [deviceType, count] of Object.entries(devices)) {
          await db
            .insert(schema.deviceAnalytics)
            .values({ gameId, deviceType, count })
            .onConflictDoUpdate({
              target: [schema.deviceAnalytics.gameId, schema.deviceAnalytics.deviceType],
              set: { count },
            });
        }
      }

      // 同步场景访问（需要遍历 KV，这里简化处理）
      // 注意：KV list 操作可能有性能问题，建议在单独的 API 中处理
      const sceneList = await kv.list({ prefix: `${prefix}scene:` });
      for (const key of sceneList.keys) {
        const sceneId = key.name.replace(`${prefix}scene:`, '');
        const visitCount = parseInt((await kv.get(key.name)) || '0', 10);
        await db
          .insert(schema.sceneAnalytics)
          .values({ gameId, sceneId, visitCount })
          .onConflictDoUpdate({
            target: [schema.sceneAnalytics.gameId, schema.sceneAnalytics.sceneId],
            set: { visitCount },
          });
      }

      // 同步选项点击
      const choiceList = await kv.list({ prefix: `${prefix}choice:` });
      for (const key of choiceList.keys) {
        const parts = key.name.replace(`${prefix}choice:`, '').split(':');
        const sceneId = parts[0];
        const choiceIndex = parseInt(parts[1], 10);
        const clickCount = parseInt((await kv.get(key.name)) || '0', 10);
        await db
          .insert(schema.choiceAnalytics)
          .values({ gameId, sceneId, choiceIndex, clickCount })
          .onConflictDoUpdate({
            target: [schema.choiceAnalytics.gameId, schema.choiceAnalytics.sceneId, schema.choiceAnalytics.choiceIndex],
            set: { clickCount },
          });
      }

      syncedGames++;
    }

    return NextResponse.json({
      success: true,
      syncedGames,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
