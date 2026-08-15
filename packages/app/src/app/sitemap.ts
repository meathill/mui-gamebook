import { MetadataRoute } from 'next';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import { getPublishedGames, getAllTags } from '@/lib/games';
import { getPublishedPosts } from '@/lib/blog';
import { getPublicMinigames } from '@/lib/minigames';
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from '@/lib/public-cache';

export const revalidate = PUBLIC_PAGE_REVALIDATE_SECONDS;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/games`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/interactive-fiction`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/how-to-play`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/create`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/minigames`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const games = await getPublishedGames();
  const gamePages: MetadataRoute.Sitemap = games.map((game) => {
    const timestamp = Number(game.updated_at);
    const lastModified =
      timestamp < 1e12
        ? new Date(timestamp * 1000) // 秒级时间戳
        : new Date(timestamp);
    return {
      url: `${baseUrl}/play/${game.slug}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  const minigames = await getPublicMinigames();
  const minigamePages: MetadataRoute.Sitemap = minigames.map((minigame) => {
    const timestamp = Number(minigame.created_at);
    const lastModified =
      timestamp < 1e12
        ? new Date(timestamp * 1000) // 秒级时间戳
        : new Date(timestamp);
    return {
      url: `${baseUrl}/minigames/${minigame.id}`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    };
  });

  const tags = await getAllTags();
  const tagPages: MetadataRoute.Sitemap = tags.map((tagInfo) => ({
    url: `${baseUrl}/tags/${encodeURIComponent(tagInfo.tag)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const { docs: posts } = await getPublishedPosts({ limit: 100 });
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...gamePages, ...minigamePages, ...tagPages, ...blogPages];
}
