import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getKey, incrementCounter } from '@/lib/analytics';

/**
 * POST /api/analytics/choice
 * 记录选项点击事件
 * Body: { gameId: number, sceneId: string, choiceIndex: number }
 */
export async function POST(request: Request) {
  try {
    const { env } = getCloudflareContext();

    if (!env.KV) {
      return NextResponse.json({ error: 'KV not configured' }, { status: 500 });
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

    // 递增选项点击计数
    await incrementCounter(env.KV, getKey(gameId, 'choice', sceneId, choiceIndex));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics choice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
