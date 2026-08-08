import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getGamesByTag, getAllTags, getFeaturedGames, getGameBySlug } from '@/lib/games';

// Mock getCloudflareContext
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({
  getSession: vi.fn(),
}));

import { getSession } from '@/lib/auth-server';

describe('games tag functions', () => {
  const mockDB = {
    prepare: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
      env: { DB: mockDB },
    });
  });

  describe('getGamesByTag', () => {
    it('should return games matching the tag using GameTags table', async () => {
      const mockGames = [
        {
          slug: 'game1',
          title: 'Game 1',
          description: 'Desc 1',
          cover_image: null,
          tags: '["修仙"]',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      // Mock count query
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 1 }),
        }),
      });

      // Mock games query
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockGames }),
        }),
      });

      const result = await getGamesByTag('修仙', { limit: 10 });

      expect(result.total).toBe(1);
      expect(result.games).toHaveLength(1);
      expect(result.games[0].slug).toBe('game1');
      expect(result.games[0].tags).toEqual(['修仙']);
    });

    it('should fall back to JSON parsing when GameTags table does not exist', async () => {
      const mockGames = [
        {
          slug: 'game1',
          title: 'Game 1',
          description: 'Desc 1',
          cover_image: null,
          tags: '["修仙","冒险"]',
          created_at: 1000,
          updated_at: 2000,
        },
        {
          slug: 'game2',
          title: 'Game 2',
          description: 'Desc 2',
          cover_image: null,
          tags: '["童话"]',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      // Mock GameTags query failure
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('no such table: GameTags')),
        }),
      });

      // Mock fallback query
      mockDB.prepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue({ results: mockGames }),
      });

      const result = await getGamesByTag('修仙');

      expect(result.total).toBe(1);
      expect(result.games[0].slug).toBe('game1');
    });

    it('should return empty result when no games match', async () => {
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
        }),
      });

      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const result = await getGamesByTag('不存在的标签');

      expect(result.total).toBe(0);
      expect(result.games).toHaveLength(0);
    });
  });

  describe('getAllTags', () => {
    it('should return all tags with counts sorted by count descending', async () => {
      const mockGames = [{ tags: '["修仙","冒险"]' }, { tags: '["修仙","东方玄幻"]' }, { tags: '["童话"]' }];

      mockDB.prepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue({ results: mockGames }),
      });

      const result = await getAllTags();

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ tag: '修仙', count: 2 });
      expect(result.find((t) => t.tag === '冒险')).toEqual({ tag: '冒险', count: 1 });
    });

    it('should return empty array when no games exist', async () => {
      mockDB.prepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue({ results: [] }),
      });

      const result = await getAllTags();

      expect(result).toEqual([]);
    });

    it('should handle games with null tags', async () => {
      const mockGames = [{ tags: null }, { tags: '["修仙"]' }];

      mockDB.prepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue({ results: mockGames }),
      });

      const result = await getAllTags();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ tag: '修仙', count: 1 });
    });
  });

  describe('getFeaturedGames', () => {
    function mockRow(slug: string, updatedAt: number) {
      return {
        slug,
        title: slug,
        description: '',
        cover_image: null,
        tags: '[]',
        created_at: updatedAt,
        updated_at: updatedAt,
      };
    }

    it('置顶游戏按 pinnedSlugs 给定顺序排在最前', async () => {
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [mockRow('b', 20), mockRow('a', 10)] }),
        }),
      });
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const result = await getFeaturedGames({ pinnedSlugs: ['a', 'b'], limit: 5 });

      expect(result.map((row) => row.slug)).toEqual(['a', 'b']);
    });

    it('置顶数量不足 limit 时用最近更新的游戏补齐，且不重复', async () => {
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [mockRow('a', 10)] }),
        }),
      });
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [mockRow('a', 10), mockRow('c', 30), mockRow('d', 40)] }),
        }),
      });

      const result = await getFeaturedGames({ pinnedSlugs: ['a'], limit: 3 });

      expect(result.map((row) => row.slug)).toEqual(['a', 'c', 'd']);
    });

    it('没有置顶游戏时直接按最近更新排序', async () => {
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [mockRow('c', 30), mockRow('d', 40)] }),
        }),
      });

      const result = await getFeaturedGames({ pinnedSlugs: [], limit: 2 });

      expect(result.map((row) => row.slug)).toEqual(['c', 'd']);
    });

    it('DB binding 不存在时返回空数组', async () => {
      (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: {} });

      const result = await getFeaturedGames({ pinnedSlugs: [], limit: 5 });

      expect(result).toEqual([]);
    });

    it('查询异常时 fail-open 返回空数组', async () => {
      mockDB.prepare.mockImplementation(() => {
        throw new Error('D1 down');
      });

      const result = await getFeaturedGames({ pinnedSlugs: [], limit: 5 });

      expect(result).toEqual([]);
    });
  });

  describe('getGameBySlug', () => {
    const VALID_CONTENT = `---
title: "测试作品"
---
# start
`;

    function mockGameRecord(overrides: Record<string, unknown> = {}) {
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            id: 1,
            owner_id: 'owner-1',
            published: 1,
            updated_at: 1700000000,
            content: VALID_CONTENT,
            author_name: '作者甲',
            author_image: 'https://example.com/a.png',
            ...overrides,
          }),
        }),
      });
    }

    beforeEach(() => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    });

    it('返回作者昵称、头像与更新 ISO 时间（秒级时间戳）', async () => {
      mockGameRecord();

      const game = await getGameBySlug('test-game');

      expect(game).not.toBeNull();
      expect(game?.authorName).toBe('作者甲');
      expect(game?.authorImage).toBe('https://example.com/a.png');
      expect(game?.updatedAt).toBe(new Date(1700000000 * 1000).toISOString());
    });

    it('毫秒级时间戳正确转换为 ISO 时间', async () => {
      mockGameRecord({ updated_at: 1700000000000 });

      const game = await getGameBySlug('test-game');

      expect(game?.updatedAt).toBe(new Date(1700000000000).toISOString());
    });

    it('无 owner 时作者字段为 undefined', async () => {
      mockGameRecord({ owner_id: null, author_name: null, author_image: null });

      const game = await getGameBySlug('test-game');

      expect(game?.authorName).toBeUndefined();
      expect(game?.authorImage).toBeUndefined();
    });

    it('游戏不存在返回 null', async () => {
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      expect(await getGameBySlug('not-exist')).toBeNull();
    });

    it('未发布且非 owner 拒绝访问返回 null', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'other' } });
      mockGameRecord({ published: 0 });

      expect(await getGameBySlug('draft-game')).toBeNull();
    });
  });
});
