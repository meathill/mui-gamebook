/**
 * API 模块测试
 * 验证 jianjian 站点对 CMS API 的调用正确处理各种响应格式
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGames, getGame, getPlayableGame } from './api';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGames', () => {
    const mockGames = [
      {
        id: 1,
        slug: 'test-game',
        title: '测试游戏',
        description: '一个测试游戏',
        cover_image: null,
        tags: ['测试'],
        status: 'published',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];

    it('正确解析数组格式的响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGames),
      });

      const result = await getGames();

      expect(result).toEqual(mockGames);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('test-game');
    });

    it('正确解析 { games: [...] } 格式的响应', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ games: mockGames }),
      });

      const result = await getGames();

      expect(result).toEqual(mockGames);
      expect(result).toHaveLength(1);
    });

    it('API 错误时返回空数组', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getGames();

      expect(result).toEqual([]);
    });

    it('网络错误时返回空数组', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getGames();

      expect(result).toEqual([]);
    });

    it('空响应时返回空数组', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ games: undefined }),
      });

      const result = await getGames();

      expect(result).toEqual([]);
    });
  });

  describe('getGame', () => {
    const mockGame = {
      id: 1,
      slug: 'test-game',
      title: '测试游戏',
      description: '一个测试游戏',
      cover_image: null,
      tags: ['测试'],
      status: 'published',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    it('正确获取单个游戏', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGame),
      });

      const result = await getGame('test-game');

      expect(result).toEqual(mockGame);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/games/test-game'), expect.any(Object));
    });

    it('游戏不存在时返回 null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getGame('non-existent');

      expect(result).toBeNull();
    });

    it('网络错误时返回 null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getGame('test-game');

      expect(result).toBeNull();
    });
  });

  describe('getPlayableGame', () => {
    it('正确获取可玩游戏数据并转换', async () => {
      // Mock 返回完整的 Game 数据（而非 PlayableGame）
      const mockFullGame = {
        slug: 'test-game',
        title: '测试游戏',
        description: '一个测试游戏',
        initialState: {},
        ai: {
          style: {},
          characters: {},
        },
        scenes: {
          start: {
            id: 'start',
            nodes: [{ type: 'text', content: '开始' }],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFullGame),
      });

      const result = await getPlayableGame('test-game');

      // 验证返回的是转换后的 PlayableGame 格式
      expect(result).not.toBeNull();
      expect(result?.title).toBe('测试游戏');
      expect(result?.scenes['start']?.nodes[0]).toHaveProperty('content', '开始');
      // 验证调用了正确的 API 端点（不再调用 /play）
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/games/test-game'), expect.any(Object));
      expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('/play'), expect.any(Object));
    });

    it('游戏不存在时返回 null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getPlayableGame('non-existent');

      expect(result).toBeNull();
    });
  });
});
