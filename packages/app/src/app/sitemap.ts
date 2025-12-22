import { MetadataRoute } from 'next';
import { getPublishedGames } from '@/lib/games';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muistory.com';

  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // 动态游戏页面
  const games = await getPublishedGames();
  const gamePages: MetadataRoute.Sitemap = games.map((game) => ({
    url: `${baseUrl}/play/${game.slug}`,
    lastModified: new Date(game.updated_at!),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...gamePages];
}
