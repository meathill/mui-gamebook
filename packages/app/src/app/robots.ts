import { MetadataRoute } from 'next';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/sign-in', '/my/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
