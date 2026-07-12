import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
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

import { DELETE, GET, PUT } from '@/app/api/cms/games/[id]/route';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';

const VALID_CONTENT = `---
title: "新剧本"
description: "desc"
background_story: "bg"
cover_image: "https://x.com/c.png"
tags: ["a", "b"]
published: true
---
# start
hi
`;

function makeReq(body?: unknown, method = 'GET') {
  return new Request('http://localhost/api/cms/games/1', {
    method,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/cms/games/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(401);
  });

  it('游戏不存在返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(404);
  });

  it('成功路径：解析 tags 并把 published 转为布尔值', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      title: '新剧本',
      tags: '["a","b"]',
      published: 1,
    });
    mockDb.get.mockResolvedValue({ content: '# start\nhi\n' });

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { tags: string[]; published: boolean; content: string };
    expect(data.tags).toEqual(['a', 'b']);
    expect(data.published).toBe(true);
    expect(data.content).toBe('# start\nhi\n');
  });
});

describe('PUT /api/cms/games/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, slug: 'old-slug' });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await PUT(makeReq({ content: VALID_CONTENT }, 'PUT'), makeParams());

    expect(res.status).toBe(401);
  });

  it('非法 DSL 返回 400', async () => {
    const res = await PUT(makeReq({ content: '不是合法内容' }, 'PUT'), makeParams());

    expect(res.status).toBe(400);
  });

  it('游戏不存在或无权限返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await PUT(makeReq({ content: VALID_CONTENT }, 'PUT'), makeParams());

    expect(res.status).toBe(404);
  });

  it('新 slug 已被占用时返回 409', async () => {
    mockDb.get.mockResolvedValue({ id: 2, slug: 'taken-slug' });

    const res = await PUT(makeReq({ content: VALID_CONTENT, slug: 'taken-slug' }, 'PUT'), makeParams());

    expect(res.status).toBe(409);
  });

  it('成功路径：更新 games 和 gameContent 两张表', async () => {
    mockDb.get.mockResolvedValue(null);

    const res = await PUT(makeReq({ content: VALID_CONTENT }, 'PUT'), makeParams());

    expect(res.status).toBe(200);
    const data = (await res.json()) as { success: boolean; slug: string };
    expect(data).toEqual({ success: true, slug: 'old-slug' });
    expect(mockDb.update).toHaveBeenCalledTimes(2);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ title: '新剧本', backgroundStory: 'bg', coverImage: 'https://x.com/c.png' }),
    );
    expect(mockDb.set).toHaveBeenCalledWith({ content: VALID_CONTENT });
  });
});

describe('DELETE /api/cms/games/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await DELETE(makeReq(undefined, 'DELETE'), makeParams());

    expect(res.status).toBe(401);
  });

  it('游戏不存在或无权限返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await DELETE(makeReq(undefined, 'DELETE'), makeParams());

    expect(res.status).toBe(404);
  });

  it('成功路径：删除游戏', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    const res = await DELETE(makeReq(undefined, 'DELETE'), makeParams());

    expect(res.status).toBe(200);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
