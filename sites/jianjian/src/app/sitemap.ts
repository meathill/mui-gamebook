import type { MetadataRoute } from 'next';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import { getGames } from '../lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE_URL = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/tos`,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // 动态获取已发布剧本列表
  const games = await getGames();
  const gamePages: MetadataRoute.Sitemap = games.map((game) => ({
    url: `${BASE_URL}/play/${game.slug}`,
    lastModified: new Date(game.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...gamePages];
}
