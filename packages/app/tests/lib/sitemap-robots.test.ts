import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getPublishedGamesMock = vi.fn();
const getAllTagsMock = vi.fn();
const getPublishedPostsMock = vi.fn();
const getPublicMinigamesMock = vi.fn();

vi.mock('@/lib/games', () => ({
  getPublishedGames: () => getPublishedGamesMock(),
  getAllTags: () => getAllTagsMock(),
}));

vi.mock('@/lib/blog', () => ({
  getPublishedPosts: () => getPublishedPostsMock(),
}));

vi.mock('@/lib/minigames', () => ({
  getPublicMinigames: () => getPublicMinigamesMock(),
}));

import sitemap from '@/app/sitemap';
import robots from '@/app/robots';

describe('sitemap / robots URL 规范化', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    getPublishedGamesMock.mockResolvedValue([]);
    getAllTagsMock.mockResolvedValue([]);
    getPublishedPostsMock.mockResolvedValue({ docs: [] });
    getPublicMinigamesMock.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it('sitemap 静态条目全部是 https，且没有请求时刻 lastmod', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://muistory.com/';

    const entries = await sitemap();

    expect(entries.every((entry) => entry.url.startsWith('https://muistory.com'))).toBe(true);
    expect(entries.some((entry) => entry.url.startsWith('http://'))).toBe(false);
    const home = entries.find((entry) => entry.url === 'https://muistory.com');
    expect(home?.lastModified).toBeUndefined();
  });

  it('sitemap 游戏条目带 updated_at，协议仍是 https', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://muistory.com';
    getPublishedGamesMock.mockResolvedValue([{ slug: 'demo', updated_at: 1_700_000_000 }]);

    const entries = await sitemap();
    const game = entries.find((entry) => entry.url.endsWith('/play/demo'));

    expect(game?.url).toBe('https://muistory.com/play/demo');
    expect(game?.lastModified).toEqual(new Date(1_700_000_000 * 1000));
  });

  it('数据源 reject 时 sitemap 仍正常返回静态条目，不抛错', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://muistory.com';
    getPublishedGamesMock.mockRejectedValue(new Error('D1 unavailable'));
    getAllTagsMock.mockRejectedValue(new Error('D1 unavailable'));
    getPublishedPostsMock.mockRejectedValue(new Error('CMS unavailable'));
    getPublicMinigamesMock.mockRejectedValue(new Error('D1 unavailable'));

    const entries = await sitemap();

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.url.startsWith('https://muistory.com'))).toBe(true);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['NaN', Number.NaN],
    ['脏字符串', 'not-a-number'],
  ])('updated_at 为%s等脏值时不含 Invalid Date，sitemap 不 500', async (_label, dirty) => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://muistory.com';
    getPublishedGamesMock.mockResolvedValue([{ slug: 'dirty-ts', updated_at: dirty }]);
    getPublicMinigamesMock.mockResolvedValue([{ id: 9, created_at: dirty }]);

    const entries = await sitemap();
    const game = entries.find((entry) => entry.url.endsWith('/play/dirty-ts'));
    const minigame = entries.find((entry) => entry.url.endsWith('/minigames/9'));

    expect(game?.lastModified).toBeUndefined();
    expect(minigame?.lastModified).toBeUndefined();
    // Invalid Date 会让 Next 序列化 sitemap 时抛 Invalid time value
    expect(() => {
      if (game?.lastModified instanceof Date) game.lastModified.toISOString();
    }).not.toThrow();
  });

  it('created_at 为毫秒级时间戳时按毫秒解析', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://muistory.com';
    getPublicMinigamesMock.mockResolvedValue([{ id: 7, created_at: 1_700_000_000_000 }]);

    const entries = await sitemap();
    const minigame = entries.find((entry) => entry.url.endsWith('/minigames/7'));

    expect(minigame?.lastModified).toEqual(new Date(1_700_000_000_000));
  });

  it('robots sitemap 地址强制 https 且去掉尾斜杠', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://muistory.com/';

    expect(robots().sitemap).toBe('https://muistory.com/sitemap.xml');
  });
});
