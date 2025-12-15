import { parse } from '@mui-gamebook/parser';
import { toPlayableGame, toSerializablePlayableGame } from '@mui-gamebook/parser/src/types';
import type { SerializablePlayableGame } from '@mui-gamebook/parser/src/types';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GameRow } from '@/types';
import { cache } from 'react';
import { getSession } from '@/lib/auth-server';

export async function getPublishedGames() {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB; // Assume binding name is DB

    if (!DB) {
      console.error("D1 database binding 'DB' not found.");
      return [];
    }

    const { results } = (await DB.prepare(
      'SELECT slug, title, description, cover_image, tags FROM Games WHERE published = 1 ORDER BY updated_at DESC',
    ).all()) as { results: GameRow[] };

    return results.map((row: GameRow) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  } catch (e) {
    console.error('Failed to fetch from D1:', e);
    return [];
  }
}

export async function getGameBySlug(slug: string): Promise<SerializablePlayableGame | null> {
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
      // 返回可序列化的游戏数据（Map 转换为 Record）
      const playableGame = toPlayableGame(result.data);
      return toSerializablePlayableGame(playableGame);
    }

    return null;
  } catch (e) {
    console.error('Failed to fetch game from D1:', e);
    return null;
  }
}

export const cachedGetGameBySlug = cache(getGameBySlug);
