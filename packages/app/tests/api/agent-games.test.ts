import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  get: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({ env: { DB: {}, ADMIN_PASSWORD: 'test-secret' } })),
}));

vi.mock('drizzle-orm/d1', () => ({
  drizzle: vi.fn(() => mockDb),
}));

import { GET, POST } from '@/app/api/agent/games/route';

function makeReq(body: unknown, authHeader = 'Bearer test-secret') {
  return new Request('http://localhost/api/agent/games', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Authorization: authHeader },
  });
}

function makeGetReq(query: string, authHeader = 'Bearer test-secret') {
  return new Request(`http://localhost/api/agent/games${query}`, { headers: { Authorization: authHeader } });
}

describe('POST /api/agent/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('密钥错误返回 401', async () => {
    const res = await POST(makeReq({ title: 't' }, 'Bearer wrong'));

    expect(res.status).toBe(401);
  });

  it('缺少 title 返回 400', async () => {
    const res = await POST(makeReq({}));

    expect(res.status).toBe(400);
  });

  it('指定的 ownerId 不存在时返回 400', async () => {
    mockDb.get.mockResolvedValueOnce(null);

    const res = await POST(makeReq({ title: 't', ownerId: 'no-such-user' }));

    expect(res.status).toBe(400);
  });

  it('新 slug 时创建游戏和默认内容', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'first-user' }]);
    mockDb.get.mockResolvedValueOnce(null); // slug 不存在
    mockDb.returning.mockResolvedValueOnce([{ id: 10 }]);

    const res = await POST(makeReq({ title: '新游戏', slug: 'brand-new' }));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { action: string; id: number };
    expect(data).toEqual({ id: 10, slug: 'brand-new', title: '新游戏', action: 'created' });
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
  });

  it('slug 已存在且有 gameContent 记录时走更新路径', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'first-user' }]);
    mockDb.get
      .mockResolvedValueOnce({ id: 5, slug: 'existing' }) // slug 已存在
      .mockResolvedValueOnce({ id: 99 }); // 已有 gameContent 记录

    const res = await POST(makeReq({ title: '更新标题', slug: 'existing' }));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { action: string; id: number };
    expect(data).toEqual({ id: 5, slug: 'existing', title: '更新标题', action: 'updated' });
    expect(mockDb.update).toHaveBeenCalledTimes(2);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('slug 已存在但没有 gameContent 记录时补插一条', async () => {
    mockDb.limit.mockResolvedValueOnce([{ id: 'first-user' }]);
    mockDb.get.mockResolvedValueOnce({ id: 5, slug: 'existing' }).mockResolvedValueOnce(null);

    const res = await POST(makeReq({ title: '更新标题', slug: 'existing' }));

    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalledTimes(1); // 只更新 games，不更新 gameContent
    expect(mockDb.insert).toHaveBeenCalledTimes(1); // 补插 gameContent
  });
});

describe('GET /api/agent/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('密钥错误返回 401', async () => {
    const res = await GET(makeGetReq('?slug=g', 'Bearer wrong'));

    expect(res.status).toBe(401);
  });

  it('缺少 slug 返回 400', async () => {
    const res = await GET(makeGetReq(''));

    expect(res.status).toBe(400);
  });

  it('游戏不存在返回 404', async () => {
    mockDb.get.mockResolvedValueOnce(null);

    const res = await GET(makeGetReq('?slug=missing'));

    expect(res.status).toBe(404);
  });

  it('成功路径：返回游戏详情和内容', async () => {
    mockDb.get
      .mockResolvedValueOnce({ id: 1, slug: 'g', title: 'T', tags: '["a"]', ownerId: 'u1' })
      .mockResolvedValueOnce({ content: '# start\nhi\n' });

    const res = await GET(makeGetReq('?slug=g'));

    expect(res.status).toBe(200);
    const data = (await res.json()) as { tags: string[]; content: string };
    expect(data.tags).toEqual(['a']);
    expect(data.content).toBe('# start\nhi\n');
  });
});
