import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import createNextIntlPlugin from 'next-intl/plugin';
import packageJson from './package.json';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/admin/dashboard', destination: '/my/dashboard', permanent: true },
      { source: '/admin/games', destination: '/my/games', permanent: true },
      { source: '/admin/edit/:id', destination: '/my/edit/:id', permanent: true },
    ];
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  transpilePackages: ['@mui-gamebook/parser'],
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'i.muistory.com',
        port: '',
      },
    ],
  },
  reactStrictMode: false,
};

const withMDX = createMDX({});
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(withMDX(nextConfig));

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
