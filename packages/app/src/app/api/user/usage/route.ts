import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getUserDailyUsage, checkUserUsageLimit } from '@/lib/usage-limit';
import { getConfig } from '@/lib/config';

/**
 * 获取当前用户的 AI 用量信息
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const [usage, usageCheck, config] = await Promise.all([
      getUserDailyUsage(userId),
      checkUserUsageLimit(userId),
      getConfig(),
    ]);

    return NextResponse.json({
      totalTokens: usage.totalTokens,
      limit: usageCheck.limit === Infinity ? null : usageCheck.limit,
      remaining: usageCheck.remaining === Infinity ? null : usageCheck.remaining,
      lastUpdated: usage.lastUpdated,
      isUnlimited: config.adminUserIds.includes(userId),
    });
  } catch (e: unknown) {
    console.error('获取用量信息失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
