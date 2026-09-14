import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/games', () => ({
  getPublishedGames: vi.fn(),
}));

import { GET } from '@/app/api/games/route';
import { getPublishedGames } from '@/lib/games';

function makeReq(query = '') {
  return new NextRequest(`http://localhost/api/games${query}`);
}

describe('GET /api/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('无参数时返回全量已发布游戏列表，公开只读无需鉴权', async () => {
    (getPublishedGames as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1, title: 'A' }]);

    const res = await GET(makeReq());

    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{ id: number }>;
    expect(data).toEqual([{ id: 1, title: 'A' }]);
    expect(getPublishedGames).toHaveBeenCalledTimes(1);
    expect(getPublishedGames).toHaveBeenCalledWith({ limit: undefined, offset: undefined });
  });

  it('limit/offset 合法时透传给数据层', async () => {
    (getPublishedGames as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await GET(makeReq('?limit=10&offset=20'));

    expect(getPublishedGames).toHaveBeenCalledWith({ limit: 10, offset: 20 });
  });

  it('非法分页参数直接忽略，不抛错', async () => {
    (getPublishedGames as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await GET(makeReq('?limit=-5&offset=abc'));

    expect(getPublishedGames).toHaveBeenCalledWith({ limit: undefined, offset: undefined });
  });

  it('limit 超过上限时截断到 100', async () => {
    (getPublishedGames as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await GET(makeReq('?limit=9999'));

    expect(getPublishedGames).toHaveBeenCalledWith({ limit: 100, offset: undefined });
  });
});
