import { parse } from '@mui-gamebook/parser';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { GameRow } from '@/types';
import { cache } from 'react';

export async function getPublishedGames() {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB; // Assume binding name is DB

    if (!DB) {
      console.error('D1 database binding \'DB\' not found.');
      return [];
    }

    const { results } = (await DB.prepare(
      'SELECT slug, title, description, cover_image, tags FROM Games WHERE published = 1'
    ).all() as { results: GameRow[] });

    return results.map((row: GameRow) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));
  } catch (e) {
    console.error('Failed to fetch from D1:', e);
    return [];
  }
}

export async function getGameBySlug(slug: string) {
  try {
    const { env } = getCloudflareContext();
    const DB = env.DB;

    if (!DB) {
      console.error('D1 database binding \'DB\' not found.');
      return null;
    }

    // Fetch content
    const contentRecord = await DB.prepare(
      `SELECT content 
FROM GameContent c JOIN Games g ON c.game_id = g.id
WHERE g.slug = ?`
    ).bind(slug).first();

    if (contentRecord) {
      const result = parse(contentRecord.content as string);
      if (result.success) {
        // Double check published status from the parsed content (or we could trust the DB query if we joined tables)
        // For consistency with previous logic, let's check the parsed metadata
        if (result.data.published) {
          return result.data;
        }
      }
    }
    return null;
  } catch (e) {
    console.error('Failed to fetch game from D1:', e);
    return null;
  }
}

export const cachedGetGameBySlug = cache(getGameBySlug);
