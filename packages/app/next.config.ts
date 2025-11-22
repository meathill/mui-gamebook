import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mui-gamebook/parser'],
  images: {
    remotePatterns: [
      {
        'protocol': 'https',
        'hostname': 'picsum.photos',
        'port': '',
      }
    ]
  }
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
