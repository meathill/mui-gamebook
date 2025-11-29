import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';
import { ReactNode } from 'react';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        <Providers>
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
