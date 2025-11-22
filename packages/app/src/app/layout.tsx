import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | 姆伊游戏书",
    default: "姆伊游戏书 - AI 驱动的互动小说平台",
  },
  description: "探索由 AI 驱动的无限可能。在姆伊游戏书，体验身临其境的互动故事，或创作属于你自己的冒险。",
  openGraph: {
    title: "姆伊游戏书 - AI 驱动的互动小说平台",
    description: "探索由 AI 驱动的无限可能。在姆伊游戏书，体验身临其境的互动故事，或创作属于你自己的冒险。",
    type: "website",
    locale: "zh_CN",
    siteName: "姆伊游戏书",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
