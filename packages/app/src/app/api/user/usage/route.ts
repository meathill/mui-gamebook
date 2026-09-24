import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { getUserDailyUsage, checkUserUsageLimit } from '@/lib/usage-limit';
import { getUserQuotaSnapshot, listSubscriptionsByUser, PLAN_DEFINITIONS } from '@/lib/billing';

/**
 * 获取当前用户的 AI 用量与订阅额度信息
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const [dailyUsage, usageCheck, quota, subscriptions] = await Promise.all([
      getUserDailyUsage(userId),
      checkUserUsageLimit(userId),
      getUserQuotaSnapshot(userId),
      listSubscriptionsByUser(userId),
    ]);

    const isUnlimited = usageCheck.limit === Infinity;
    return NextResponse.json({
      totalTokens: quota.isSubscribed ? quota.periodUsage : dailyUsage.totalTokens,
      limit: isUnlimited ? null : usageCheck.limit,
      remaining: isUnlimited ? null : usageCheck.remaining,
      lastUpdated: dailyUsage.lastUpdated,
      isUnlimited,
      planCode: quota.planCode,
      isSubscribed: quota.isSubscribed,
      periodStart: quota.periodStart?.toISOString() ?? null,
      periodEnd: quota.periodEnd?.toISOString() ?? null,
      periodUsage: quota.periodUsage,
      periodLimit: quota.periodLimit,
      cancelAtPeriodEnd: quota.cancelAtPeriodEnd,
      subscriptionStatus: quota.subscriptionStatus,
      plans: PLAN_DEFINITIONS,
      subscriptions: subscriptions.map((item) => ({
        planCode: item.planCode,
        interval: item.interval,
        status: item.status,
        currentPeriodEnd: item.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: item.cancelAtPeriodEnd,
        monthlyTokenLimit: item.monthlyTokenLimit,
      })),
    });
  } catch (e: unknown) {
    console.error('获取用量信息失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
