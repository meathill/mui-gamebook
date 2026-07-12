import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/games', () => ({
  getPublishedGames: vi.fn(),
}));

import { GET } from '@/app/api/games/route';
import { getPublishedGames } from '@/lib/games';

describe('GET /api/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('返回已发布游戏列表，公开只读无需鉴权', async () => {
    (getPublishedGames as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 1, title: 'A' }]);

    const res = await GET();

    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<{ id: number }>;
    expect(data).toEqual([{ id: 1, title: 'A' }]);
    expect(getPublishedGames).toHaveBeenCalledTimes(1);
  });
});
