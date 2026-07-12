import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn(),
  get: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {} } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

import { GET } from '@/app/api/admin/analytics/route';
import { getSession } from '@/lib/auth-server';

function makeReq(query = '') {
  return new Request(`http://localhost/api/admin/analytics${query}`);
}

describe('GET /api/admin/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(makeReq());

    expect(res.status).toBe(401);
  });

  it('成功路径：分页返回当前用户游戏的统计并计算衍生指标', async () => {
    mockDb.offset.mockResolvedValueOnce([
      {
        id: 1,
        slug: 'my-game',
        title: '我的游戏',
        openCount: 100,
        completionCount: 25,
        totalDuration: 5000,
        sessionCount: 50,
        ratingSum: 18,
        ratingCount: 4,
      },
    ]);
    mockDb.get
      .mockResolvedValueOnce({ totalOpens: 100, totalCompletions: 25, totalRatings: 4, totalRatingSum: 18 })
      .mockResolvedValueOnce({ count: 1 });

    const res = await GET(makeReq('?page=1&limit=20'));

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      analytics: Array<{ completionRate: number; avgDuration: number; avgRating: number }>;
      summary: { overallCompletionRate: string; avgRating: string };
      pagination: { total: number; totalPages: number };
    };
    expect(data.analytics[0].completionRate).toBe(25);
    expect(data.analytics[0].avgDuration).toBe(100);
    expect(data.analytics[0].avgRating).toBe(4.5);
    expect(data.summary.overallCompletionRate).toBe('25.0');
    expect(data.summary.avgRating).toBe('4.5');
    expect(data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('limit 参数超过 100 时被截断为 100', async () => {
    mockDb.offset.mockResolvedValueOnce([]);
    mockDb.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);

    const res = await GET(makeReq('?limit=500'));

    const data = (await res.json()) as { pagination: { limit: number } };
    expect(data.pagination.limit).toBe(100);
  });
});
