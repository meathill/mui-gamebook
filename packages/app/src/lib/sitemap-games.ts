import { parse } from '@roudanio/parser';
import type { GameRow } from '@/types';
import { fetchLiveGameBySlug, fetchLiveGamesSnapshot } from './games-live-fallback';
import { withD1Fallback } from './games-shared';

type SitemapGame = Pick<GameRow, 'slug' | 'updated_at'>;

async function fetchLiveSitemapGames(): Promise<SitemapGame[]> {
  const games = await fetchLiveGamesSnapshot();
  // 公开列表不含 subdomain；构建期必须读取详情，不能把未知绑定当成主站作品。
  const candidates = await Promise.all(
    games.map(async ({ slug, updated_at }) => {
      const game = await fetchLiveGameBySlug(slug);
      return game && !game.subdomain ? { slug, updated_at } : null;
    }),
  );
  return candidates.filter((game): game is SitemapGame => game !== null);
}

export async function getSitemapGames(): Promise<SitemapGame[]> {
  return withD1Fallback('Failed to fetch sitemap games', fetchLiveSitemapGames, async (database) => {
    // 绑定来自 DSL，复用播放页的解析器；一次查询正文，避免逐作品查询 D1。
    const { results } = (await database
      .prepare(
        `SELECT g.slug, g.updated_at, c.content FROM Games g
         INNER JOIN GameContent c ON c.game_id = g.id
         WHERE g.published = 1 AND g.shadow_banned = 0
           AND c.content IS NOT NULL AND TRIM(c.content) != ''
         ORDER BY g.updated_at DESC`,
      )
      .all()) as { results: (SitemapGame & { content: string })[] };

    return results.flatMap(({ slug, updated_at, content }) => {
      const result = parse(content);
      return result.success && !result.data.subdomain ? [{ slug, updated_at }] : [];
    });
  });
}
