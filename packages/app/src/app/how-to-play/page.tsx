import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CursorClickIcon,
  FlagCheckeredIcon,
  InfinityIcon,
  PuzzlePieceIcon,
  ArrowClockwiseIcon,
  GameControllerIcon,
} from '@phosphor-icons/react/dist/ssr';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import JsonLd from '@/components/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('howToPlay');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    alternates: { canonical: '/how-to-play' },
  };
}

// 玩法说明页（issue #14）：承担「网页互动小说」query
export default async function HowToPlayPage() {
  const t = await getTranslations('howToPlay');
  const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: '互动小说', item: `${baseUrl}/interactive-fiction` },
      { '@type': 'ListItem', position: 3, name: t('heroTitle') },
    ],
  };
  const pageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: t('pageTitle'),
    description: t('pageDescription'),
    url: `${baseUrl}/how-to-play`,
    inLanguage: 'zh-CN',
    breadcrumb: breadcrumbLd,
  };

  const steps = [
    { key: 'step1', icon: BookOpenIcon },
    { key: 'step2', icon: CursorClickIcon },
    { key: 'step3', icon: FlagCheckeredIcon },
  ];
  const mechanics = [
    { titleKey: 'mechanicBranchTitle', contentKey: 'mechanicBranchContent', icon: PuzzlePieceIcon },
    { titleKey: 'mechanicVariableTitle', contentKey: 'mechanicVariableContent', icon: InfinityIcon },
    { titleKey: 'mechanicRestartTitle', contentKey: 'mechanicRestartContent', icon: ArrowClockwiseIcon },
  ];

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={pageLd} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Link
            href="/interactive-fiction"
            className="inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white mb-6 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            {t('backToHub')}
          </Link>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-6 tracking-tight">{t('heroTitle')}</h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">{t('heroSubtitle')}</p>
        </div>
      </section>

      {/* 三步玩法 */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">{t('stepTitle')}</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map(({ key, icon: Icon }, index) => (
              <div
                key={key}
                className="bg-stone-50 rounded-2xl p-8 relative">
                <div className="absolute top-6 right-6 text-5xl font-black text-stone-200">{index + 1}</div>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{t(`${key}Title`)}</h3>
                <p className="text-gray-600 leading-relaxed">{t(`${key}Content`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 玩法机制 */}
      <section className="py-16 px-4 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">{t('mechanicTitle')}</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {mechanics.map(({ titleKey, contentKey, icon: Icon }) => (
              <div
                key={titleKey}
                className="bg-white rounded-2xl p-8 border border-gray-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{t(titleKey)}</h3>
                <p className="text-gray-600 leading-relaxed">{t(contentKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">{t('ctaTitle')}</h2>
          <p className="text-gray-300 mb-8">{t('ctaSubtitle')}</p>
          <Link
            href="/games"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all">
            <GameControllerIcon className="w-5 h-5" />
            {t('ctaPlay')}
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
