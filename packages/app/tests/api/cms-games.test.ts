import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
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

import { GET, POST } from '@/app/api/cms/games/route';
import { getSession } from '@/lib/auth-server';

function makeReq(body?: unknown) {
  return new Request('http://localhost/api/cms/games', {
    method: body !== undefined ? 'POST' : 'GET',
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

describe('GET /api/cms/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('成功路径：返回当前用户的游戏列表', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    mockDb.orderBy.mockResolvedValue([{ id: 1, title: 'A' }]);

    const res = await GET();

    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{ id: number }>;
    expect(data).toEqual([{ id: 1, title: 'A' }]);
  });
});

describe('POST /api/cms/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(makeReq({ title: '新游戏' }));

    expect(res.status).toBe(401);
  });

  it('缺少 title 返回 400', async () => {
    const res = await POST(makeReq({}));

    expect(res.status).toBe(400);
  });

  it('成功路径：创建游戏和默认内容', async () => {
    mockDb.returning.mockResolvedValue([{ id: 42 }]);

    const res = await POST(makeReq({ title: '新游戏' }));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { id: number; title: string; slug: string };
    expect(data.id).toBe(42);
    expect(data.title).toBe('新游戏');
    // 中文标题经 slugify(strict:true) 会被完全清空，slug 退化成纯时间戳后缀
    expect(data.slug).toMatch(/^-\d{4}$/);
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it('数据库出错时返回 500', async () => {
    mockDb.returning.mockRejectedValue(new Error('D1 挂了'));

    const res = await POST(makeReq({ title: '新游戏' }));

    expect(res.status).toBe(500);
  });
});
