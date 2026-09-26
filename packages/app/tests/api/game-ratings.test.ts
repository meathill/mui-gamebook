import { beforeEach, describe, expect, it, vi } from 'vitest';

// drizzle 链式 mock：select/from/where/groupBy/orderBy/limit/offset/get/all，
// insert/values、update/set 与 delete/where 均为 thenable 链（await 非 thenable 对象直接返回）
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

import { GET, POST } from '@/app/api/games/[slug]/ratings/route';
import { getSession } from '@/lib/auth-server';

const GAME = { id: 7, slug: 'g', published: true, shadowBanned: false, ownerId: 'owner-1' };

function makeParams(slug = 'g') {
  return { params: Promise.resolve({ slug }) };
}

function makeReq(body: unknown) {
  return new Request('http://localhost/api/games/g/ratings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeGetReq(query = '') {
  return new Request(`http://localhost/api/games/g/ratings${query}`, { method: 'GET' });
}

describe('POST /api/games/[slug]/ratings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockDb, chainable(), { insert: vi.fn(), update: vi.fn(), delete: vi.fn() });
    mockDb.insert.mockImplementation(() => chainable());
    mockDb.update.mockImplementation(() => chainable());
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('缺少 rating 返回 400', async () => {
    const res = await POST(makeReq({}), makeParams());
    expect(res.status).toBe(400);
  });

  it('rating 超出 1-5 返回 400', async () => {
    const res = await POST(makeReq({ rating: 9 }), makeParams());
    expect(res.status).toBe(400);
  });

  it('游戏不存在返回 404', async () => {
    (mockDb.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const res = await POST(makeReq({ rating: 5 }), makeParams());
    expect(res.status).toBe(404);
  });

  it('匿名带留言返回 401 LOGIN_REQUIRED', async () => {
    (mockDb.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(GAME);
    const res = await POST(makeReq({ rating: 5, content: '写得真好' }), makeParams());
    expect(res.status).toBe(401);
    expect((await res.json()) as { error: string }).toMatchObject({ error: 'LOGIN_REQUIRED' });
  });

  it('匿名打星成功：插入新行并返回均分', async () => {
    (mockDb.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(GAME) // 游戏查询
      .mockResolvedValueOnce({ avg: 4.5, count: 2 }); // 聚合查询
    const res = await POST(makeReq({ rating: 5 }), makeParams());
    expect(res.status).toBe(200);
    expect(mockDb.insert).toHaveBeenCalledOnce();
    const data = (await res.json()) as { success: boolean; avg: number; count: number; myRating: number };
    expect(data).toMatchObject({ success: true, avg: 4.5, count: 2, myRating: 5 });
  });

  it('登录用户重复打分走 upsert 更新，不插入', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u-1', name: '阿木' } });
    (mockDb.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(GAME) // 游戏查询
      .mockResolvedValueOnce({ id: 99, rating: 3 }) // 已有评分
      .mockResolvedValueOnce({ avg: 4, count: 2 }); // 聚合查询
    const res = await POST(makeReq({ rating: 4, content: '二刷，依然好哭' }), makeParams());
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalledOnce();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('留言超长返回 400', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u-1' } });
    (mockDb.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(GAME);
    const res = await POST(makeReq({ rating: 5, content: '好'.repeat(501) }), makeParams());
    expect(res.status).toBe(400);
  });
});

describe('GET /api/games/[slug]/ratings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(mockDb, chainable(), { insert: vi.fn(), update: vi.fn(), delete: vi.fn() });
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('游戏不存在返回 404', async () => {
    (mockDb.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const res = await GET(makeGetReq(), makeParams());
    expect(res.status).toBe(404);
  });

  it('公开返回均分、分布与评价列表（隐藏的不出现）', async () => {
    (mockDb.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(GAME) // 游戏查询
      .mockResolvedValueOnce({ avg: 4.5, count: 2 }) // 聚合
      .mockResolvedValueOnce(null); // 我的评分（匿名）
    (mockDb.all as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { rating: 5, count: 1 },
        { rating: 4, count: 1 },
      ]) // 分布
      .mockResolvedValueOnce([{ id: 1, rating: 5, content: '神作', userName: '阿木', pinned: true, createdAt: 1 }]); // 列表
    const res = await GET(makeGetReq(), makeParams());
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      avg: number;
      count: number;
      distribution: { rating: number; count: number }[];
      ratings: { content: string }[];
    };
    expect(data.avg).toBe(4.5);
    expect(data.count).toBe(2);
    expect(data.ratings).toHaveLength(1);
    expect(data.ratings[0].content).toBe('神作');
  });
});
