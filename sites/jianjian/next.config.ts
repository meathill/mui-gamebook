import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mui-gamebook/core', '@mui-gamebook/parser'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.xiaoniaoshuo.com',
        port: '',
      },
    ],
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
