import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { NextResponse } from 'next/server';

/**
 * POST /api/analytics/choice
 * 记录选项点击事件
 * Body: { gameId: number, sceneId: string, choiceIndex: number }
 */
export async function POST(request: Request) {
  try {
    const { env } = getCloudflareContext();

    if (!env.DB) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = (await request.json()) as { gameId: number; sceneId: string; choiceIndex: number };
    const { gameId, sceneId, choiceIndex } = body;

    if (!gameId || typeof gameId !== 'number') {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    if (!sceneId || typeof sceneId !== 'string') {
      return NextResponse.json({ error: 'sceneId is required' }, { status: 400 });
    }

    if (typeof choiceIndex !== 'number') {
      return NextResponse.json({ error: 'choiceIndex is required' }, { status: 400 });
    }

    // 写时增量落库，避免 cron 定期全量 list KV
    const db = drizzle(env.DB);
    await db.run(sql`
      INSERT INTO ChoiceAnalytics (game_id, scene_id, choice_index, click_count)
      VALUES (${gameId}, ${sceneId}, ${choiceIndex}, 1)
      ON CONFLICT (game_id, scene_id, choice_index) DO UPDATE SET click_count = COALESCE(click_count, 0) + 1
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics choice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
