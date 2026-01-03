import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getKey, incrementCounter } from '@/lib/analytics';

/**
 * POST /api/analytics/scene
 * 记录场景访问事件
 * Body: { gameId: number, sceneId: string }
 */
export async function POST(request: Request) {
  try {
    const { env } = getCloudflareContext();

    if (!env.KV) {
      return NextResponse.json({ error: 'KV not configured' }, { status: 500 });
    }

    const body = (await request.json()) as { gameId: number; sceneId: string };
    const { gameId, sceneId } = body;

    if (!gameId || typeof gameId !== 'number') {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    if (!sceneId || typeof sceneId !== 'string') {
      return NextResponse.json({ error: 'sceneId is required' }, { status: 400 });
    }

    // 递增场景访问计数
    await incrementCounter(env.KV, getKey(gameId, 'scene', sceneId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics scene error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
