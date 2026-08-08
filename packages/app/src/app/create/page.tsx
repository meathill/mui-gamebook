import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FileTextIcon,
  SparkleIcon,
  BracketsCurlyIcon,
  RocketLaunchIcon,
  HandHeartIcon,
  GameControllerIcon,
  CheckCircleIcon,
} from '@phosphor-icons/react/dist/ssr';
import JsonLd from '@/components/JsonLd';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('create');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    alternates: { canonical: '/create' },
  };
}

// 创作与发布说明页（issue #14）：承担「互动小说制作 / 可以独立发布的互动小说」query
export default async function CreatePage() {
  const t = await getTranslations('create');
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muistory.com';

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
    url: `${baseUrl}/create`,
    inLanguage: 'zh-CN',
    breadcrumb: breadcrumbLd,
  };

  const steps = [
    { key: 'step1', icon: FileTextIcon },
    { key: 'step2', icon: SparkleIcon },
    { key: 'step3', icon: BracketsCurlyIcon },
    { key: 'step4', icon: RocketLaunchIcon },
  ];
  const features = [
    { key: 'feature1', icon: HandHeartIcon },
    { key: 'feature2', icon: SparkleIcon },
    { key: 'feature3', icon: CheckCircleIcon },
  ];

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={pageLd} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-stone-900 via-stone-800 to-orange-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Link
            href="/interactive-fiction"
            className="inline-flex items-center gap-1.5 text-sm text-stone-300 hover:text-white mb-6 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            {t('backToHub')}
          </Link>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-6 tracking-tight">{t('heroTitle')}</h1>
          <p className="text-lg sm:text-xl text-stone-200 max-w-3xl mx-auto leading-relaxed">{t('heroSubtitle')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link
              href="/my/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all">
              {t('ctaCreate')}
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
              {t('ctaBrowse')}
            </Link>
          </div>
        </div>
      </section>

      {/* 制作流程 */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">{t('workflowTitle')}</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
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

      {/* 为什么值得做 */}
      <section className="py-16 px-4 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">{t('featureTitle')}</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="bg-white rounded-2xl p-8 border border-gray-200">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{t(`${key}Title`)}</h3>
                <p className="text-gray-600 leading-relaxed">{t(`${key}Content`)}</p>
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/my/dashboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all">
              {t('ctaCreate')}
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
              <GameControllerIcon className="w-5 h-5" />
              {t('ctaBrowse')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
