import { MetadataRoute } from 'next';
import { getPublishedGames, getAllTags } from '@/lib/games';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 移除末尾斜杠以避免 URL 双斜杠问题
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://muistory.com').replace(/\/$/, '');

  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/games`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/minigames`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
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
  const gamePages: MetadataRoute.Sitemap = games.map((game) => {
    // updated_at 可能是秒级时间戳，需要转换为毫秒级
    const timestamp = Number(game.updated_at);
    const lastModified =
      timestamp < 1e12
        ? new Date(timestamp * 1000) // 秒级时间戳
        : new Date(timestamp); // 已经是毫秒级
    return {
      url: `${baseUrl}/play/${game.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  // 标签页面
  const tags = await getAllTags();
  const tagPages: MetadataRoute.Sitemap = tags.map((tagInfo) => ({
    url: `${baseUrl}/tags/${encodeURIComponent(tagInfo.tag)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...gamePages, ...tagPages];
}
