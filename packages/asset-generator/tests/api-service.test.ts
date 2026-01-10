import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { ApiService } from '../src/lib/upload/api-service';
import { Buffer } from 'node:buffer';

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as unknown as typeof fetch;

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    apiService = new ApiService('https://api.example.com', 'test-password');
  });

  describe('uploadAsset', () => {
    it('should upload asset and return URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://cdn.example.com/image.webp' }),
      });

      const result = await apiService.uploadAsset('cover.webp', Buffer.from('test'), 'image/webp', 'my-game');

      expect(result).toBe('https://cdn.example.com/image.webp');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agent/assets/upload',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-password',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should throw on upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(apiService.uploadAsset('cover.webp', Buffer.from('test'), 'image/webp', 'my-game')).rejects.toThrow(
        'API Error 500: Internal Server Error',
      );
    });
  });

  describe('submitGame', () => {
    it('should submit game data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiService.submitGame({
        title: 'Test Game',
        slug: 'test-game',
        content: '# start\nHello',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agent/games',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('submitMinigames', () => {
    it('should skip submission for empty array', async () => {
      await apiService.submitMinigames([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should submit minigames', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await apiService.submitMinigames([
        {
          name: 'test_game',
          prompt: 'Test minigame',
          code: 'export default { init() {} }',
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/agent/minigames',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
