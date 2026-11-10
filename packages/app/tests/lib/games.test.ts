import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getGamesByTag, getAllTags, getFeaturedGames, getGameBySlug, getRelatedGames } from '@/lib/games';

// Mock getCloudflareContext
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

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
    it('直接从 Games.tags JSON 查询并过滤，不依赖未维护的 GameTags 关联表', async () => {
      const mockGames = [
        {
          slug: 'harry-potter-2-chamber-of-secrets',
          title: '哈利·波特与密室',
          description: 'Desc 1',
          cover_image: null,
          tags: '["哈利波特","奇幻"]',
          created_at: 1000,
          updated_at: 3000,
        },
        {
          slug: 'time-travel-story',
          title: '穿越时空',
          description: 'Desc 2',
          cover_image: null,
          tags: '["穿越","奇幻"]',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      mockDB.prepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue({ results: mockGames }),
      });

      const result = await getGamesByTag('哈利波特', { limit: 10 });

      expect(mockDB.prepare).toHaveBeenCalledTimes(1);
      expect(mockDB.prepare.mock.calls[0][0]).not.toContain('GameTags');
      expect(mockDB.prepare.mock.calls[0][0]).toContain('FROM Games WHERE published = 1 AND shadow_banned = 0');
      expect(result.total).toBe(1);
      expect(result.games).toHaveLength(1);
      expect(result.games[0].slug).toBe('harry-potter-2-chamber-of-secrets');
      expect(result.games[0].tags).toEqual(['哈利波特', '奇幻']);
    });

    it('相同公开数据集下 getAllTags 的计数与 getGamesByTag 的 total 严格一致（issue #30）', async () => {
      const mockGames = [
        {
          slug: 'harry-potter-2-chamber-of-secrets',
          title: '哈利·波特与密室',
          description: 'Desc 1',
          cover_image: null,
          tags: '["哈利波特","穿越","哈利波特"]',
          created_at: 1000,
          updated_at: 3000,
        },
        {
          slug: 'isekai-adventure',
          title: '异界穿越',
          description: 'Desc 2',
          cover_image: null,
          tags: '[" 穿越 ","冒险"]',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      mockDB.prepare.mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: mockGames }),
      });

      const allTags = await getAllTags();
      expect(allTags).toEqual([
        { tag: '穿越', count: 2 },
        { tag: '哈利波特', count: 1 },
        { tag: '冒险', count: 1 },
      ]);

      for (const { tag, count } of allTags) {
        const { games, total } = await getGamesByTag(tag);
        expect(total).toBe(count);
        expect(games).toHaveLength(count);
      }
    });

    it('支持分页切片且保留完整 total，无匹配或空白标签时返回 0', async () => {
      const mockGames = [
        {
          slug: 'game1',
          title: 'Game 1',
          description: 'Desc 1',
          cover_image: null,
          tags: '["修仙","冒险"]',
          created_at: 1000,
          updated_at: 3000,
        },
        {
          slug: 'game2',
          title: 'Game 2',
          description: 'Desc 2',
          cover_image: null,
          tags: '["修仙"]',
          created_at: 1000,
          updated_at: 2000,
        },
      ];

      mockDB.prepare.mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: mockGames }),
      });

      const paged = await getGamesByTag('修仙', { limit: 1, offset: 1 });
      expect(paged.total).toBe(2);
      expect(paged.games.map((g) => g.slug)).toEqual(['game2']);

      const empty = await getGamesByTag('不存在的标签');
      expect(empty).toEqual({ games: [], total: 0 });

      vi.clearAllMocks();
      const blank = await getGamesByTag('   ');
      expect(blank).toEqual({ games: [], total: 0 });
      expect(mockDB.prepare).not.toHaveBeenCalled();
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

    it('未发布作品对公开路径返回 null，作者预览只走 /preview', async () => {
      mockGameRecord({ published: 0 });

      expect(await getGameBySlug('draft-game')).toBeNull();
    });

    it('经过鉴权的预览可以显式读取未发布作品', async () => {
      mockGameRecord({ published: 0 });

      const game = await getGameBySlug('-2155', { includeUnpublished: true });

      expect(game?.title).toBe('测试作品');
    });

    it('仅放行封禁状态仍然不能读取未发布作品', async () => {
      mockGameRecord({ published: 0, shadow_banned: 1 });

      expect(await getGameBySlug('draft-game', { includeShadowBanned: true })).toBeNull();
    });

    it('仅放行未发布状态仍然不能读取被封禁作品', async () => {
      mockGameRecord({ published: 0, shadow_banned: 1 });

      expect(await getGameBySlug('draft-game', { includeUnpublished: true })).toBeNull();
    });

    it('被封禁的作品公开路径返回 null', async () => {
      mockGameRecord({ published: 1, shadow_banned: 1 });

      expect(await getGameBySlug('banned-game')).toBeNull();
    });

    it('includeShadowBanned 时放行被封禁作品（预览路径）', async () => {
      mockGameRecord({ published: 1, shadow_banned: 1 });

      const game = await getGameBySlug('banned-game', { includeShadowBanned: true });

      expect(game).not.toBeNull();
      expect(game?.title).toBe('测试作品');
    });

    it('透出评分均分与条数', async () => {
      mockGameRecord();
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ avg_rating: 4.5, rating_count: 2 }),
        }),
      });

      const game = await getGameBySlug('test-game');

      expect(game?.avgRating).toBe(4.5);
      expect(game?.ratingCount).toBe(2);
    });

    it('评分聚合查询失败时静默降级，不影响详情主体', async () => {
      mockGameRecord();
      mockDB.prepare.mockReturnValueOnce({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('no such table: GameRatings')),
        }),
      });

      const game = await getGameBySlug('test-game');

      expect(game).not.toBeNull();
      expect(game?.avgRating).toBeUndefined();
      expect(game?.ratingCount).toBe(0);
    });
  });

  describe('getRelatedGames', () => {
    const mockRows = [
      {
        slug: 'game-b',
        title: 'Game B',
        description: 'Desc B',
        cover_image: null,
        tags: '["悬疑"]',
        created_at: 1000,
        updated_at: 4000,
      },
      {
        slug: 'game-a',
        title: 'Game A',
        description: 'Desc A',
        cover_image: null,
        tags: '["悬疑","探案"]',
        created_at: 1000,
        updated_at: 3000,
      },
    ];

    it('从 Games.tags JSON 计算匹配数并按匹配数降序、更新时间倒序取前 N 行', async () => {
      const bind = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: mockRows }),
      });
      const prepare = vi.fn().mockReturnValue({ bind });
      mockDB.prepare.mockImplementation(prepare);

      const result = await getRelatedGames('current', ['悬疑', '探案'], 4);

      const sql = prepare.mock.calls[0][0] as string;
      expect(sql).not.toContain('GameTags');
      expect(sql).toContain('FROM Games WHERE published = 1 AND shadow_banned = 0');
      expect(bind).toHaveBeenCalledWith('current');
      expect(result.map((game) => game.slug)).toEqual(['game-a', 'game-b']);
      expect(result[0].tags).toEqual(['悬疑', '探案']);
      expect(result[0]).not.toHaveProperty('matchCount');
    });

    it('无标签时直接返回空，不查库', async () => {
      const result = await getRelatedGames('current', [], 4);

      expect(result).toEqual([]);
      expect(mockDB.prepare).not.toHaveBeenCalled();
    });
  });
});
