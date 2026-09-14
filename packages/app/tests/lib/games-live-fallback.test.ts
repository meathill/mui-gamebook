import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getAllTags, getFeaturedGames, getPublishedGames, getPublishedGamesCount } from '@/lib/games';

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
});
