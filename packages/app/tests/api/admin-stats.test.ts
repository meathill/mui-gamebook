import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn(),
  get: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {}, ROOT_USER_EMAIL: 'root@x.com' } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

import { GET } from '@/app/api/admin/stats/route';
import { getSession } from '@/lib/auth-server';

function makeReq(query = '') {
  return new Request(`http://localhost/api/admin/stats${query}`);
}

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(makeReq());

    expect(res.status).toBe(401);
  });

  it('非 root 用户返回 403', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'user@x.com' } });

    const res = await GET(makeReq());

    expect(res.status).toBe(403);
  });

  it('root 用户成功获取全站统计并计算衍生指标', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'root@x.com' } });
    mockDb.offset.mockResolvedValueOnce([
      {
        id: 1,
        slug: 'game-a',
        title: 'A',
        openCount: 40,
        completionCount: 10,
        totalDuration: 800,
        sessionCount: 20,
        ratingSum: 9,
        ratingCount: 3,
      },
    ]);
    mockDb.get
      .mockResolvedValueOnce({ totalOpens: 40, totalCompletions: 10, totalRatings: 3, totalRatingSum: 9 })
      .mockResolvedValueOnce({ count: 1 });

    const res = await GET(makeReq());

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      analytics: Array<{ completionRate: number; avgDuration: number; avgRating: number }>;
    };
    expect(data.analytics[0].completionRate).toBe(25);
    expect(data.analytics[0].avgDuration).toBe(40);
    expect(data.analytics[0].avgRating).toBe(3);
  });
});
