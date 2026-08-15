import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  ArrowRightIcon,
  BookOpenIcon,
  CursorClickIcon,
  GameControllerIcon,
  PencilSimpleIcon,
  SparkleIcon,
} from '@phosphor-icons/react/dist/ssr';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import JsonLd from '@/components/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('interactiveFiction');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    alternates: { canonical: '/interactive-fiction' },
    openGraph: {
      title: t('pageTitle'),
      description: t('pageDescription'),
      type: 'website',
      locale: 'zh_CN',
      url: '/interactive-fiction',
    },
  };
}

// 互动小说主题入口（issue #14）：承担「互动小说 / 互动小说网站」query
export default async function InteractiveFictionPage() {
  const t = await getTranslations('interactiveFiction');
  const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: '互动小说' },
    ],
  };
  const pageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: t('pageTitle'),
    description: t('pageDescription'),
    url: `${baseUrl}/interactive-fiction`,
    inLanguage: 'zh-CN',
    breadcrumb: breadcrumbLd,
  };

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={pageLd} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-orange-900 text-white py-20 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-6 tracking-tight">{t('heroTitle')}</h1>
          <p className="text-lg sm:text-xl text-stone-200 max-w-3xl mx-auto leading-relaxed">{t('heroSubtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              href="/games"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all">
              <GameControllerIcon className="w-5 h-5" />
              {t('ctaPlay')}
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
              <PencilSimpleIcon className="w-5 h-5" />
              {t('ctaCreate')}
            </Link>
          </div>
        </div>
      </section>

      {/* 什么是互动小说 */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
              <BookOpenIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{t('whatIsTitle')}</h2>
              <p className="text-lg text-gray-600 leading-relaxed">{t('whatIsContent')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 玩法 */}
      <section className="py-16 px-4 bg-stone-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center shrink-0">
              <CursorClickIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{t('howToPlayTitle')}</h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">{t('howToPlayContent')}</p>
              <Link
                href="/how-to-play"
                className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-medium transition-colors">
                {t('howToPlayLink')}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 推荐作品 */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{t('featuredTitle')}</h2>
            <p className="text-lg text-gray-600">{t('featuredSubtitle')}</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            {/* 驻马店驱魔人：Bing 有搜索信号的稳定作品 */}
            <Link
              href="/play/zhumadian-exorcist"
              className="group bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-orange-200 transition-all">
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">
                {t('game1Title')}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-5">{t('game1Desc')}</p>
              <span className="inline-flex items-center gap-1.5 text-orange-600 font-medium">
                {t('game1Play')}
                <ArrowRightIcon className="w-4 h-4" />
              </span>
            </Link>
            <Link
              href="/play/the-steam-punk-dream-of-the-red-chamber"
              className="group bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-orange-200 transition-all">
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">
                {t('game2Title')}
              </h3>
              <p className="text-gray-600 leading-relaxed mb-5">{t('game2Desc')}</p>
              <span className="inline-flex items-center gap-1.5 text-orange-600 font-medium">
                {t('game2Play')}
                <ArrowRightIcon className="w-4 h-4" />
              </span>
            </Link>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors">
              {t('allGames')}
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 创作与独立发布 */}
      <section className="py-16 px-4 bg-gradient-to-b from-orange-50 to-amber-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0">
              <SparkleIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{t('createTitle')}</h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-4">{t('createContent')}</p>
              <Link
                href="/create"
                className="inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-medium transition-colors">
                {t('createLink')}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">{t('ctaTitle')}</h2>
          <p className="text-gray-300 mb-8">{t('ctaSubtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/games"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all">
              {t('ctaPlay')}
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
              {t('ctaCreate')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
