'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth-client';
import UserDropdown from '@/components/admin/UserDropdown';

function isRootUserClient(email: string | undefined): boolean {
  if (!email) return false;
  const rootEmails = process.env.NEXT_PUBLIC_ROOT_USER_EMAIL?.split(',').map((e) => e.trim().toLowerCase()) || [];
  return rootEmails.includes(email.toLowerCase());
}

interface HeaderProps {
  /** headless 模式下的站点名称 */
  siteName?: string;
}

export default function Header({ siteName }: HeaderProps) {
  const { data: session } = authClient.useSession();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('header');

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-900 tracking-tight">{siteName || t('title')}</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-6">
              <Link
                href="/games"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                {t('games')}
              </Link>
              <Link
                href="/minigames"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                {t('minigames')}
              </Link>
              <Link
                href="/blog"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                {t('blog')}
              </Link>
              <Link
                href="/about"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                {t('about')}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {!mounted ? (
              <div className="w-20 h-9" />
            ) : session ? (
              <UserDropdown
                email={session?.user.email || ''}
                isAdmin={isRootUserClient(session?.user.email)}
              />
            ) : (
              <Link
                href="/sign-in"
                className="bg-orange-500 text-white hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                {t('signIn')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
