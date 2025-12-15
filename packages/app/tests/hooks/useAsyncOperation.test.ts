import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { batchCheckPlaceholders } from '../../src/hooks/useAsyncOperation';

// useAsyncOperation 的单元测试较复杂，因为涉及 React hooks 和 fake timers 的交互
// 这里主要测试 batchCheckPlaceholders 函数

describe('batchCheckPlaceholders', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该批量检查占位符并返回已完成的映射', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'completed', url: 'https://example.com/1.mp4' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'pending' }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ status: 'completed', url: 'https://example.com/3.mp4' }),
      });

    const urls = [
      'pending://1',
      'pending://2',
      'pending://3',
      'https://example.com/normal.mp4', // 非占位符应该被忽略
    ];

    const result = await batchCheckPlaceholders(urls);

    expect(result.size).toBe(2);
    expect(result.get('pending://1')).toBe('https://example.com/1.mp4');
    expect(result.get('pending://3')).toBe('https://example.com/3.mp4');
    expect(result.has('pending://2')).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('应该忽略非占位符 URL', async () => {
    const urls = ['https://example.com/1.mp4', 'https://example.com/2.mp4'];

    const result = await batchCheckPlaceholders(urls);

    expect(result.size).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('应该处理空数组', async () => {
    const result = await batchCheckPlaceholders([]);

    expect(result.size).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('应该处理 fetch 错误', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const urls = ['pending://1'];

    const result = await batchCheckPlaceholders(urls);

    expect(result.size).toBe(0);
  });
});
