import { describe, it, expect } from 'vitest';
import { generateCacheFileName, getCachePath } from '../src/lib/cache';

describe('cache', () => {
  describe('generateCacheFileName', () => {
    it('应该生成唯一的缓存文件名', () => {
      const fileName = generateCacheFileName('scene_1', 0, 'text', '你好世界', 'mp3');
      expect(fileName).toMatch(/^scene_1-text-0-[a-f0-9]+\.mp3$/);
    });

    it('相同内容应该生成相同的文件名', () => {
      const fileName1 = generateCacheFileName('scene_1', 0, 'text', '你好', 'mp3');
      const fileName2 = generateCacheFileName('scene_1', 0, 'text', '你好', 'mp3');
      expect(fileName1).toBe(fileName2);
    });

    it('不同内容应该生成不同的文件名', () => {
      const fileName1 = generateCacheFileName('scene_1', 0, 'text', '你好', 'mp3');
      const fileName2 = generateCacheFileName('scene_1', 0, 'text', '世界', 'mp3');
      expect(fileName1).not.toBe(fileName2);
    });
  });

  describe('getCachePath', () => {
    it('应该返回正确的缓存路径', () => {
      const path = getCachePath('my-game', 'test.mp3');
      expect(path).toContain('cache');
      expect(path).toContain('my-game');
      expect(path).toContain('test.mp3');
    });
  });
});
