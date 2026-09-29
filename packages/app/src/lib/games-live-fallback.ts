import { toPlayableGame } from '@mui-gamebook/parser/src/utils';
import type { GameRow, ParsedGameRow } from '@/types';
import { countTags, safeParseTags } from './games-shared';
import type { GameDetail } from './games';

/** 构建期抓线上公开 API 的分页大小（与 /api/games 上限对齐） */
const LIVE_SNAPSHOT_PAGE_SIZE = 100;

function getLiveSiteBase(): string | null {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  return base.startsWith('https://') ? base : null;
}

/** 线上 API 行的 tags 可能是已解析数组（API 直接返回），也可能是 D1 存的 JSON 字符串 */
function normalizeTags(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string');
  return safeParseTags(raw ?? null);
}

/**
 * 无 D1 binding 时的回退：构建期 `getCloudflareContext()` 直接抛错，
 * 此时抓线上公开 /api/games 全量快照做预渲染，避免把空目录 bake 进 ISR 缓存。
 * 线上 API 本身是 dynamic、直读生产 D1，不会预渲染，不存在循环依赖。
 * 非 https 站点（本地构建）不抓；抓不到就返回空数组（保持现状）。
 */
export async function fetchLiveGamesSnapshot(): Promise<ParsedGameRow[]> {
  const base = getLiveSiteBase();
  if (!base) return [];
  const snapshot: ParsedGameRow[] = [];
  try {
    for (let offset = 0; ; offset += LIVE_SNAPSHOT_PAGE_SIZE) {
      const res = await fetch(`${base}/api/games?limit=${LIVE_SNAPSHOT_PAGE_SIZE}&offset=${offset}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];
      const page = (await res.json()) as Array<Omit<GameRow, 'tags'> & { tags: string | string[] }>;
      if (!Array.isArray(page) || page.length === 0) break;
      snapshot.push(...page.map((row) => ({ ...row, tags: normalizeTags(row.tags) })));
      if (page.length < LIVE_SNAPSHOT_PAGE_SIZE) break;
    }
    return snapshot;
  } catch {
    return [];
  }
}

/**
 * 构建期抓单游戏线上公开 API（404/失败 → null）。
 * toPlayableGame 过滤掉创作者 prompt 等 AI 字段，不泄露进预渲染 HTML。
 */
export async function fetchLiveGameBySlug(slug: string): Promise<GameDetail | null> {
  const base = getLiveSiteBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/games/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Parameters<typeof toPlayableGame>[0];
    if (!data || typeof data !== 'object') return null;
    return { ...toPlayableGame(data) };
  } catch {
    return null;
  }
}

/** 与 D1 分支同语义：只有带 limit 才做分页（offset 单独出现时忽略） */
export function applyGamesPaging(
  rows: ParsedGameRow[],
  options?: { limit?: number; offset?: number },
): ParsedGameRow[] {
  if (!options?.limit) return rows;
  const offset = options.offset ?? 0;
  return rows.slice(offset, offset + options.limit);
}

/** 线上快照已按 updated_at 倒序：置顶优先（保序），其余补足到 limit */
export function pickFeatured(snapshot: ParsedGameRow[], pinnedSlugs: string[], limit: number): ParsedGameRow[] {
  const bySlug = new Map(snapshot.map((row) => [row.slug, row]));
  const pinned = pinnedSlugs.map((slug) => bySlug.get(slug)).filter((row): row is ParsedGameRow => !!row);
  const seen = new Set(pinned.map((row) => row.slug));
  const merged = [...pinned];
  for (const row of snapshot) {
    if (merged.length >= limit) break;
    if (!seen.has(row.slug)) {
      seen.add(row.slug);
      merged.push(row);
    }
  }
  return merged;
}

export async function getRelatedGamesFromLive(
  currentSlug: string,
  tags: string[],
  limit: number,
): Promise<ParsedGameRow[]> {
  if (tags.length === 0) return [];
  const snapshot = await fetchLiveGamesSnapshot();
  return snapshot
    .filter((row) => row.slug !== currentSlug)
    .map((row) => ({ ...row, matchCount: row.tags.filter((tag) => tags.includes(tag)).length }))
    .filter((g) => g.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit)
    .map(({ matchCount: _, ...rest }) => rest);
}

/** 线上快照已按 updated_at 倒序，与 D1 分支同分页语义 */
export async function getGamesByTagFromLive(
  tag: string,
  options?: { limit?: number; offset?: number },
): Promise<{ games: ParsedGameRow[]; total: number }> {
  const snapshot = await fetchLiveGamesSnapshot();
  const filtered = snapshot.filter((row) => row.tags.includes(tag));
  if (!options?.limit) return { games: filtered, total: filtered.length };
  const offset = options.offset ?? 0;
  return { games: filtered.slice(offset, offset + options.limit), total: filtered.length };
}

/** getAllTags 的构建期回退：从线上快照内存推导 */
export async function getAllTagsFromLive(): Promise<{ tag: string; count: number }[]> {
  return countTags((await fetchLiveGamesSnapshot()).map((row) => row.tags));
}
