import { beforeEach, describe, expect, it, vi } from 'vitest';

const getGamesByTagMock = vi.fn();

vi.mock('@/lib/games', () => ({
  getGamesByTag: (...args: unknown[]) => getGamesByTagMock(...args),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string, params?: { tag?: string }) => `${key}:${params?.tag ?? ''}`),
}));

import { generateTagMetadata, TAG_PAGE_SIZE } from '@/app/tags/[tag]/tag-catalog';

describe('generateTagMetadata 空目录与有效目录索引策略（issue #30）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('有对应可公开作品的标签页正常允许索引，不输出 noindex', async () => {
    getGamesByTagMock.mockResolvedValueOnce({
      games: [
        {
          slug: 'harry-potter-2-chamber-of-secrets',
          title: '哈利·波特与密室',
          description: '',
          cover_image: null,
          tags: ['哈利波特'],
          created_at: 1,
          updated_at: 2,
        },
      ],
      total: 1,
    });

    const meta = await generateTagMetadata('%E5%93%88%E5%88%A9%E6%B3%A2%E7%89%B9', 1);

    expect(getGamesByTagMock).toHaveBeenCalledWith('哈利波特', {
      limit: TAG_PAGE_SIZE,
      offset: 0,
    });
    expect(meta.title).toBe('pageTitle:哈利波特');
    expect(meta.alternates?.canonical).toBe('/tags/%E5%93%88%E5%88%A9%E6%B3%A2%E7%89%B9');
    expect(meta.robots).toBeUndefined();
  });

  it('真正没有任何可公开作品的空标签页返回 noindex, follow', async () => {
    getGamesByTagMock.mockResolvedValueOnce({
      games: [],
      total: 0,
    });

    const meta = await generateTagMetadata('不存在的标签', 1);

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('超出总页数的空分页同样返回 noindex, follow 并计算正确 offset', async () => {
    getGamesByTagMock.mockResolvedValueOnce({
      games: [],
      total: 5,
    });

    const meta = await generateTagMetadata('哈利波特', 3);

    expect(getGamesByTagMock).toHaveBeenCalledWith('哈利波特', {
      limit: TAG_PAGE_SIZE,
      offset: TAG_PAGE_SIZE * 2,
    });
    expect(meta.alternates?.canonical).toBe('/tags/哈利波特/p/3');
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});
