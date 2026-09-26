import { beforeEach, describe, expect, it, vi } from 'vitest';

function chainable(): Record<string, ReturnType<typeof vi.fn>> {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const k of ['select', 'from', 'where', 'groupBy', 'orderBy', 'limit', 'offset', 'set', 'values', 'leftJoin'])
    c[k] = vi.fn(() => c);
  c.get = vi.fn();
  c.all = vi.fn();
  return c;
}

const mockDb: Record<string, ReturnType<typeof vi.fn>> = {
  ...chainable(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
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

vi.mock('@/lib/game-access', () => ({
  getManagedGame: vi.fn(),
}));

import { GET } from '@/app/api/cms/games/[id]/ratings/route';
import { PATCH } from '@/app/api/cms/games/[id]/ratings/[ratingId]/route';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';

const GAME = { id: 7, slug: 'g', title: '测试作品' };

function makeParams(id = '7') {
  return { params: Promise.resolve({ id }) };
}

function makeRatingParams(id = '7', ratingId = '3') {
  return { params: Promise.resolve({ id, ratingId }) };
}

describe('GET /api/cms/games/[id]/ratings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockDb, chainable(), { insert: vi.fn(), update: vi.fn(), delete: vi.fn() });
    mockDb.update.mockImplementation(() => chainable());
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'owner-1' } });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(GAME);
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/'), makeParams());
    expect(res.status).toBe(401);
  });

  it('无管理权限返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/'), makeParams());
    expect(res.status).toBe(404);
  });

  it('返回均分与全量评价（含隐藏）', async () => {
    (mockDb.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ avg: 3, count: 2 });
    (mockDb.all as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 1, rating: 5, content: '好', hidden: false, pinned: true, createdAt: 2, userName: '甲' },
      { id: 2, rating: 1, content: '差', hidden: true, pinned: false, createdAt: 1, userName: null },
    ]);
    const res = await GET(new Request('http://localhost/'), makeParams());
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      avg: number;
      count: number;
      ratings: { id: number; hidden: boolean }[];
    };
    expect(data.avg).toBe(3);
    expect(data.ratings).toHaveLength(2);
    expect(data.ratings[1].hidden).toBe(true);
  });
});

describe('PATCH /api/cms/games/[id]/ratings/[ratingId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockDb, chainable(), { insert: vi.fn(), update: vi.fn(), delete: vi.fn() });
    mockDb.update.mockImplementation(() => chainable());
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'owner-1' } });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(GAME);
  });

  function makeReq(body: unknown) {
    return new Request('http://localhost/', { method: 'PATCH', body: JSON.stringify(body) });
  }

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await PATCH(makeReq({ hidden: true }), makeRatingParams());
    expect(res.status).toBe(401);
  });

  it('参数全空返回 400', async () => {
    const res = await PATCH(makeReq({}), makeRatingParams());
    expect(res.status).toBe(400);
  });

  it('评价不属于该游戏返回 404', async () => {
    (mockDb.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const res = await PATCH(makeReq({ hidden: true }), makeRatingParams());
    expect(res.status).toBe(404);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('隐藏/置顶成功', async () => {
    (mockDb.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 3, gameId: 7 });
    const res = await PATCH(makeReq({ hidden: true, pinned: true }), makeRatingParams());
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalledOnce();
    expect((await res.json()) as { success: boolean }).toMatchObject({ success: true });
  });
});
