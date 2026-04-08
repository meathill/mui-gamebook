import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';
import { ReactNode } from 'react';
import { cn } from '@/lib';

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
    title: {
      template: '%s | 姆伊游戏书',
      default: '姆伊游戏书 - 互动小说创作平台',
    },
    description: '用 Markdown 写互动小说，AI 帮你润色，一键发布到多个平台。姆伊游戏书，每个人都能创作好故事。',
    openGraph: {
      title: '姆伊游戏书 - 互动小说创作平台',
      description: '用 Markdown 写互动小说，AI 帮你润色，一键发布到多个平台。姆伊游戏书，每个人都能创作好故事。',
      type: 'website',
      locale: 'zh_CN',
      siteName: '姆伊游戏书',
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
        <meta charSet="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <link
          rel="icon"
          href="/favicon.png"
          type="image/png"
        />
      </head>
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      <body className={cn('antialiased flex flex-col min-h-screen', interSans.variable, jetBrainsMono.variable)}>
        <NextIntlClientProvider messages={messages}>
          <Theme
            accentColor="violet"
            grayColor="slate"
            radius="medium"
            scaling="100%">
            <Providers>
              <Header siteName={process.env.NEXT_PUBLIC_SITE_NAME} />
              <main className="grow flex flex-col">{children}</main>
              <Footer />
            </Providers>
          </Theme>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
