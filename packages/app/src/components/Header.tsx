'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth-client';
import UserDropdown from '@/components/admin/UserDropdown';

export default function Header() {
  const { data: session } = authClient.useSession();
  const t = useTranslations('header');

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-900 tracking-tight">{t('title')}</span>
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
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <UserDropdown email={session?.user.email || ''} />
            ) : (
              <Link
                href="/sign-in"
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 px-4 py-2 rounded-md text-sm font-medium transition-all shadow-sm hover:shadow-md">
                {t('signIn')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
