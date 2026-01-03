import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getKey, incrementCounter, updateRating } from '@/lib/analytics';

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

    if (!env.KV) {
      return NextResponse.json({ error: 'KV not configured' }, { status: 500 });
    }

    const body = (await request.json()) as { gameId: number; duration: number; rating?: number };
    const { gameId, duration, rating } = body;

    if (!gameId || typeof gameId !== 'number') {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    if (typeof duration !== 'number' || duration < 0) {
      return NextResponse.json({ error: 'duration must be a positive number' }, { status: 400 });
    }

    // 递增完成次数
    await incrementCounter(env.KV, getKey(gameId, 'completions'));

    // 累加总时长
    await incrementCounter(env.KV, getKey(gameId, 'duration'), duration);

    // 递增会话数（用于计算平均时长）
    await incrementCounter(env.KV, getKey(gameId, 'sessions'));

    // 如果有评分，更新评分
    if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
      await updateRating(env.KV, getKey(gameId, 'ratings'), rating);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
