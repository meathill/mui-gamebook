'use client';

import Link from 'next/link';
import { useTranslations, useLocale as useCurrentLocale } from 'next-intl';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Globe, Check } from 'lucide-react';
import { useLocale } from '@/i18n/client';
import type { Locale } from '@/i18n/config';

const languages: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

export default function Footer() {
  const t = useTranslations('footer');
  const currentLocale = useCurrentLocale() as Locale;
  const { setLocale } = useLocale();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="text-sm text-gray-500">{t('copyright', { year: new Date().getFullYear() })}</div>
          <div className="text-xs text-gray-400 mt-2 md:mt-0">v{process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}</div>

          {/* 语言切换 Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-1.5 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                <Globe size={14} />
                <span>{languages.find((l) => l.code === currentLocale)?.label || '🌐'}</span>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-[120px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                sideOffset={5}
                align="center">
                {languages.map((lang) => (
                  <DropdownMenu.Item
                    key={lang.code}
                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer outline-none"
                    onSelect={() => setLocale(lang.code)}>
                    {lang.label}
                    {currentLocale === lang.code && (
                      <Check
                        size={14}
                        className="text-blue-600"
                      />
                    )}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <div className="flex items-center gap-4 sm:ms-auto">
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
