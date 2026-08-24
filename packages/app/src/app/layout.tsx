import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';
import LocaleProvider from '@/i18n/locale-provider';
import type { Locale } from '@/i18n/config';
import { ReactNode } from 'react';
import { cn } from '@/lib';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';

const interSans = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
const jetBrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)),
    title: {
      template: '%s | 姆伊游戏书',
      default: '姆伊游戏书 — 在线互动小说 · 文字冒险创作 · Markdown 游戏书平台',
    },
    description:
      '用 Markdown 写互动小说，顶尖 AI 灵感副驾随时协助，一键生成配图、视频、音乐与配音。姆伊游戏书是免费的在线互动小说制作与文字冒险创作工具，每个人都能轻松创作好故事。',
    openGraph: {
      title: '姆伊游戏书 — 在线互动小说 · 文字冒险创作 · Markdown 游戏书平台',
      description:
        '用 Markdown 写互动小说，顶尖 AI 灵感副驾随时协助，一键生成配图、视频、音乐与配音。姆伊游戏书是免费的在线互动小说制作与文字冒险创作工具，每个人都能轻松创作好故事。',
      type: 'website',
      locale: 'zh_CN',
      siteName: '姆伊游戏书',
      url: '/',
      images: [{ url: '/hero-bg.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: '姆伊游戏书 — 在线互动小说 · 文字冒险创作 · Markdown 游戏书平台',
      description:
        '用 Markdown 写互动小说，顶尖 AI 灵感副驾随时协助，一键生成配图、视频、音乐与配音。姆伊游戏书是免费的在线互动小说制作与文字冒险创作工具，每个人都能轻松创作好故事。',
      images: ['/hero-bg.png'],
    },
    robots: process.env.NEXT_PUBLIC_HEADLESS_MODE ? { index: false, follow: false } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* charSet/viewport 由 Next.js Metadata API 自动注入，这里手写会导致重复 meta 标签 */}
        <link
          rel="icon"
          href="/favicon.png"
          type="image/png"
        />
      </head>
      {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      <body className={cn('antialiased flex flex-col min-h-screen', interSans.variable, jetBrainsMono.variable)}>
        <LocaleProvider
          initialLocale={locale as Locale}
          initialMessages={messages}>
          <Providers>
            <Header siteName={process.env.NEXT_PUBLIC_SITE_NAME} />
            <main className="grow flex flex-col">{children}</main>
            <Footer />
          </Providers>
        </LocaleProvider>
      </body>
    </html>
  );
}
