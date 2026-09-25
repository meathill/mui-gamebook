import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowLeftIcon, DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import JsonLd from '@/components/JsonLd';
import CopyButton from '@/components/skills/CopyButton';
import SetupConfigTabs from '@/components/skills/SetupConfigTabs';
import {
  ANTIGRAVITY_CONFIG_PATHS,
  OPENCODE_CONFIG_PATHS,
  SETUP_PROMPT,
  buildAntigravityConfig,
  buildOpenCodeConfig,
} from '@/lib/skills/setup';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('skills');
  return {
    title: t('setupPageTitle'),
    description: t('setupPageDescription'),
    alternates: { canonical: '/skills/setup' },
  };
}

export default async function SetupSkillPage() {
  const t = await getTranslations('skills');
  const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Skills', item: `${baseUrl}/skills` },
      { '@type': 'ListItem', position: 3, name: t('setupCardTitle'), item: `${baseUrl}/skills/setup` },
    ],
  };

  const steps = [
    { key: '1', title: t('step1Title'), content: t('step1Content') },
    { key: '2', title: t('step2Title'), content: t('step2Content') },
    { key: '3', title: t('step3Title'), content: t('step3Content') },
    { key: '4', title: t('step4Title'), content: t('step4Content') },
  ];

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={breadcrumbLd} />

      <section className="bg-gradient-to-br from-stone-900 via-stone-800 to-orange-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/skills"
            className="inline-flex items-center gap-1.5 text-sm text-stone-300 hover:text-white mb-6 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            {t('backToSkills')}
          </Link>
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-6 tracking-tight">{t('setupHeroTitle')}</h1>
          <p className="text-lg text-stone-200 max-w-3xl leading-relaxed">{t('setupHeroSubtitle')}</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <CopyButton
              text={SETUP_PROMPT}
              copyLabel={t('copyPrompt')}
              copiedLabel={t('copied')}
              variant="primary"
            />
            <a
              href="/api/skills/setup/skill-md"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 transition-colors">
              <DownloadSimpleIcon className="w-4 h-4" />
              {t('downloadMd')}
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className="bg-stone-50 rounded-2xl p-8 relative">
              <div className="absolute top-6 right-6 text-5xl font-black text-stone-200">{index + 1}</div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h2>
              <p className="text-gray-600 leading-relaxed">{step.content}</p>
              {index === 0 && (
                <Link
                  href="/my/api-keys"
                  className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-700 transition-colors">
                  {t('apiKeysLink')}
                </Link>
              )}
              {index === 1 && (
                <div className="mt-6">
                  <SetupConfigTabs
                    clients={[
                      {
                        id: 'opencode',
                        label: 'OpenCode',
                        filePaths: OPENCODE_CONFIG_PATHS,
                        config: buildOpenCodeConfig(),
                        note: t('opencodeNote'),
                      },
                      {
                        id: 'antigravity',
                        label: 'Antigravity',
                        filePaths: ANTIGRAVITY_CONFIG_PATHS,
                        config: buildAntigravityConfig(),
                        note: t('antigravityNote'),
                      },
                    ]}
                    copyLabel={t('copyConfig')}
                    copiedLabel={t('copied')}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="bg-stone-900 text-white rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-3">{t('promptTitle')}</h2>
            <p className="text-stone-300 mb-6">{t('promptDesc')}</p>
            <pre className="bg-stone-800 text-stone-100 text-sm leading-relaxed p-4 rounded-xl overflow-x-auto whitespace-pre-wrap mb-6">
              {SETUP_PROMPT}
            </pre>
            <CopyButton
              text={SETUP_PROMPT}
              copyLabel={t('copyPrompt')}
              copiedLabel={t('copied')}
              variant="primary"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
