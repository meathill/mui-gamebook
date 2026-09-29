import type { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';

/**
 * 按需 ISR 路径（不在 prerender-manifest）在 Workers 上几乎每次都是
 * `x-nextjs-cache: STALE`（s-maxage≈2）并后台重渲染。
 *
 * 根因：Next 16 IncrementalCache.calculateRevalidate 只从 prerender-manifest 或本
 * isolate 内存取 revalidate，都取不到就回退「1 秒后过期」。Workers isolate 频繁更替，
 * 段配置 `export const revalidate = N` 对这些路径实际无效。
 *
 * 修复：OpenNext 写增量缓存时把真实 revalidate 存进条目（value.revalidate）。包一层：
 * - TTL 内且 tag 未失效：lastModified 报成「现在」+ 写入剩余 s-maxage；
 * - 已过 TTL / tag 已失效：原样返回。
 *
 * 必须先用真实 lastModified 查 next-mode tag cache（D1），否则把 lastModified 改成 now
 * 后 revalidatePath/revalidateTag 永远判不中。
 */

type IncrementalCache = Parameters<typeof withRegionalCache>[0];
type CacheEntry = NonNullable<Awaited<ReturnType<IncrementalCache['get']>>>;

export type NextModeTagCache = {
  mode?: string;
  hasBeenRevalidated(tags: string[], lastModified?: number): Promise<boolean>;
  isStale?(tags: string[], lastModified?: number): Promise<boolean>;
};

const STALE_WHILE_REVALIDATE_SECONDS = 60 * 60 * 24 * 30;
const NEXT_CACHE_TAGS_HEADER = 'x-next-cache-tags';

type IsrValue = {
  type?: string;
  revalidate?: number | false;
  meta?: { headers?: Record<string, unknown> } & Record<string, unknown>;
} & Record<string, unknown>;

function findHeader(headers: Record<string, unknown>, name: string): unknown {
  const key = Object.keys(headers).find((item) => item.toLowerCase() === name);
  return key === undefined ? undefined : headers[key];
}

function readTags(headers: Record<string, unknown>): string[] {
  const raw = findHeader(headers, NEXT_CACHE_TAGS_HEADER);
  return typeof raw === 'string' ? raw.split(',').filter(Boolean) : [];
}

async function isInvalidatedByTags(
  tagCache: NextModeTagCache | undefined,
  tags: string[],
  lastModified: number,
): Promise<boolean> {
  if (tags.length === 0) return false;
  if (!tagCache || tagCache.mode !== 'nextMode') return true;
  if (await tagCache.hasBeenRevalidated(tags, lastModified)) return true;
  return (await tagCache.isStale?.(tags, lastModified)) ?? false;
}

/** 按条目自带的 revalidate 修正时间新鲜度。导出供单测。 */
export async function applyStoredRevalidate<T extends CacheEntry>(
  entry: T,
  now: number,
  tagCache: NextModeTagCache | undefined,
): Promise<T> {
  const value = entry.value as IsrValue | undefined;
  if (!value || typeof value !== 'object') return entry;
  if (value.type !== 'app' && value.type !== 'route') return entry;
  const { revalidate } = value;
  if (typeof revalidate !== 'number' || revalidate <= 0) return entry;
  const { lastModified } = entry;
  if (typeof lastModified !== 'number' || lastModified <= 0) return entry;

  const ageSeconds = (now - lastModified) / 1000;
  if (ageSeconds >= revalidate) return entry;

  const headers = { ...(value.meta?.headers ?? {}) };
  if (!entry.shouldBypassTagCache && (await isInvalidatedByTags(tagCache, readTags(headers), lastModified))) {
    return entry;
  }

  if (findHeader(headers, 'cache-control') === undefined) {
    const remaining = Math.max(1, Math.floor(revalidate - ageSeconds));
    headers['cache-control'] = `s-maxage=${remaining}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`;
  }

  return {
    ...entry,
    lastModified: now,
    value: { ...value, meta: { ...(value.meta ?? {}), headers } },
  };
}

function getGlobalTagCache(): NextModeTagCache | undefined {
  return (globalThis as { tagCache?: NextModeTagCache }).tagCache;
}

/**
 * 包装增量缓存：只改读出的副本，写入与删除透传。
 * `name` 必须透传：populateCache 按底层缓存名判断目标存储。
 */
export function withStoredRevalidate(
  store: IncrementalCache,
  getTagCache: () => NextModeTagCache | undefined = getGlobalTagCache,
): IncrementalCache {
  return {
    name: store.name,
    get: (async (key: string, cacheType?: 'cache' | 'fetch' | 'composable') => {
      const entry = await store.get(key, cacheType);
      if (!entry || (cacheType !== undefined && cacheType !== 'cache')) {
        return entry;
      }
      return applyStoredRevalidate(entry, Date.now(), getTagCache());
    }) as IncrementalCache['get'],
    set: (key, value, cacheType) => store.set(key, value, cacheType),
    delete: (key) => store.delete(key),
  };
}
