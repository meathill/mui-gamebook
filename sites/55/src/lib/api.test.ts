/**
 * API 模块测试
 * 验证 55 站点对 CMS API 的调用正确处理各种响应格式
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGame, getPlayableGame } from './api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

      expect(result).not.toBeNull();
      expect(result?.title).toBe('测试游戏');
      expect(result?.scenes['start']?.nodes[0]).toHaveProperty('content', '开始');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/games/test-game'), expect.any(Object));
    });

    it('游戏不存在时返回 null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getPlayableGame('non-existent');

      expect(result).toBeNull();
    });

    it('网络错误时返回 null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getPlayableGame('test-game');

      expect(result).toBeNull();
    });
  });
});
