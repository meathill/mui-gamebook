import { parse } from '@mui-gamebook/parser';
import { toPlayableGame } from '@mui-gamebook/parser/src/utils';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GameRow, ParsedGameRow } from '@/types';
import { cache } from 'react';
import { getSession } from '@/lib/auth-server';

export async function getPublishedGames(options?: { limit?: number; offset?: number }) {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) {
      console.error("D1 database binding 'DB' not found.");
      return [];
    }

    let query =
      'SELECT slug, title, description, cover_image, tags, created_at, updated_at FROM Games WHERE published = 1 ORDER BY updated_at DESC';

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options?.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }

    const { results } = (await DB.prepare(query).all()) as { results: GameRow[] };

    return results.map((row: GameRow) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  } catch (e) {
    console.error('Failed to fetch from D1:', e);
    return [];
  }
}

export async function getPublishedGamesCount(): Promise<number> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) return 0;

    const result = await DB.prepare('SELECT COUNT(*) as count FROM Games WHERE published = 1').first<{
      count: number;
    }>();
    return result?.count ?? 0;
  } catch (e) {
    console.error('Failed to get games count:', e);
    return 0;
  }
}

export async function getRelatedGames(currentSlug: string, tags: string[], limit = 4): Promise<ParsedGameRow[]> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB || tags.length === 0) return [];

    // 获取所有已发布游戏（除当前游戏外），然后在内存中按标签匹配排序
    const { results } = (await DB.prepare(
      `SELECT slug, title, description, cover_image, tags, created_at, updated_at
       FROM Games WHERE published = 1 AND slug != ?
       ORDER BY updated_at DESC`,
    )
      .bind(currentSlug)
      .all()) as { results: GameRow[] };

    // 计算每个游戏与当前游戏的标签匹配数
    const gamesWithScore = results.map((row) => {
      const gameTags: string[] = row.tags ? JSON.parse(row.tags) : [];
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
      .map(({ matchCount: _, ...rest }) => rest);
  } catch (e) {
    console.error('Failed to get related games:', e);
    return [];
  }
}

export async function getGameBySlug(slug: string): Promise<PlayableGame | null> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) {
      console.error("D1 database binding 'DB' not found.");
      return null;
    }

    // 获取当前用户 session
    let currentUserId: string | null = null;
    try {
      const session = await getSession();
      currentUserId = session?.user?.id || null;
    } catch {
      // 未登录用户，继续
    }

    // 获取游戏信息，包括 ownerId 和 published 状态
    const gameRecord = await DB.prepare(
      `SELECT g.id, g.owner_id, g.published, c.content
FROM Games g
LEFT JOIN GameContent c ON c.game_id = g.id
WHERE g.slug = ?`,
    )
      .bind(slug)
      .first<{ id: number; owner_id: string | null; published: number; content: string }>();

    if (!gameRecord || !gameRecord.content) {
      return null;
    }

    const isOwner = currentUserId && gameRecord.owner_id === currentUserId;
    const isPublished = gameRecord.published === 1;

    // 如果游戏未发布且当前用户不是所有者，拒绝访问
    if (!isPublished && !isOwner) {
      return null;
    }

    const result = parse(gameRecord.content);
    if (result.success) {
      // 返回可玩游戏数据（已经是 Record 类型）
      return toPlayableGame(result.data);
    }

    return null;
  } catch (e) {
    console.error('Failed to fetch game from D1:', e);
    return null;
  }
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
      return { games: [], total: 0 };
    }

    // 尝试使用 GameTags 关联表查询
    try {
      // 获取总数
      const countResult = await DB.prepare(
        `SELECT COUNT(DISTINCT g.id) as count
         FROM Games g
         INNER JOIN GameTags gt ON g.id = gt.game_id
         WHERE g.published = 1 AND gt.tag = ?`,
      )
        .bind(tag)
        .first<{ count: number }>();

      const total = countResult?.count ?? 0;

      // 分页查询
      let query = `SELECT g.slug, g.title, g.description, g.cover_image, g.tags, g.created_at, g.updated_at
                   FROM Games g
                   INNER JOIN GameTags gt ON g.id = gt.game_id
                   WHERE g.published = 1 AND gt.tag = ?
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
          tags: row.tags ? JSON.parse(row.tags) : [],
        })),
        total,
      };
    } catch {
      // GameTags 表不存在，降级到旧方法
      console.log('GameTags table not found, falling back to JSON parsing');
    }

    // 降级：获取所有已发布游戏，然后在内存中筛选
    const { results } = (await DB.prepare(
      `SELECT slug, title, description, cover_image, tags, created_at, updated_at
       FROM Games WHERE published = 1
       ORDER BY updated_at DESC`,
    ).all()) as { results: GameRow[] };

    const filteredGames = results.filter((row) => {
      const gameTags: string[] = row.tags ? JSON.parse(row.tags) : [];
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
        tags: row.tags ? JSON.parse(row.tags) : [],
      })),
      total,
    };
  } catch (e) {
    console.error('Failed to fetch games by tag:', e);
    return { games: [], total: 0 };
  }
}

/**
 * 获取所有使用过的标签及其计数
 */
export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) return [];

    const { results } = (await DB.prepare(`SELECT tags FROM Games WHERE published = 1`).all()) as {
      results: { tags: string | null }[];
    };

    // 统计每个标签的使用次数
    const tagCounts = new Map<string, number>();
    for (const row of results) {
      const tags: string[] = row.tags ? JSON.parse(row.tags) : [];
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // 转换为数组并按计数排序
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  } catch (e) {
    console.error('Failed to get all tags:', e);
    return [];
  }
}
