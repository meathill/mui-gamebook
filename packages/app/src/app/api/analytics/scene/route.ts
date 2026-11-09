import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';

/**
 * POST /api/analytics/scene
 * 记录场景访问事件
 * Body: { gameId: number, sceneId: string }
 */
export async function POST(request: Request) {
  try {
    const { env } = getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = (await request.json()) as { gameId: number; sceneId: string };
    const { gameId, sceneId } = body;

    if (!gameId || typeof gameId !== 'number') {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    if (!sceneId || typeof sceneId !== 'string') {
      return NextResponse.json({ error: 'sceneId is required' }, { status: 400 });
    }

    // 写时增量落库，避免 cron 定期全量 list KV
    const db = drizzle(env.DB);
    await db.run(sql`
      INSERT INTO SceneAnalytics (game_id, scene_id, visit_count)
      VALUES (${gameId}, ${sceneId}, 1)
      ON CONFLICT (game_id, scene_id) DO UPDATE SET visit_count = COALESCE(visit_count, 0) + 1
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics scene error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
