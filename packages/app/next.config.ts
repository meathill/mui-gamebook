import type { NextConfig } from 'next';
import packageJson from './package.json';

const nextConfig: NextConfig = {
  transpilePackages: ['@mui-gamebook/parser'],
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  images: {
    remotePatterns: [
      {
        'protocol': 'https',
        'hostname': 'picsum.photos',
        'port': '',
      },
      {
        'protocol': 'https',
        'hostname': 'i.muistory.com',
        'port': '',
      }
    ]
  }
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
