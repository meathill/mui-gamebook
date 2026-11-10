import { parse } from '@roudanio/parser';
import { toPlayableGame } from '@roudanio/parser/src/utils';
import type { PlayableGame } from '@roudanio/parser/src/types';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cache } from 'react';
import type { GameRow, ParsedGameRow } from '@/types';
import {
  applyGamesPaging,
  countTags,
  filterGamesByTag,
  gameListColumns,
  normalizeTagList,
  parseGameRow,
  playableContentExists,
  rankRelatedGames,
  ratingColumns,
  safeParseTags,
  withD1Fallback,
} from './games-shared';
import {
  fetchLiveGameBySlug,
  fetchLiveGamesSnapshot,
  getAllTagsFromLive,
  getGamesByTagFromLive,
  getRelatedGamesFromLive,
  pickFeatured,
} from './games-live-fallback';

export async function getPublishedGames(options?: { limit?: number; offset?: number }) {
  return withD1Fallback(
    'Failed to fetch from D1:',
    async () => applyGamesPaging(await fetchLiveGamesSnapshot(), options),
    async (DB) => {
      let query = `SELECT ${gameListColumns('Games')}, ${ratingColumns('Games')} FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')} ORDER BY updated_at DESC`;

      if (options?.limit) {
        query += ` LIMIT ${options.limit}`;
        if (options?.offset) {
          query += ` OFFSET ${options.offset}`;
        }
      }

      const { results } = (await DB.prepare(query).all()) as { results: GameRow[] };
      return results.map(parseGameRow);
    },
  );
}

/**
 * 首页精选：置顶 slug 优先（按给定顺序），其余按 updated_at 补足到 limit
 */
export async function getFeaturedGames(options: { pinnedSlugs: string[]; limit: number }): Promise<ParsedGameRow[]> {
  const { pinnedSlugs, limit } = options;
  return withD1Fallback(
    'Failed to fetch featured games:',
    async () => pickFeatured(await fetchLiveGamesSnapshot(), pinnedSlugs, limit),
    async (DB) => {
      const columns = `${gameListColumns('Games')}, ${ratingColumns('Games')}`;
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

      return merged.map(parseGameRow);
    },
  );
}

export async function getPublishedGamesCount(): Promise<number> {
  return withD1Fallback(
    'Failed to get games count:',
    async () => (await fetchLiveGamesSnapshot()).length,
    async (DB) => {
      const result = await DB.prepare(
        `SELECT COUNT(*) as count FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')}`,
      ).first<{
        count: number;
      }>();
      return result?.count ?? 0;
    },
  );
}

export async function getRelatedGames(currentSlug: string, tags: string[], limit = 4): Promise<ParsedGameRow[]> {
  const normalizedTags = normalizeTagList(tags);
  if (normalizedTags.length === 0) return [];
  return withD1Fallback(
    'Failed to get related games:',
    () => getRelatedGamesFromLive(currentSlug, normalizedTags, limit),
    async (DB) => {
      // 统一从 Games.tags JSON 读取并在内存中按匹配数打分（GameTags 表无写入链路，直接读 Games.tags 保证与目录/详情同源）
      const { results } = (await DB.prepare(
        `SELECT ${gameListColumns('Games')}, ${ratingColumns('Games')}
         FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')} AND slug != ?
         ORDER BY updated_at DESC`,
      )
        .bind(currentSlug)
        .all()) as { results: GameRow[] };

      return rankRelatedGames(results.map(parseGameRow), currentSlug, normalizedTags, limit);
    },
  );
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
 * options.includeUnpublished / includeShadowBanned：仅供已校验作者/管理员权限的预览路径使用；公开路径不传。
 */
export async function getGameBySlug(
  slug: string,
  options?: { includeShadowBanned?: boolean; includeUnpublished?: boolean },
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

    const isPublished = gameRecord.published === 1 || result.data.published;
    if (!isPublished && !options?.includeUnpublished) {
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
 * 与 getAllTags / getPublishedGames 统一从 Games.tags JSON 读取并复用相同公开过滤条件，
 * 避免依赖未维护写入的 GameTags 关联表导致标签目录显示 0 剧本（issue #30）。
 */
export async function getGamesByTag(
  tag: string,
  options?: { limit?: number; offset?: number },
): Promise<{ games: ParsedGameRow[]; total: number }> {
  const normalizedTag = tag.trim();
  if (!normalizedTag) return { games: [], total: 0 };
  return withD1Fallback(
    'Failed to fetch games by tag:',
    () => getGamesByTagFromLive(normalizedTag, options),
    async (DB) => {
      const { results } = (await DB.prepare(
        `SELECT ${gameListColumns('Games')}, ${ratingColumns('Games')}
         FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')}
         ORDER BY updated_at DESC`,
      ).all()) as { results: GameRow[] };

      return filterGamesByTag(results.map(parseGameRow), normalizedTag, options);
    },
  );
}

/**
 * 获取所有使用过的标签及其计数
 */
export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  return withD1Fallback(
    'Failed to get all tags:',
    () => getAllTagsFromLive(),
    async (DB) => {
      const { results } = (await DB.prepare(
        `SELECT tags FROM Games WHERE published = 1 AND shadow_banned = 0 AND ${playableContentExists('Games')}`,
      ).all()) as {
        results: { tags: string | null }[];
      };

      return countTags(results.map((row) => safeParseTags(row.tags)));
    },
  );
}
