import { describe, expect, it, vi } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { GameRow } from '@/types';
import {
  countTags,
  gameListColumns,
  parseGameRow,
  pickRating,
  playableContentExists,
  safeParseTags,
  withD1Fallback,
} from '@/lib/games-shared';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

describe('safeParseTags', () => {
  it('解析 JSON 字符串数组，过滤非字符串项', () => {
    expect(safeParseTags('["修仙","冒险",1,null]')).toEqual(['修仙', '冒险']);
  });

  it('null/空串/非法 JSON/非数组 JSON 都返回空数组', () => {
    expect(safeParseTags(null)).toEqual([]);
    expect(safeParseTags('')).toEqual([]);
    expect(safeParseTags('not json')).toEqual([]);
    expect(safeParseTags('{"a":1}')).toEqual([]);
  });
});

describe('countTags', () => {
  it('聚合计数并按次数倒序', () => {
    expect(countTags([['a', 'b'], ['a'], [], ['c', 'a']])).toEqual([
      { tag: 'a', count: 3 },
      { tag: 'b', count: 1 },
      { tag: 'c', count: 1 },
    ]);
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
