import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';
import { ReactNode } from 'react';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cn } from '@/lib';

const interSans = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
const jetBrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | 姆伊游戏书',
    default: '姆伊游戏书 - AI 驱动的互动小说平台',
  },
  description: '探索由 AI 驱动的无限可能。在姆伊游戏书，体验身临其境的互动故事，或创作属于你自己的冒险。',
  openGraph: {
    title: '姆伊游戏书 - AI 驱动的互动小说平台',
    description: '探索由 AI 驱动的无限可能。在姆伊游戏书，体验身临其境的互动故事，或创作属于你自己的冒险。',
    type: 'website',
    locale: 'zh_CN',
    siteName: '姆伊游戏书',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { env } = await getCloudflareContext({ async: true });
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_ID} />
      <body className={cn('antialiased flex flex-col min-h-screen', interSans.variable, jetBrainsMono.variable)}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Header />
            <main className="flex-grow flex flex-col">
              {children}
            </main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
