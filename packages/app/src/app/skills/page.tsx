import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  ArrowRightIcon,
  DownloadSimpleIcon,
  PlugsConnectedIcon,
  GameControllerIcon,
} from '@phosphor-icons/react/dist/ssr';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import JsonLd from '@/components/JsonLd';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('skills');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    alternates: { canonical: '/skills' },
  };
}

export default async function SkillsPage() {
  const t = await getTranslations('skills');
  const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Skills', item: `${baseUrl}/skills` },
    ],
  };

  const cards = [
    {
      href: '/skills/setup',
      download: '/api/skills/setup/skill-md',
      icon: PlugsConnectedIcon,
      title: t('setupCardTitle'),
      desc: t('setupCardDesc'),
      meta: t('setupCardMeta'),
    },
    {
      href: '/skills/create-game',
      download: '/api/skills/create-game/skill-md',
      icon: GameControllerIcon,
      title: t('createCardTitle'),
      desc: t('createCardDesc'),
      meta: t('createCardMeta'),
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={breadcrumbLd} />

      <section className="bg-gradient-to-br from-stone-900 via-stone-800 to-orange-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-6 tracking-tight">{t('heroTitle')}</h1>
          <p className="text-lg sm:text-xl text-stone-200 max-w-3xl mx-auto leading-relaxed">{t('heroSubtitle')}</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-2">
          {cards.map(({ href, download, icon: Icon, title, desc, meta }) => (
            <div
              key={href}
              className="bg-stone-50 rounded-2xl p-8 border border-stone-100 hover:shadow-lg transition-shadow flex flex-col">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-6">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
              <p className="text-gray-600 leading-relaxed mb-2">{desc}</p>
              <p className="text-sm text-stone-400 mb-6">{meta}</p>
              <div className="flex flex-wrap gap-3 mt-auto">
                <Link
                  href={href}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-700 transition-colors">
                  {t('openSkill')}
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <a
                  href={download}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 text-stone-900 rounded-xl font-bold hover:bg-stone-100 transition-colors">
                  <DownloadSimpleIcon className="w-4 h-4" />
                  {t('downloadMd')}
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-6xl mx-auto mt-8">
          <div className="rounded-2xl p-8 border border-dashed border-stone-300 text-center">
            <h2 className="text-xl font-bold text-stone-700 mb-2">{t('comingTitle')}</h2>
            <p className="text-stone-500">{t('comingDesc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
