import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Game } from '../lib/api';
import sitemap from './sitemap';

const getGamesMock = vi.fn<() => Promise<Game[]>>();

vi.mock('../lib/api', () => ({
  getGames: () => getGamesMock(),
}));

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    slug: 'story-1',
    title: '故事一',
    description: null,
    cover_image: null,
    tags: null,
    status: 'published',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://jianjian.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('没有游戏时只返回 3 个静态页面', async () => {
    getGamesMock.mockResolvedValue([]);

    const entries = await sitemap();

    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.url)).toEqual([
      'https://jianjian.example.com',
      'https://jianjian.example.com/privacy',
      'https://jianjian.example.com/tos',
    ]);
    expect(entries[0]).toMatchObject({ changeFrequency: 'daily', priority: 1 });
    expect(entries[1]).toMatchObject({ changeFrequency: 'monthly', priority: 0.3 });
  });

  it('每个已发布游戏生成一条 /play/{slug} 条目', async () => {
    getGamesMock.mockResolvedValue([
      makeGame({ slug: 'story-1', updated_at: '2026-03-01T00:00:00.000Z' }),
      makeGame({ slug: 'story-2', updated_at: '2026-03-02T00:00:00.000Z' }),
    ]);

    const entries = await sitemap();

    expect(entries).toHaveLength(5);
    const gameEntries = entries.slice(3);
    expect(gameEntries.map((e) => e.url)).toEqual([
      'https://jianjian.example.com/play/story-1',
      'https://jianjian.example.com/play/story-2',
    ]);
    expect(gameEntries[0]).toMatchObject({ changeFrequency: 'weekly', priority: 0.8 });
    expect(gameEntries[0].lastModified).toEqual(new Date('2026-03-01T00:00:00.000Z'));
  });
});
