import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface MinigameRow {
  id: number;
  name: string;
  description: string | null;
  code: string;
  status: string;
  created_at: number;
}

/**
 * 获取公开的小游戏列表（已完成状态）
 */
export async function getPublicMinigames(options?: { limit?: number; offset?: number }): Promise<MinigameRow[]> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) {
      console.error("D1 database binding 'DB' not found.");
      return [];
    }

    let query = `SELECT id, name, description, code, status, created_at
                 FROM Minigames WHERE status = 'completed'
                 ORDER BY created_at DESC`;

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options?.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }

    const { results } = (await DB.prepare(query).all()) as { results: MinigameRow[] };
    return results;
  } catch (e) {
    console.error('Failed to fetch minigames:', e);
    return [];
  }
}

/**
 * 获取小游戏总数（已完成状态）
 */
export async function getPublicMinigamesCount(): Promise<number> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) return 0;

    const result = await DB.prepare("SELECT COUNT(*) as count FROM Minigames WHERE status = 'completed'").first<{
      count: number;
    }>();
    return result?.count ?? 0;
  } catch (e) {
    console.error('Failed to get minigames count:', e);
    return 0;
  }
}

/**
 * 根据 ID 获取单个小游戏
 */
export async function getMinigameById(id: number): Promise<MinigameRow | null> {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) return null;

    const result = await DB.prepare(
      "SELECT id, name, description, code, status, created_at FROM Minigames WHERE id = ? AND status = 'completed'",
    )
      .bind(id)
      .first<MinigameRow>();

    return result ?? null;
  } catch (e) {
    console.error('Failed to get minigame by id:', e);
    return null;
  }
}
