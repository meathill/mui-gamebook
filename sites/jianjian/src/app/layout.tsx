import type { Metadata, Viewport } from 'next';
import { Noto_Sans_SC } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { ReactNode } from 'react';

// 使用思源黑体 - 更适合中文阅读
const notoSansSC = Noto_Sans_SC({
  variable: '--font-noto-sans-sc',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | 简简',
    default: '简简 - 小朋友的故事乐园',
  },
  description: '简简是专为小朋友设计的互动故事平台，在这里可以体验各种有趣的故事冒险！',
  openGraph: {
    title: '简简 - 小朋友的故事乐园',
    description: '简简是专为小朋友设计的互动故事平台，在这里可以体验各种有趣的故事冒险！',
    type: 'website',
    locale: 'zh_CN',
    siteName: '简简',
  },
  // 适合儿童的内容评级
  other: {
    rating: 'general',
  },
};

// 移动端优化视口设置
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 防止儿童误操作缩放
  viewportFit: 'cover', // 支持 iPhone X 等刘海屏
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh">
      <head>
        <meta charSet="UTF-8" />
        {/* 防止暗色模式影响童趣设计 */}
        <meta
          name="color-scheme"
          content="light"
        />
        {/* PWA 支持 - 让家长可以添加到主屏幕 */}
        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <meta
          name="apple-mobile-web-app-title"
          content="简简"
        />
        <meta
          name="theme-color"
          content="#FFF9F0"
        />
      </head>
      <body className={`${notoSansSC.variable} antialiased flex flex-col min-h-screen bg-background text-foreground`}>
        <Header />
        <main className="grow flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
