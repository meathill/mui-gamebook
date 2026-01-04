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
