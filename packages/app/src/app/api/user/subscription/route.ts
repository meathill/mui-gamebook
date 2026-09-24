import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import {
  getUserQuotaSnapshot,
  listSubscriptionsByUser,
  PLAN_DEFINITIONS,
  PLAN_TOKEN_UNIT_PRICE_USD,
} from '@/lib/billing';

/**
 * 当前用户订阅摘要
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const [quota, subscriptions] = await Promise.all([getUserQuotaSnapshot(userId), listSubscriptionsByUser(userId)]);

    return NextResponse.json({
      planCode: quota.planCode,
      isSubscribed: quota.isSubscribed,
      isUnlimited: quota.isUnlimited,
      periodStart: quota.periodStart?.toISOString() ?? null,
      periodEnd: quota.periodEnd?.toISOString() ?? null,
      periodUsage: quota.periodUsage,
      periodLimit: quota.periodLimit,
      cancelAtPeriodEnd: quota.cancelAtPeriodEnd,
      subscriptionStatus: quota.subscriptionStatus,
      plans: PLAN_DEFINITIONS,
      tokenUnitPriceUsd: PLAN_TOKEN_UNIT_PRICE_USD,
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
    console.error('获取订阅信息失败:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
