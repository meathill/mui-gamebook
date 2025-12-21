import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const { env } = getCloudflareContext();
  const BASE_URL = env.NEXT_PUBLIC_SITE_URL!;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/sign-in', '/api/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
