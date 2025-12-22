import { Game } from '@mui-gamebook/parser';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { env } = getCloudflareContext();
  const BASE_URL = env.NEXT_PUBLIC_SITE_URL!;
  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/tos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // 动态获取游戏列表（从 API）
  // 这里简化处理，可以根据需要从数据库获取
  const games = (await fetch(`${BASE_URL}/api/games`).then((res) => res.json())) as Game[];
  const gamePages = games.map((game) => ({
    url: `${BASE_URL}/play/${game.slug}`,
    lastModified: new Date(game.updated_at!),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages];
}
