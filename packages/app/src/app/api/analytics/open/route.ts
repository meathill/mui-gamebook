import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getKey, incrementCounter, incrementJsonKey, parseDeviceType, parseReferrer } from '@/lib/analytics';

/**
 * POST /api/analytics/open
 * 记录游戏打开事件
 * Body: { gameId: number }
 * Headers: Referer, User-Agent
 */
export async function POST(request: Request) {
  try {
    const { env } = getCloudflareContext();

    if (!env.KV) {
      return NextResponse.json({ error: 'KV not configured' }, { status: 500 });
    }

    const body = (await request.json()) as { gameId: number };
    const { gameId } = body;

    if (!gameId || typeof gameId !== 'number') {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    // 获取来源和设备信息
    const referrer = request.headers.get('referer');
    const userAgent = request.headers.get('user-agent');

    // 递增打开计数
    await incrementCounter(env.KV, getKey(gameId, 'opens'));

    // 递增来源统计
    const referrerDomain = parseReferrer(referrer);
    await incrementJsonKey(env.KV, getKey(gameId, 'referrers'), referrerDomain);

    // 递增设备统计
    const deviceType = parseDeviceType(userAgent);
    await incrementJsonKey(env.KV, getKey(gameId, 'devices'), deviceType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics open error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
