import type { ReactNode } from 'react';

export const metadata = {
  title: 'MuiStory CMS',
  description: 'Content management for MuiStory blog',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
