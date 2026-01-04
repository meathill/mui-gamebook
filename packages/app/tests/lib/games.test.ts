import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getGamesByTag, getAllTags } from '@/lib/games';

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
    it('should return games matching the tag using GameTags table', async () => {
      const mockGames = [
        { slug: 'game1', title: 'Game 1', description: 'Desc 1', cover_image: null, tags: '["修仙"]', created_at: 1000, updated_at: 2000 },
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
        { slug: 'game1', title: 'Game 1', description: 'Desc 1', cover_image: null, tags: '["修仙","冒险"]', created_at: 1000, updated_at: 2000 },
        { slug: 'game2', title: 'Game 2', description: 'Desc 2', cover_image: null, tags: '["童话"]', created_at: 1000, updated_at: 2000 },
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
      const mockGames = [
        { tags: '["修仙","冒险"]' },
        { tags: '["修仙","东方玄幻"]' },
        { tags: '["童话"]' },
      ];

      mockDB.prepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue({ results: mockGames }),
      });

      const result = await getAllTags();

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ tag: '修仙', count: 2 });
      expect(result.find(t => t.tag === '冒险')).toEqual({ tag: '冒险', count: 1 });
    });

    it('should return empty array when no games exist', async () => {
      mockDB.prepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue({ results: [] }),
      });

      const result = await getAllTags();

      expect(result).toEqual([]);
    });

    it('should handle games with null tags', async () => {
      const mockGames = [
        { tags: null },
        { tags: '["修仙"]' },
      ];

      mockDB.prepare.mockReturnValueOnce({
        all: vi.fn().mockResolvedValue({ results: mockGames }),
      });

      const result = await getAllTags();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ tag: '修仙', count: 1 });
    });
  });
});
