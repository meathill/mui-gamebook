import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/usage-limit', () => ({
  getUserDailyUsage: vi.fn(),
  checkUserUsageLimit: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

vi.mock('@/lib/billing', () => ({
  getUserQuotaSnapshot: vi.fn(),
  listSubscriptionsByUser: vi.fn(async () => []),
  PLAN_DEFINITIONS: {
    basic: { code: 'basic', name: '基础', monthlyPriceUsd: 9.98, yearlyPriceUsd: 99.98, monthlyTokenLimit: 1_000_000 },
    pro: { code: 'pro', name: '专业', monthlyPriceUsd: 19.98, yearlyPriceUsd: 199.98, monthlyTokenLimit: 2_000_000 },
  },
}));

import { GET } from '@/app/api/user/usage/route';
import { getSession } from '@/lib/auth-server';
import { getConfig } from '@/lib/config';
import { getUserQuotaSnapshot } from '@/lib/billing';
import { checkUserUsageLimit, getUserDailyUsage } from '@/lib/usage-limit';

describe('GET /api/user/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('普通用户返回具体的 limit/remaining 数值', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getUserDailyUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalTokens: 3000,
      lastUpdated: '2026-07-01T00:00:00.000Z',
    });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ limit: 100000, remaining: 97000 });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ adminUserIds: [] });
    (getUserQuotaSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      planCode: 'free',
      isSubscribed: false,
      isUnlimited: false,
      periodStart: null,
      periodEnd: null,
      periodUsage: 0,
      periodLimit: null,
      cancelAtPeriodEnd: false,
      subscriptionStatus: null,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const data = (await res.json()) as { limit: number; remaining: number; isUnlimited: boolean };
    expect(data.limit).toBe(100000);
    expect(data.remaining).toBe(97000);
    expect(data.isUnlimited).toBe(false);
  });

  it('管理员用户的 Infinity 限额转换为 null，isUnlimited 为 true', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'admin1' } });
    (getUserDailyUsage as ReturnType<typeof vi.fn>).mockResolvedValue({ totalTokens: 0, lastUpdated: '' });
    (checkUserUsageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ limit: Infinity, remaining: Infinity });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ adminUserIds: ['admin1'] });
    (getUserQuotaSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      planCode: 'admin',
      isSubscribed: false,
      isUnlimited: true,
      periodStart: null,
      periodEnd: null,
      periodUsage: 0,
      periodLimit: null,
      cancelAtPeriodEnd: false,
      subscriptionStatus: null,
    });

    const res = await GET();

    const data = (await res.json()) as { limit: number | null; remaining: number | null; isUnlimited: boolean };
    expect(data.limit).toBeNull();
    expect(data.remaining).toBeNull();
    expect(data.isUnlimited).toBe(true);
  });
});
