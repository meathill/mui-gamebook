'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="text-sm text-gray-500">{t('copyright', { year: new Date().getFullYear() })}</div>
          <div className="text-xs text-gray-400 mt-2 md:mt-0">v{process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}</div>
          <div className="flex items-center gap-4 ms-auto">
            <Link
              href="/privacy"
              className="text-gray-500 hover:text-gray-700 text-sm">
              {t('privacy')}
            </Link>
            <Link
              href="/terms"
              className="text-gray-500 hover:text-gray-700 text-sm">
              {t('terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
