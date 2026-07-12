import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { ADMIN_PASSWORD: 'test-secret' } })),
}));

vi.mock('@/lib/usage-limit', () => ({
  getUserDailyUsage: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
}));

import { GET } from '@/app/api/admin/usage/route';
import { getConfig } from '@/lib/config';
import { getUserDailyUsage } from '@/lib/usage-limit';

function makeReq(query: string, authHeader?: string) {
  return new Request(`http://localhost/api/admin/usage${query}`, {
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

describe('GET /api/admin/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('密钥错误返回 401', async () => {
    const res = await GET(makeReq('?userId=u1', 'Bearer wrong'));

    expect(res.status).toBe(401);
  });

  it('缺少 userId 返回 400', async () => {
    const res = await GET(makeReq('', 'Bearer test-secret'));

    expect(res.status).toBe(400);
  });

  it('成功路径：返回用量、上限、剩余量、是否管理员', async () => {
    (getUserDailyUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalTokens: 30000,
      lastUpdated: '2026-07-01T00:00:00.000Z',
    });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      dailyTokenLimit: 100000,
      adminUserIds: ['admin1'],
    });

    const res = await GET(makeReq('?userId=u1', 'Bearer test-secret'));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { limit: number; remaining: number; isAdmin: boolean };
    expect(data.limit).toBe(100000);
    expect(data.remaining).toBe(70000);
    expect(data.isAdmin).toBe(false);
  });

  it('用量超过上限时 remaining 不为负数', async () => {
    (getUserDailyUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalTokens: 150000,
      lastUpdated: '',
    });
    (getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ dailyTokenLimit: 100000, adminUserIds: [] });

    const res = await GET(makeReq('?userId=u1', 'Bearer test-secret'));

    const data = (await res.json()) as { remaining: number };
    expect(data.remaining).toBe(0);
  });
});
