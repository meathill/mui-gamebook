import type { NextConfig } from 'next';
import createMDX from '@next/mdx';
import createNextIntlPlugin from 'next-intl/plugin';
import packageJson from './package.json';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/admin/dashboard', destination: '/my/dashboard', permanent: true },
      { source: '/admin/edit/:id', destination: '/my/edit/:id', permanent: true },
    ];
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  transpilePackages: ['@mui-gamebook/parser'],
  experimental: {
    // phosphor 客户端 barrel 不在 Next 默认优化清单，按需改写 import 减小客户端模块图
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  images: {
    loader: 'custom',
    loaderFile: './image-loader.ts',
    // 上限 1920：漏写 sizes 时最大也只到 1920，不会再出现 width=3840（Ahrefs 超大图治理）
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [128, 256, 384, 512, 640],
    remotePatterns: [
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
