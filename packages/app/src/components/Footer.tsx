'use client';

import Link from 'next/link';
import { useTranslations, useLocale as useCurrentLocale } from 'next-intl';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { GlobeIcon, CheckIcon, CaretUpIcon } from '@phosphor-icons/react';
import { useLocale } from '@/i18n/client';
import type { Locale } from '@/i18n/config';

const languages: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

/** 页脚为低意向链接：关闭预取，避免 _rsc 预取放大 Worker 请求（#20） */
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="text-gray-500 hover:text-gray-900 text-sm transition-colors">
      {children}
    </Link>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

export default function Footer() {
  const t = useTranslations('footer');
  const currentLocale = useCurrentLocale() as Locale;
  const { setLocale } = useLocale();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* 品牌列 */}
          <div className="col-span-2">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 tracking-tight">
              {currentLocale === 'zh' ? '姆伊游戏书' : 'MuiStory'}
            </Link>
            <p className="mt-3 text-sm text-gray-500 max-w-xs">{t('tagline')}</p>
          </div>

          <FooterColumn title={t('groups.read')}>
            <li>
              <FooterLink href="/interactive-fiction">{t('interactiveFiction')}</FooterLink>
            </li>
            <li>
              <FooterLink href="/how-to-play">{t('howToPlay')}</FooterLink>
            </li>
          </FooterColumn>

          <FooterColumn title={t('groups.create')}>
            <li>
              <FooterLink href="/create">{t('create')}</FooterLink>
            </li>
            <li>
              <FooterLink href="/skills">{t('skills')}</FooterLink>
            </li>
            <li>
              <FooterLink href="/open">{t('open')}</FooterLink>
            </li>
          </FooterColumn>

          <FooterColumn title={t('groups.support')}>
            <li>
              <FooterLink href="/contact">{t('contact')}</FooterLink>
            </li>
            <li>
              <FooterLink href="/privacy">{t('privacy')}</FooterLink>
            </li>
            <li>
              <FooterLink href="/terms">{t('terms')}</FooterLink>
            </li>
          </FooterColumn>
        </div>

        {/* 底部栏：版权 + 版本 + 外链 + 语言 */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3 items-center">
          <div className="text-sm text-gray-500">{t('copyright', { year: new Date().getFullYear() })}</div>
          <div className="text-xs text-gray-400">v{process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}</div>
          <div className="flex items-center gap-4 sm:ms-auto">
            <a
              href="https://firstlook.tools"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-900 text-sm transition-colors whitespace-nowrap">
              Featured on First Look
            </a>

            {/* 语言切换 Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  <GlobeIcon size={14} />
                  <span>{languages.find((l) => l.code === currentLocale)?.label || '🌐'}</span>
                  <CaretUpIcon size={14} />
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
                        <CheckIcon
                          size={14}
                          className="text-blue-600"
                        />
                      )}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>
    </footer>
  );
}
