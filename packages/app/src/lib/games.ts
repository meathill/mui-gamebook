import { parse } from '@roudanio/parser';
import { toPlayableGame } from '@roudanio/parser/src/utils';
import type { PlayableGame } from '@roudanio/parser/src/types';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cache } from 'react';
import type { GameRow, ParsedGameRow } from '@/types';
import {
  countTags,
  gameListColumns,
  parseGameRow,
  pickRating,
  playableContentExists,
  ratingColumns,
  safeParseTags,
  withD1Fallback,
} from './games-shared';
import {
  applyGamesPaging,
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
  return withD1Fallback(
    'Failed to get related games:',
    () => getRelatedGamesFromLive(currentSlug, tags, limit),
    async (DB) => {
      if (tags.length === 0) return [];

      // 标签匹配数在 SQL 里算好：只回传前 N 行，避免全表拉取再内存打分。
      // 排序与旧内存版一致：匹配数降序，同分按更新时间倒序。
      try {
        const placeholders = tags.map(() => '?').join(', ');
        const { results } = (await DB.prepare(
          `SELECT ${gameListColumns('g')}, ${ratingColumns('g')}, COUNT(gt.tag) AS match_count
           FROM Games g
           INNER JOIN GameTags gt ON g.id = gt.game_id
           WHERE g.published = 1 AND g.shadow_banned = 0 AND ${playableContentExists('g')} AND g.slug != ? AND gt.tag IN (${placeholders})
           GROUP BY g.id
           ORDER BY match_count DESC, g.updated_at DESC
           LIMIT ?`,
        )
          .bind(currentSlug, ...tags, limit)
          .all()) as { results: (GameRow & { match_count: number })[] };

        return results.map(({ match_count: _, ...row }) => parseGameRow(row));
      } catch {
        // GameTags 表不存在，降级到旧方法
        console.log('GameTags table not found, falling back to full scan');
      }

      // 降级：获取所有已发布且可玩的游戏（除当前游戏外），然后在内存中按标签匹配排序
      const { results } = (await DB.prepare(
        `SELECT ${gameListColumns('Games')}, ${ratingColumns('Games')}
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
  return withD1Fallback(
    'Failed to fetch games by tag:',
    () => getGamesByTagFromLive(tag, options),
    async (DB) => {
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
        let query = `SELECT ${gameListColumns('g')}, ${ratingColumns('g')}
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
          games: results.map(parseGameRow),
          total,
        };
      } catch {
        // GameTags 表不存在，降级到旧方法
        console.log('GameTags table not found, falling back to JSON parsing');
      }

      // 降级：获取所有已发布且可玩的游戏，然后在内存中筛选
      const { results } = (await DB.prepare(
        `SELECT ${gameListColumns('Games')}, ${ratingColumns('Games')}
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
        games: paginatedGames.map(parseGameRow),
        total,
      };
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
