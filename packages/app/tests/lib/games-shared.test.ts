import { describe, expect, it, vi } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { GameRow } from '@/types';
import {
  applyGamesPaging,
  countTags,
  filterGamesByTag,
  gameListColumns,
  normalizeTagList,
  parseGameRow,
  pickRating,
  playableContentExists,
  rankRelatedGames,
  safeParseTags,
  withD1Fallback,
} from '@/lib/games-shared';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

describe('normalizeTagList / safeParseTags', () => {
  it('解析 JSON 字符串数组，过滤非字符串项、空串与重复项，并去除首尾空白', () => {
    expect(safeParseTags('["修仙"," 冒险 ",1,null,"","   ","修仙"]')).toEqual(['修仙', '冒险']);
    expect(normalizeTagList([' 哈利波特 ', '哈利波特', '', '穿越'])).toEqual(['哈利波特', '穿越']);
  });

  it('null/空串/非法 JSON/非数组 JSON 都返回空数组', () => {
    expect(safeParseTags(null)).toEqual([]);
    expect(safeParseTags('')).toEqual([]);
    expect(safeParseTags('not json')).toEqual([]);
    expect(safeParseTags('{"a":1}')).toEqual([]);
    expect(normalizeTagList(null)).toEqual([]);
  });
});

describe('countTags / filterGamesByTag / rankRelatedGames', () => {
  it('聚合计数并按次数倒序，单部作品内重复标签或空白只计一次', () => {
    expect(countTags([['a', 'b', 'a'], [' a '], [''], ['c', 'a']])).toEqual([
      { tag: 'a', count: 3 },
      { tag: 'b', count: 1 },
      { tag: 'c', count: 1 },
    ]);
  });

  it('filterGamesByTag 支持首尾空白归一化与分页，且 total 与 countTags 一致', () => {
    const games = [
      parseGameRow({
        slug: 'hp',
        title: '哈利·波特与密室',
        description: '',
        cover_image: '',
        tags: '["哈利波特","穿越","哈利波特"]',
        created_at: '1',
        updated_at: '2',
      }),
      parseGameRow({
        slug: 'isekai',
        title: '异世界之旅',
        description: '',
        cover_image: '',
        tags: '[" 穿越 "]',
        created_at: '1',
        updated_at: '1',
      }),
    ];

    const counts = countTags(games.map((g) => g.tags));
    expect(counts).toEqual([
      { tag: '穿越', count: 2 },
      { tag: '哈利波特', count: 1 },
    ]);

    const hpResult = filterGamesByTag(games, ' 哈利波特 ');
    expect(hpResult.total).toBe(1);
    expect(hpResult.games.map((g) => g.slug)).toEqual(['hp']);

    const pagedIsekai = filterGamesByTag(games, '穿越', { limit: 1, offset: 1 });
    expect(pagedIsekai.total).toBe(2);
    expect(pagedIsekai.games.map((g) => g.slug)).toEqual(['isekai']);

    expect(filterGamesByTag(games, '   ')).toEqual({ games: [], total: 0 });
    expect(applyGamesPaging(games, { offset: 1 })).toHaveLength(2);
  });

  it('rankRelatedGames 排除当前作品并按命中标签数排序', () => {
    const games = [
      parseGameRow({
        slug: 'current',
        title: 'Current',
        description: '',
        cover_image: '',
        tags: '["悬疑","探案"]',
        created_at: '1',
        updated_at: '5',
      }),
      parseGameRow({
        slug: 'one-match',
        title: 'One',
        description: '',
        cover_image: '',
        tags: '["悬疑"]',
        created_at: '1',
        updated_at: '4',
      }),
      parseGameRow({
        slug: 'two-matches',
        title: 'Two',
        description: '',
        cover_image: '',
        tags: '["悬疑","探案"]',
        created_at: '1',
        updated_at: '3',
      }),
    ];

    expect(rankRelatedGames(games, 'current', ['悬疑', '探案'], 4).map((g) => g.slug)).toEqual([
      'two-matches',
      'one-match',
    ]);
    expect(rankRelatedGames(games, 'current', ['   '], 4)).toEqual([]);
  });
});

describe('pickRating / parseGameRow', () => {
  it('数值列归一化为 avgRating/ratingCount，缺失时 avgRating 为 undefined', () => {
    expect(pickRating({ avg_rating: 4.5, rating_count: 2 })).toEqual({ avgRating: 4.5, ratingCount: 2 });
    expect(pickRating({ avg_rating: null, rating_count: null })).toEqual({ avgRating: undefined, ratingCount: 0 });
    expect(pickRating({})).toEqual({ avgRating: undefined, ratingCount: 0 });
  });

  it('parseGameRow 解析 tags JSON 并带出评分', () => {
    const row = {
      slug: 'g',
      title: '',
      description: '',
      cover_image: '',
      tags: '["x"]',
      created_at: '',
      updated_at: '',
      avg_rating: 4,
      rating_count: 1,
    } as GameRow & { avg_rating: number | null; rating_count: number | null };
    const parsed = parseGameRow(row as GameRow);
    expect(parsed.tags).toEqual(['x']);
    expect(parsed.avgRating).toBe(4);
    expect(parsed.ratingCount).toBe(1);
  });
});

describe('gameListColumns', () => {
  it('无别名时输出裸列名，有别名时全部带前缀', () => {
    expect(gameListColumns()).toBe('slug, title, description, cover_image, tags, created_at, updated_at');
    expect(gameListColumns('g')).toContain('g.slug, g.title');
    expect(gameListColumns('g')).not.toMatch(/(^| )slug/);
  });
});

describe('playableContentExists', () => {
  it('生成带表别名的 GameContent EXISTS 子查询', () => {
    const sql = playableContentExists('Games');
    expect(sql).toContain('FROM GameContent c');
    expect(sql).toContain('c.game_id = Games.id');
    expect(sql).toContain("TRIM(c.content) != ''");
  });
});

describe('withD1Fallback', () => {
  it('有 D1 binding 时走 run 分支', async () => {
    vi.mocked(getCloudflareContext).mockReturnValue({ env: { DB: { marker: true } } } as never);
    const result = await withD1Fallback(
      'label:',
      async () => 'fallback',
      async (DB) => `run:${JSON.stringify(DB)}`,
    );
    expect(result).toBe('run:{"marker":true}');
  });

  it('无 binding / 上下文抛错 / 查询抛错都回落 fallback', async () => {
    vi.mocked(getCloudflareContext).mockReturnValue({ env: {} } as never);
    expect(
      await withD1Fallback(
        'l:',
        async () => 'fb',
        async () => 'run',
      ),
    ).toBe('fb');

    vi.mocked(getCloudflareContext).mockImplementation(() => {
      throw new Error('no context');
    });
    expect(
      await withD1Fallback(
        'l:',
        async () => 'fb',
        async () => 'run',
      ),
    ).toBe('fb');

    vi.mocked(getCloudflareContext).mockReturnValue({ env: { DB: {} } } as never);
    expect(
      await withD1Fallback(
        'l:',
        async () => 'fb',
        async () => {
          throw new Error('D1 down');
        },
      ),
    ).toBe('fb');
  });
});
