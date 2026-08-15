import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default function MyEditLayout({ children }: { children: ReactNode }) {
  return children;
}
