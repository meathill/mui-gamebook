import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowLeftIcon, DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import JsonLd from '@/components/JsonLd';
import CopyButton from '@/components/skills/CopyButton';
import { UPGRADE_GAME_PROMPT, UPGRADE_GAME_STEPS } from '@/lib/skills/upgrade-game';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('skills');
  return {
    title: t('upgradePageTitle'),
    description: t('upgradePageDescription'),
    alternates: { canonical: '/skills/upgrade-game' },
  };
}

export default async function UpgradeGameSkillPage() {
  const t = await getTranslations('skills');
  const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Skills', item: `${baseUrl}/skills` },
      { '@type': 'ListItem', position: 3, name: t('upgradeCardTitle'), item: `${baseUrl}/skills/upgrade-game` },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={breadcrumbLd} />

      <section className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/skills"
            className="inline-flex items-center gap-1.5 text-sm text-stone-300 hover:text-white mb-6 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            {t('backToSkills')}
          </Link>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-6 tracking-tight">{t('upgradeHeroTitle')}</h1>
          <p className="text-lg text-stone-200 max-w-3xl leading-relaxed mb-4">{t('upgradeHeroSubtitle')}</p>
          <p className="text-sm text-amber-300 mb-8">{t('upgradeOrderNote')}</p>
          <div className="flex flex-wrap gap-4">
            <a
              href="/api/skills/upgrade-game/skill-md"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 transition-colors">
              <DownloadSimpleIcon className="w-4 h-4" />
              {t('downloadUpgradePack')}
            </a>
            <CopyButton
              text={UPGRADE_GAME_PROMPT}
              copyLabel={t('copyPrompt')}
              copiedLabel={t('copied')}
              variant="primary"
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {UPGRADE_GAME_STEPS.map((step, index) => (
            <div
              key={step.slug}
              className="bg-stone-50 rounded-2xl p-8 relative">
              <div className="absolute top-6 right-6 text-5xl font-black text-stone-200">{index + 1}</div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h2>
              <p className="text-gray-600 leading-relaxed mb-6">{step.goal}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-sm text-stone-500 font-bold mr-1">{t('toolsLabel')}：</span>
                {step.tools.map((tool) => (
                  <code
                    key={tool}
                    className="bg-white border border-stone-200 px-2 py-0.5 rounded text-xs text-stone-700">
                    {tool}
                  </code>
                ))}
              </div>

              <pre className="bg-white border border-stone-200 text-stone-800 text-sm leading-relaxed p-4 rounded-xl overflow-x-auto whitespace-pre-wrap mb-4 font-mono">
                {step.prompt}
              </pre>

              <p className="text-sm text-stone-600 mb-6">
                <span className="font-bold">{t('doneLabel')}：</span>
                {step.doneCriteria}
              </p>

              <div className="flex flex-wrap gap-3">
                <CopyButton
                  text={step.prompt}
                  copyLabel={t('copyPrompt')}
                  copiedLabel={t('copied')}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
