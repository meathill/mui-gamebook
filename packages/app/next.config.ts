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
        'hostname': 'pub-27a92d3774f9427887d368783622ce37.r2.dev',
        'port': '',
      }
    ]
  }
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
