import type { NextConfig } from 'next';
import pkg from './package.json';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERSION: pkg.version,
  },
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
