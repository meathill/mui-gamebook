import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/admin', () => ({
  isRootUser: vi.fn(),
  isAdminUser: vi.fn((user: { email?: string } | null | undefined) => user?.email === 'root@example.com'),
  isAdminUserId: vi.fn(),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { GET } from '@/app/api/admin/stats/daily/route';
import { getSession } from '@/lib/auth-server';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * mock 四条按天聚合查询（Promise.all 按数组顺序同步构造，
 * groupBy 的 mockResolvedValueOnce 队列依次对应：
 * GameDailyAnalytics / AiUsage / user / Games）
 */
function mockDailyDb(rowsList: unknown[][]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'from', 'where', 'groupBy']) {
    chain[method] = vi.fn(() => chain);
  }
  for (const rows of rowsList) {
    chain.groupBy.mockResolvedValueOnce(rows);
  }
  (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

describe('GET /api/admin/stats/daily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: { DB: {} } });
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'root@example.com' } });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/admin/stats/daily'));
    expect(res.status).toBe(401);
  });

  it('非管理员返回 403', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'user@example.com' } });

    const res = await GET(new Request('http://localhost/api/admin/stats/daily'));
    expect(res.status).toBe(403);
  });

  it('默认返回 30 天本期 + 30 天上期，无数据日期补 0', async () => {
    mockDailyDb([[], [], [], []]);

    const res = await GET(new Request('http://localhost/api/admin/stats/daily'));
    expect(res.status).toBe(200);

    const data = (await res.json()) as { days: unknown[]; previous: unknown[] };
    expect(data.days).toHaveLength(30);
    expect(data.previous).toHaveLength(30);
    const last = data.days[29] as { date: string; openCount: number };
    expect(last.date).toBe(todayUtc());
    expect(last.openCount).toBe(0);
  });

  it('按日期合并四类指标，落在对应日期上', async () => {
    const today = todayUtc();
    mockDailyDb([
      [{ date: today, openCount: 12, completionCount: 3 }],
      [{ date: today, totalTokens: 5000, imageCount: 2, videoCount: 1, audioCount: 4 }],
      [{ date: today, newUsers: 5 }],
      [],
    ]);

    const res = await GET(new Request('http://localhost/api/admin/stats/daily?days=7'));
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      days: Array<{
        date: string;
        openCount: number;
        completionCount: number;
        newUsers: number;
        newGames: number;
        totalTokens: number;
        imageCount: number;
        videoCount: number;
        audioCount: number;
      }>;
      previous: Array<{ date: string; openCount: number }>;
    };
    expect(data.days).toHaveLength(7);
    const last = data.days[6];
    expect(last.date).toBe(today);
    expect(last.openCount).toBe(12);
    expect(last.completionCount).toBe(3);
    expect(last.totalTokens).toBe(5000);
    expect(last.imageCount).toBe(2);
    expect(last.videoCount).toBe(1);
    expect(last.audioCount).toBe(4);
    expect(last.newUsers).toBe(5);
    expect(last.newGames).toBe(0);
    // 上期周期与本期不重叠，且无数据补 0
    expect(data.previous).toHaveLength(7);
    expect(data.previous[6].date < data.days[0].date).toBe(true);
    expect(data.previous[6].openCount).toBe(0);
  });

  it('非法 days 回退 30，超出上限也回退 30', async () => {
    mockDailyDb([[], [], [], []]);

    const res = await GET(new Request('http://localhost/api/admin/stats/daily?days=DROP%20TABLE'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { days: unknown[] };
    expect(data.days).toHaveLength(30);

    mockDailyDb([[], [], [], []]);
    const res2 = await GET(new Request('http://localhost/api/admin/stats/daily?days=200'));
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as { days: unknown[] };
    expect(data2.days).toHaveLength(30);
  });

  it('允许 days=90', async () => {
    mockDailyDb([[], [], [], []]);

    const res = await GET(new Request('http://localhost/api/admin/stats/daily?days=90'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { days: unknown[]; previous: unknown[] };
    expect(data.days).toHaveLength(90);
    expect(data.previous).toHaveLength(90);
  });
});
