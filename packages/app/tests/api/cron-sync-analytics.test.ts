import { beforeEach, describe, expect, it, vi } from 'vitest';

const kv = { get: vi.fn(), list: vi.fn() };

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onConflictDoUpdate: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { KV: kv, DB: {}, CRON_SECRET: 'cron-secret' } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

import { POST } from '@/app/api/cron/sync-analytics/route';

function makeReq(authHeader?: string) {
  return new Request('http://localhost/api/cron/sync-analytics', {
    method: 'POST',
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

describe('POST /api/cron/sync-analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 第一次 select().from() 是顶层游戏列表查询，没有 .where()，直接被 await 成数组；
    // 之后的 from() 调用都是 select().from().where().get() 链式的中间环节，回退为 mockReturnThis。
    mockDb.from.mockReturnValue(mockDb);
    kv.list.mockResolvedValue({ keys: [] });
    kv.get.mockResolvedValue(null);
  });

  it('CRON_SECRET 配置了但密钥不匹配时返回 401', async () => {
    const res = await POST(makeReq('Bearer wrong'));

    expect(res.status).toBe(401);
  });

  it('密钥正确时通过校验，成功同步（无游戏）', async () => {
    mockDb.from.mockReturnValueOnce([]);

    const res = await POST(makeReq('Bearer cron-secret'));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean; syncedGames: number };
    expect(data).toEqual(expect.objectContaining({ success: true, syncedGames: 0 }));
  });

  it('已有 GameAnalytics 记录时走更新分支，同步来源/设备/场景/选项统计', async () => {
    mockDb.from.mockReturnValueOnce([{ id: 1 }]);
    mockDb.get.mockResolvedValueOnce({ gameId: 1 }); // gameAnalytics 已存在
    kv.get.mockImplementation((key: string) => {
      if (key.endsWith(':opens')) return Promise.resolve('10');
      if (key.endsWith(':completions')) return Promise.resolve('3');
      if (key.endsWith(':duration')) return Promise.resolve('300');
      if (key.endsWith(':sessions')) return Promise.resolve('5');
      if (key.endsWith(':ratings')) return Promise.resolve(JSON.stringify({ count: 2, sum: 9 }));
      if (key.endsWith(':referrers')) return Promise.resolve(JSON.stringify({ 'google.com': 4 }));
      if (key.endsWith(':devices')) return Promise.resolve(JSON.stringify({ mobile: 6 }));
      return Promise.resolve(null);
    });
    kv.list.mockImplementation(({ prefix }: { prefix: string }) => {
      if (prefix.includes('scene:')) return Promise.resolve({ keys: [{ name: 'analytics:game:1:scene:start' }] });
      if (prefix.includes('choice:')) return Promise.resolve({ keys: [{ name: 'analytics:game:1:choice:start:0' }] });
      return Promise.resolve({ keys: [] });
    });

    const res = await POST(makeReq('Bearer cron-secret'));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { syncedGames: number };
    expect(data.syncedGames).toBe(1);
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ openCount: 10, completionCount: 3, totalDuration: 300, sessionCount: 5 }),
    );
    // referrer + device + scene + choice 各触发一次 upsert
    expect(mockDb.onConflictDoUpdate).toHaveBeenCalledTimes(4);
  });

  it('KV/DB 未配置时返回 500', async () => {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValueOnce({ env: {} });

    const res = await POST(makeReq());

    expect(res.status).toBe(500);
  });
});
