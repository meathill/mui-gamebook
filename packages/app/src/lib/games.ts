import { parse } from '@mui-gamebook/parser';
import { toPlayableGame } from '@mui-gamebook/parser/src/utils';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GameRow, ParsedGameRow } from '@/types';
import { cache } from 'react';

function safeParseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((t) => typeof t === 'string');
    return [];
  } catch {
    return [];
  }
}

/** 线上 API 行的 tags 可能是已解析数组（API 直接返回），也可能是 D1 存的 JSON 字符串 */
function normalizeTags(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string');
  return safeParseTags(raw ?? null);
}

/**
 * 「可玩」口径：已发布且正文存在。sitemap/列表/置顶/tag/推荐统一用它，
 * 与播放页 getGameBySlug（有记录 + 正文非空 + 解析成功）对齐，
 * 避免 sitemap 收录打不开的死链（Ahrefs noindex-in-sitemap）。
 */
function playableContentExists(gamesAlias: string) {
  return `EXISTS (SELECT 1 FROM GameContent c WHERE c.game_id = ${gamesAlias}.id AND c.content IS NOT NULL AND TRIM(c.content) != '')`;
}

/**
 * 评分聚合列（标量子查询）：只统计未被创作者隐藏的评分。
 * GameRatings 表不存在的旧库上整个查询会抛错，调用方外层 catch 统一兜底。
 */
function ratingColumns(gamesAlias: string) {
  return `(SELECT AVG(rating) FROM GameRatings WHERE hidden = 0 AND game_id = ${gamesAlias}.id) AS avg_rating, (SELECT COUNT(*) FROM GameRatings WHERE hidden = 0 AND game_id = ${gamesAlias}.id) AS rating_count`;
}

/** 把行里的 avg_rating/rating_count 归一化为 avgRating/ratingCount */
function pickRating(row: { avg_rating?: number | null; rating_count?: number | null }) {
  return {
    avgRating: typeof row.avg_rating === 'number' ? row.avg_rating : undefined,
    ratingCount: typeof row.rating_count === 'number' ? row.rating_count : 0,
  };
}

/** 构建期抓线上公开 API 的分页大小（与 /api/games 上限对齐） */
const LIVE_SNAPSHOT_PAGE_SIZE = 100;

function getLiveSiteBase(): string | null {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  return base.startsWith('https://') ? base : null;
}

/**
 * 无 D1 binding 时的回退：构建期 `getCloudflareContext()` 直接抛错，
 * 此时抓线上公开 /api/games 全量快照做预渲染，避免把空目录 bake 进 ISR 缓存。
 * 线上 API 本身是 dynamic、直读生产 D1，不会预渲染，不存在循环依赖。
 * 非 https 站点（本地构建）不抓；抓不到就返回空数组（保持现状）。
 */
async function fetchLiveGamesSnapshot(): Promise<ParsedGameRow[]> {
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
async function fetchLiveGameBySlug(slug: string): Promise<GameDetail | null> {
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
function applyGamesPaging(rows: ParsedGameRow[], options?: { limit?: number; offset?: number }): ParsedGameRow[] {
  if (!options?.limit) return rows;
  const offset = options.offset ?? 0;
  return rows.slice(offset, offset + options.limit);
}

export async function getPublishedGames(options?: { limit?: number; offset?: number }) {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) {
      console.error("D1 database binding 'DB' not found.");
      return applyGamesPaging(await fetchLiveGamesSnapshot(), options);
    }

    let query = `SELECT slug, title, description, cover_image, tags, created_at, updated_at, ${ratingColumns('Games')} FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')} ORDER BY updated_at DESC`;

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options?.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }

    const { results } = (await DB.prepare(query).all()) as { results: GameRow[] };

    return results.map((row: GameRow) => ({
      ...row,
      tags: safeParseTags(row.tags),
      ...pickRating(row),
    }));
  } catch (e) {
    console.error('Failed to fetch from D1:', e);
    return applyGamesPaging(await fetchLiveGamesSnapshot(), options);
  }
}

/**
 * 首页精选：置顶 slug 优先（按给定顺序），其余按 updated_at 补足到 limit
 */
export async function getFeaturedGames(options: { pinnedSlugs: string[]; limit: number }): Promise<ParsedGameRow[]> {
  const { pinnedSlugs, limit } = options;
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) {
      console.error("D1 database binding 'DB' not found.");
      return pickFeatured(await fetchLiveGamesSnapshot(), pinnedSlugs, limit);
    }

    const columns = `slug, title, description, cover_image, tags, created_at, updated_at, ${ratingColumns('Games')}`;
    let pinned: GameRow[] = [];
    if (pinnedSlugs.length > 0) {
      const placeholders = pinnedSlugs.map(() => '?').join(', ');
      const { results } = (await DB.prepare(
        `SELECT ${columns} FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')} AND slug IN (${placeholders})`,
      )
        .bind(...pinnedSlugs)
        .all()) as { results: GameRow[] };
      const bySlug = new Map(results.map((row) => [row.slug, row]));
      pinned = pinnedSlugs.map((slug) => bySlug.get(slug)).filter((row): row is GameRow => !!row);
    }

    const { results: recent } = (await DB.prepare(
      `SELECT ${columns} FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')} ORDER BY updated_at DESC LIMIT ?`,
    )
      .bind(limit)
      .all()) as { results: GameRow[] };

    const seen = new Set(pinned.map((row) => row.slug));
    const merged = [...pinned];
    for (const row of recent) {
      if (merged.length >= limit) break;
      if (!seen.has(row.slug)) {
        seen.add(row.slug);
        merged.push(row);
      }
    }

    return merged.map((row) => ({
      ...row,
      tags: safeParseTags(row.tags),
      ...pickRating(row),
    }));
  } catch (e) {
    console.error('Failed to fetch featured games:', e);
    return pickFeatured(await fetchLiveGamesSnapshot(), pinnedSlugs, limit);
  }
}

/** 线上快照已按 updated_at 倒序：置顶优先（保序），其余补足到 limit */
function pickFeatured(snapshot: ParsedGameRow[], pinnedSlugs: string[], limit: number): ParsedGameRow[] {
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

export async function getPublishedGamesCount(): Promise<number> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) return (await fetchLiveGamesSnapshot()).length;

    const result = await DB.prepare(
      `SELECT COUNT(*) as count FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')}`,
    ).first<{
      count: number;
    }>();
    return result?.count ?? 0;
  } catch (e) {
    console.error('Failed to get games count:', e);
    return (await fetchLiveGamesSnapshot()).length;
  }
}

export async function getRelatedGames(currentSlug: string, tags: string[], limit = 4): Promise<ParsedGameRow[]> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB || tags.length === 0) {
      if (!DB) return getRelatedGamesFromLive(currentSlug, tags, limit);
      return [];
    }

    // 获取所有已发布且可玩的游戏（除当前游戏外），然后在内存中按标签匹配排序
    const { results } = (await DB.prepare(
      `SELECT slug, title, description, cover_image, tags, created_at, updated_at, ${ratingColumns('Games')}
       FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')} AND slug != ?
       ORDER BY updated_at DESC`,
    )
      .bind(currentSlug)
      .all()) as { results: GameRow[] };

    // 计算每个游戏与当前游戏的标签匹配数
    const gamesWithScore = results.map((row) => {
      const gameTags: string[] = safeParseTags(row.tags);
      const matchCount = gameTags.filter((tag) => tags.includes(tag)).length;
      return {
        ...row,
        tags: gameTags,
        matchCount,
      };
    });

    // 按匹配数排序，取前 N 个
    return gamesWithScore
      .filter((g) => g.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, limit)
      .map(({ matchCount: _, ...rest }) => ({ ...rest, ...pickRating(rest) }));
  } catch (e) {
    console.error('Failed to get related games:', e);
    return getRelatedGamesFromLive(currentSlug, tags, limit);
  }
}

async function getRelatedGamesFromLive(currentSlug: string, tags: string[], limit: number): Promise<ParsedGameRow[]> {
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

/**
 * 作品详情页数据：可玩内容 + 公开展示用的作者与更新时间（issue #14）
 */
export type GameDetail = PlayableGame & {
  id?: number;
  authorName?: string;
  authorImage?: string;
  updatedAt?: string;
  /** 公开评分均分（无评分/旧库时为 undefined） */
  avgRating?: number;
  /** 计入均分的评分条数 */
  ratingCount?: number;
};

/**
 * 三态语义（调用方据此区分处理）：
 * - 正常 playable → GameDetail
 * - 真缺失（无记录/无正文/解析失败/未发布/被封禁）→ null，调用方走 404
 * - 运行时 D1 不可用或查询抛错 → throw，调用方走 500（不进 ISR 缓存，避免故障期全站误 404）
 * - 构建期（NEXT_PHASE=phase-production-build）：D1 可能直接抛错（无上下文），
 *   也可能连上一个空表（no such table），统一抓线上公开 API；抓不到则 null，
 *   保证构建通过，靠重验证自愈。
 *
 * options.includeShadowBanned：预览路径（作者/管理员）放行被封禁作品；公开路径不传。
 */
export async function getGameBySlug(
  slug: string,
  options?: { includeShadowBanned?: boolean },
): Promise<GameDetail | null> {
  let cloudflareContext: { env: { DB: unknown } };
  try {
    cloudflareContext = getCloudflareContext() as { env: { DB: unknown } };
  } catch {
    return fetchLiveGameBySlug(slug);
  }
  const DB = cloudflareContext.env.DB as
    | {
        prepare: (query: string) => {
          bind: (...args: unknown[]) => { first: <T>() => Promise<T | null> };
        };
      }
    | null
    | undefined;

  if (!DB) {
    if (isBuildPhase()) return fetchLiveGameBySlug(slug);
    throw new Error("D1 database binding 'DB' not found.");
  }

  try {
    let gameRecord = await DB.prepare(
      `SELECT g.id, g.owner_id, g.published, g.shadow_banned, g.updated_at, c.content, u.name AS author_name, u.image AS author_image
FROM Games g
LEFT JOIN GameContent c ON c.game_id = g.id
LEFT JOIN user u ON u.id = g.owner_id
WHERE g.slug = ?`,
    )
      .bind(slug)
      .first<{
        id: number;
        owner_id: string | null;
        published: number;
        shadow_banned: number;
        updated_at: number;
        content: string;
        author_name: string | null;
        author_image: string | null;
      }>();

    if (!gameRecord && /^-?\d+$/.test(slug)) {
      gameRecord = await DB.prepare(
        `SELECT g.id, g.owner_id, g.published, g.shadow_banned, g.updated_at, c.content, u.name AS author_name, u.image AS author_image
FROM Games g
LEFT JOIN GameContent c ON c.game_id = g.id
LEFT JOIN user u ON u.id = g.owner_id
WHERE g.id = ?`,
      )
        .bind(Number(slug))
        .first<{
          id: number;
          owner_id: string | null;
          published: number;
          shadow_banned: number;
          updated_at: number;
          content: string;
          author_name: string | null;
          author_image: string | null;
        }>();
    }

    if (!gameRecord || !gameRecord.content) {
      return null;
    }

    const result = parse(gameRecord.content);
    if (!result.success) {
      return null;
    }

    const isPublished = gameRecord.published === 1 || result.data.published || !!result.data.subdomain;
    if (!isPublished) {
      return null;
    }

    // shadowban：公开路径一律 404；预览路径（作者/管理员）显式放行
    if (gameRecord.shadow_banned === 1 && !options?.includeShadowBanned) {
      return null;
    }

    // 返回可玩游戏数据（包含 id 用于分析追踪、作者/更新时间用于 SEO 展示）
    const timestamp = Number(gameRecord.updated_at);
    const updatedAt =
      timestamp > 0 ? new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp).toISOString() : undefined;
    // 评分聚合独立查询：GameRatings 表不存在的旧库上失败也不影响详情主体
    let avgRating: number | undefined;
    let ratingCount = 0;
    try {
      const agg = await DB.prepare(
        `SELECT AVG(rating) AS avg_rating, COUNT(*) AS rating_count FROM GameRatings WHERE hidden = 0 AND game_id = ?`,
      )
        .bind(gameRecord.id)
        .first<{ avg_rating: number | null; rating_count: number }>();
      if (typeof agg?.avg_rating === 'number') avgRating = agg.avg_rating;
      if (typeof agg?.rating_count === 'number') ratingCount = agg.rating_count;
    } catch {
      // 旧库无表时静默降级为无评分
    }
    return {
      ...toPlayableGame(result.data),
      id: gameRecord.id,
      authorName: gameRecord.author_name ?? undefined,
      authorImage: gameRecord.author_image ?? undefined,
      updatedAt,
      avgRating,
      ratingCount,
    };
  } catch (e) {
    // 查询失败：构建期抓线上快照保构建通过；运行时向上抛走 500，不误缓存 404
    console.error('Failed to fetch game from D1:', e);
    if (isBuildPhase()) return fetchLiveGameBySlug(slug);
    throw e;
  }
}

/** Next 构建期（next build 预渲染）为 true；线上 Worker 运行时无此变量 */
function isBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

export const cachedGetGameBySlug = cache(getGameBySlug);

/**
 * 按标签获取已发布的游戏
 * 优先使用 GameTags 关联表，若表不存在则降级到 JSON 解析
 */
export async function getGamesByTag(
  tag: string,
  options?: { limit?: number; offset?: number },
): Promise<{ games: ParsedGameRow[]; total: number }> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) {
      console.error("D1 database binding 'DB' not found.");
      return getGamesByTagFromLive(tag, options);
    }

    // 尝试使用 GameTags 关联表查询
    try {
      // 获取总数
      const countResult = await DB.prepare(
        `SELECT COUNT(DISTINCT g.id) as count
         FROM Games g
         INNER JOIN GameTags gt ON g.id = gt.game_id
         WHERE g.published = 1 AND g.shadow_banned = 0 AND ${playableContentExists('g')} AND gt.tag = ?`,
      )
        .bind(tag)
        .first<{ count: number }>();

      const total = countResult?.count ?? 0;

      // 分页查询
      let query = `SELECT g.slug, g.title, g.description, g.cover_image, g.tags, g.created_at, g.updated_at, ${ratingColumns('g')}
                   FROM Games g
                   INNER JOIN GameTags gt ON g.id = gt.game_id
                   WHERE g.published = 1 AND g.shadow_banned = 0 AND ${playableContentExists('g')} AND gt.tag = ?
                   ORDER BY g.updated_at DESC`;

      if (options?.limit) {
        query += ` LIMIT ${options.limit}`;
        if (options?.offset) {
          query += ` OFFSET ${options.offset}`;
        }
      }

      const { results } = (await DB.prepare(query).bind(tag).all()) as { results: GameRow[] };

      return {
        games: results.map((row) => ({
          ...row,
          tags: safeParseTags(row.tags),
          ...pickRating(row),
        })),
        total,
      };
    } catch {
      // GameTags 表不存在，降级到旧方法
      console.log('GameTags table not found, falling back to JSON parsing');
    }

    // 降级：获取所有已发布且可玩的游戏，然后在内存中筛选
    const { results } = (await DB.prepare(
      `SELECT slug, title, description, cover_image, tags, created_at, updated_at, ${ratingColumns('Games')}
       FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')}
       ORDER BY updated_at DESC`,
    ).all()) as { results: GameRow[] };

    const filteredGames = results.filter((row) => {
      const gameTags: string[] = safeParseTags(row.tags);
      return gameTags.includes(tag);
    });

    const total = filteredGames.length;

    let paginatedGames = filteredGames;
    if (options?.limit) {
      const offset = options.offset || 0;
      paginatedGames = filteredGames.slice(offset, offset + options.limit);
    }

    return {
      games: paginatedGames.map((row) => ({
        ...row,
        tags: safeParseTags(row.tags),
        ...pickRating(row),
      })),
      total,
    };
  } catch (e) {
    console.error('Failed to fetch games by tag:', e);
    return getGamesByTagFromLive(tag, options);
  }
}

/** 线上快照已按 updated_at 倒序，与 D1 分支同分页语义 */
async function getGamesByTagFromLive(
  tag: string,
  options?: { limit?: number; offset?: number },
): Promise<{ games: ParsedGameRow[]; total: number }> {
  const snapshot = await fetchLiveGamesSnapshot();
  const filtered = snapshot.filter((row) => row.tags.includes(tag));
  if (!options?.limit) return { games: filtered, total: filtered.length };
  const offset = options.offset ?? 0;
  return { games: filtered.slice(offset, offset + options.limit), total: filtered.length };
}

/**
 * 获取所有使用过的标签及其计数
 */
export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) return countTags((await fetchLiveGamesSnapshot()).map((row) => row.tags));

    const { results } = (await DB.prepare(
      `SELECT tags FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')}`,
    ).all()) as {
      results: { tags: string | null }[];
    };

    return countTags(results.map((row) => safeParseTags(row.tags)));
  } catch (e) {
    console.error('Failed to get all tags:', e);
    return countTags((await fetchLiveGamesSnapshot()).map((row) => row.tags));
  }
}

/** 标签计数聚合（D1 分支与线上快照分支共用） */
function countTags(tagLists: string[][]): { tag: string; count: number }[] {
  const tagCounts = new Map<string, number>();
  for (const tags of tagLists) {
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // 转换为数组并按计数排序
  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
