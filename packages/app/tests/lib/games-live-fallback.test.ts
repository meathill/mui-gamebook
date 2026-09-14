import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  getAllTags,
  getFeaturedGames,
  getGameBySlug,
  getGamesByTag,
  getPublishedGames,
  getPublishedGamesCount,
  getRelatedGames,
} from '@/lib/games';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

// 构建期：无请求上下文，getCloudflareContext 直接抛错
function mockBuildTime() {
  (getCloudflareContext as ReturnType<typeof vi.fn>).mockImplementation(() => {
    throw new Error('no request context');
  });
}

function row(slug: string, tags: string[] | string, updatedAt = '2026-01-01') {
  return { slug, title: slug, description: '', cover_image: '', tags, created_at: '2026-01-01', updated_at: updatedAt };
}

describe('构建期无 D1 时回退抓线上 API', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    mockBuildTime();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://muistory.com';
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it('getPublishedGames 分页抓全量快照，数组 tags 直接可用', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => row(`g${i}`, ['悬疑']));
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => firstPage })
      .mockResolvedValueOnce({ ok: true, json: async () => [row('last', '["奇幻"]')] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const games = await getPublishedGames();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://muistory.com/api/games?limit=100&offset=0');
    expect(fetchMock.mock.calls[1][0]).toBe('https://muistory.com/api/games?limit=100&offset=100');
    expect(games).toHaveLength(101);
    expect(games[0].tags).toEqual(['悬疑']);
    expect(games[100].tags).toEqual(['奇幻']);
  });

  it('limit/offset 与 D1 分支同语义（offset 单独出现时忽略）', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [row('a', []), row('b', []), row('c', [])] });

    expect((await getPublishedGames({ limit: 2, offset: 1 })).map((g) => g.slug)).toEqual(['b', 'c']);
    expect((await getPublishedGames({ offset: 1 })).map((g) => g.slug)).toEqual(['a', 'b', 'c']);
  });

  it('getPublishedGamesCount 取快照长度', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [row('a', []), row('b', [])] });

    expect(await getPublishedGamesCount()).toBe(2);
  });

  it('getFeaturedGames 置顶保序，其余按快照顺序补足', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [row('x', []), row('pinned', []), row('y', [])],
    });

    const games = await getFeaturedGames({ pinnedSlugs: ['pinned', 'missing'], limit: 2 });

    expect(games.map((g) => g.slug)).toEqual(['pinned', 'x']);
  });

  it('getAllTags 聚合计数并倒序', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [row('a', ['悬疑', '奇幻']), row('b', ['悬疑'])],
    });

    expect(await getAllTags()).toEqual([
      { tag: '悬疑', count: 2 },
      { tag: '奇幻', count: 1 },
    ]);
  });

  it('线上抓不到就返回空（保持现状，不抛错）', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    expect(await getPublishedGames()).toEqual([]);
    expect(await getPublishedGamesCount()).toBe(0);
    expect(await getAllTags()).toEqual([]);
  });

  it('非 https 站点（本地构建）不发起抓取', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

    expect(await getPublishedGames()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('目录查询 SQL 带正文存在检查（sitemap/列表与播放页同口径）', async () => {
    const seenSql: string[] = [];
    const mockDB = {
      prepare: vi.fn((sql: string) => {
        seenSql.push(sql);
        return {
          bind: () => ({ all: async () => ({ results: [] }), first: async () => ({ count: 0 }) }),
          all: async () => ({ results: [] }),
        };
      }),
    };
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: { DB: mockDB } });

    await getPublishedGames();
    await getGamesByTag('悬疑');
    await getAllTags();

    expect(seenSql.length).toBeGreaterThan(0);
    expect(seenSql.every((sql) => sql.includes('GameContent'))).toBe(true);
  });

  it('getGamesByTag 无 D1 时从快照按标签过滤并计数', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [row('a', ['悬疑', '奇幻']), row('b', ['悬疑']), row('c', ['科幻'])],
    });

    const { games, total } = await getGamesByTag('悬疑', { limit: 1, offset: 1 });

    expect(total).toBe(2);
    expect(games.map((g) => g.slug)).toEqual(['b']);
  });

  it('getRelatedGames 无 D1 时排除自己并按匹配数排序', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [row('me', ['悬疑']), row('a', ['悬疑', '奇幻']), row('b', ['悬疑'])],
    });

    const related = await getRelatedGames('me', ['悬疑', '奇幻'], 4);

    expect(related.map((g) => g.slug)).toEqual(['a', 'b']);
  });

  it('getGameBySlug 构建期抓单游戏 API，并过滤创作者 prompt', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'T',
        slug: 't',
        ai: {
          characters: {
            hero: { name: 'H', image_url: 'u', description: 'SECRET', image_prompt: 'SECRET' },
          },
        },
        scenes: { start: { id: 'start', nodes: [{ type: 'text', content: 'hi' }] } },
      }),
    });

    const game = await getGameBySlug('t');

    expect(fetchMock.mock.calls[0][0]).toBe('https://muistory.com/api/games/t');
    expect(game).not.toBeNull();
    expect(game?.scenes['start'].nodes).toHaveLength(1);
    expect(game?.characters?.['hero']).toEqual({ name: 'H', image_url: 'u' });
  });

  it('getGameBySlug 线上 404 时返回 null（调用方走 404）', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    expect(await getGameBySlug('gone')).toBeNull();
  });

  it('getGameBySlug D1 查询抛错时向上抛（500，不吞成 null 误缓存）', async () => {
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
      env: {
        DB: {
          prepare: vi.fn(() => {
            throw new Error('D1 down');
          }),
        },
      },
    });

    await expect(getGameBySlug('x')).rejects.toThrow('D1 down');
  });

  it('getGameBySlug 无 DB binding 时抛错而非返回 null', async () => {
    (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({ env: {} });

    await expect(getGameBySlug('x')).rejects.toThrow();
  });
});
