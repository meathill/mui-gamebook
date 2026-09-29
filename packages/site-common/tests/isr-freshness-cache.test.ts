import { describe, expect, it, vi } from 'vitest';
import { applyStoredRevalidate, type NextModeTagCache } from '../src/open-next/isr-freshness-cache';

const NOW = 1_800_000_000_000;
const HOUR = 3600;

type Entry = Parameters<typeof applyStoredRevalidate>[0];

function appEntry(ageSeconds: number, headers: Record<string, string> = {}) {
  return {
    lastModified: NOW - ageSeconds * 1000,
    value: {
      type: 'app',
      html: '<html></html>',
      rsc: '',
      revalidate: HOUR,
      meta: { status: 200, headers: { 'x-next-cache-tags': '_N_T_/layout,_N_T_/games', ...headers } },
    },
  } as unknown as Entry;
}

function tagCache(opts: { revalidated?: boolean; stale?: boolean; mode?: string } = {}): NextModeTagCache {
  return {
    mode: opts.mode ?? 'nextMode',
    hasBeenRevalidated: vi.fn().mockResolvedValue(opts.revalidated ?? false),
    isStale: vi.fn().mockResolvedValue(opts.stale ?? false),
  };
}

function headersOf(entry: Entry): Record<string, unknown> {
  return (entry.value as { meta: { headers: Record<string, unknown> } }).meta.headers;
}

describe('applyStoredRevalidate', () => {
  it('TTL 内且 tag 未失效：lastModified 报为 now，写入剩余 s-maxage', async () => {
    const cache = tagCache();
    const entry = appEntry(60);
    const result = await applyStoredRevalidate(entry, NOW, cache);

    expect(result.lastModified).toBe(NOW);
    expect(headersOf(result)['cache-control']).toBe(`s-maxage=${HOUR - 60}, stale-while-revalidate=2592000`);
    expect(cache.hasBeenRevalidated).toHaveBeenCalledWith(['_N_T_/layout', '_N_T_/games'], NOW - 60 * 1000);
    expect(entry.lastModified).toBe(NOW - 60 * 1000);
  });

  it('tag 已失效：原样返回', async () => {
    const entry = appEntry(60);
    const result = await applyStoredRevalidate(entry, NOW, tagCache({ revalidated: true }));
    expect(result).toBe(entry);
  });

  it('超过 TTL：原样返回，不查 tag', async () => {
    const cache = tagCache();
    const entry = appEntry(HOUR + 1);
    expect(await applyStoredRevalidate(entry, NOW, cache)).toBe(entry);
    expect(cache.hasBeenRevalidated).not.toHaveBeenCalled();
  });

  it('拿不到 next-mode tag cache 时保守不改', async () => {
    const entry = appEntry(60);
    expect(await applyStoredRevalidate(entry, NOW, undefined)).toBe(entry);
    expect(await applyStoredRevalidate(entry, NOW, tagCache({ mode: 'original' }))).toBe(entry);
  });

  it('已有 Cache-Control 的路由处理器不覆盖', async () => {
    const entry = appEntry(60, { 'cache-control': 'public, s-maxage=60' });
    const result = await applyStoredRevalidate(entry, NOW, tagCache());
    expect(headersOf(result)['cache-control']).toBe('public, s-maxage=60');
    expect(result.lastModified).toBe(NOW);
  });
});
