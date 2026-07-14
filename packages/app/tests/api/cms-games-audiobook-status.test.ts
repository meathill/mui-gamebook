import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
};

const bucket = {
  list: vi.fn(),
};

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(() => ({
    env: { DB: {}, ASSETS_BUCKET: bucket },
  })),
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

import { GET } from '@/app/api/cms/games/[id]/audiobook/status/route';
import { getSession } from '@/lib/auth-server';
import { getManagedGame } from '@/lib/game-access';

function makeParams(id = '1') {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/cms/games/[id]/audiobook/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1' } });
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, slug: 'test-game', ownerId: 'u1' });
  });

  it('未登录返回 401', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(401);
  });

  it('游戏不存在或无权限返回 404', async () => {
    (getManagedGame as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(404);
  });

  it('R2 Bucket 未配置时返回 500', async () => {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValueOnce({ env: { DB: {} } });

    const res = await GET(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(500);
  });

  it('列出 R2 中已生成的场景 id（去掉路径前缀和 .json 后缀）', async () => {
    bucket.list.mockResolvedValue({
      objects: [{ key: 'audiobook/test-game/scenes/start.json' }, { key: 'audiobook/test-game/scenes/end.json' }],
      truncated: false,
      delimitedPrefixes: [],
    });

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = (await res.json()) as { generatedSceneIds: string[] };

    expect(res.status).toBe(200);
    expect(data.generatedSceneIds.sort()).toEqual(['end', 'start']);
    expect(bucket.list).toHaveBeenCalledWith({ prefix: 'audiobook/test-game/scenes/', cursor: undefined });
  });

  it('结果被截断（truncated）时会翻页取完整列表', async () => {
    bucket.list
      .mockResolvedValueOnce({
        objects: [{ key: 'audiobook/test-game/scenes/a.json' }],
        truncated: true,
        cursor: 'page2',
        delimitedPrefixes: [],
      })
      .mockResolvedValueOnce({
        objects: [{ key: 'audiobook/test-game/scenes/b.json' }],
        truncated: false,
        delimitedPrefixes: [],
      });

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = (await res.json()) as { generatedSceneIds: string[] };

    expect(data.generatedSceneIds.sort()).toEqual(['a', 'b']);
    expect(bucket.list).toHaveBeenCalledTimes(2);
    expect(bucket.list).toHaveBeenNthCalledWith(2, { prefix: 'audiobook/test-game/scenes/', cursor: 'page2' });
  });

  it('还没有任何场景生成过时返回空列表', async () => {
    bucket.list.mockResolvedValue({ objects: [], truncated: false, delimitedPrefixes: [] });

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = (await res.json()) as { generatedSceneIds: string[] };

    expect(res.status).toBe(200);
    expect(data.generatedSceneIds).toEqual([]);
  });
});
