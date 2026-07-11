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

vi.mock('@/lib/config', () => ({
  isRootUser: vi.fn(),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle } from 'drizzle-orm/d1';
import { GET } from '@/app/api/admin/games/route';
import { getSession } from '@/lib/auth-server';
import { isRootUser } from '@/lib/config';

const mockGames = [
  {
    id: 1,
    slug: 'game-a',
    title: '游戏 A',
    published: 1,
    ownerEmail: 'a@example.com',
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  },
];

function mockDbWithRows(rows: unknown[], total: number) {
  // 自返回链式 mock：select/from/leftJoin/where/orderBy 均返回自身，
  // limit().offset() 结束列表查询，get() 结束 count 查询
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'from', 'leftJoin', 'where', 'orderBy', 'limit']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.offset = vi.fn().mockResolvedValue(rows);
  chain.get = vi.fn().mockResolvedValue({ count: total });
  (drizzle as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

describe('GET /api/admin/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: { DB: {} } });
  });

  it('未登录返回 403', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/admin/games'));
    expect(res.status).toBe(403);
  });

  it('非 root 用户返回 403', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'user@example.com' } });
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const res = await GET(new Request('http://localhost/api/admin/games'));
    expect(res.status).toBe(403);
  });

  it('root 用户返回游戏列表（published 转布尔）与分页信息', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'root@example.com' } });
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(true);
    mockDbWithRows(mockGames, 1);

    const res = await GET(new Request('http://localhost/api/admin/games?page=1&limit=20'));
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      games: Array<{ slug: string; published: boolean; ownerEmail: string }>;
      pagination: { total: number; totalPages: number };
    };
    expect(data.games).toHaveLength(1);
    expect(data.games[0].slug).toBe('game-a');
    expect(data.games[0].published).toBe(true);
    expect(data.games[0].ownerEmail).toBe('a@example.com');
    expect(data.pagination.total).toBe(1);
    expect(data.pagination.totalPages).toBe(1);
  });

  it('支持搜索参数（走 where 条件）', async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { email: 'root@example.com' } });
    (isRootUser as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const chain = mockDbWithRows([], 0);

    const res = await GET(new Request('http://localhost/api/admin/games?search=abc'));
    expect(res.status).toBe(200);
    expect(chain.where).toHaveBeenCalled();
  });
});
