import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getUserDailyUsage } from '@/lib/usage-limit';
import { getConfig } from '@/lib/config';

/**
 * 查询用户用量信息（管理员接口）
 */
export async function GET(req: Request) {
  try {
    const { env } = getCloudflareContext();
    const secret = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

    // 验证管理员密码
    const authHeader = req.headers.get('Authorization');
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '缺少 userId 参数' }, { status: 400 });
    }

    const [usage, config] = await Promise.all([
      getUserDailyUsage(userId),
      getConfig(),
    ]);

    return NextResponse.json({
      userId,
      usage,
      limit: config.dailyTokenLimit,
      remaining: Math.max(0, config.dailyTokenLimit - usage.totalTokens),
      isAdmin: config.adminUserIds.includes(userId),
    });
  } catch (e: unknown) {
    console.error('查询用量失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
