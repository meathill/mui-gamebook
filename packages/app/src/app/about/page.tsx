import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import {
  SparklesIcon,
  MessageCircleIcon,
  VariableIcon,
  Gamepad2Icon,
  LayersIcon,
  GlobeIcon,
  CodeIcon,
  DatabaseIcon,
  CloudIcon,
  ArrowRightIcon,
} from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function AboutPage() {
  const t = await getTranslations('about');

  const features = [
    { key: 'aiAssist', icon: SparklesIcon, color: 'from-yellow-400 to-orange-400' },
    { key: 'aiChatbot', icon: MessageCircleIcon, color: 'from-orange-500 to-amber-500' },
    { key: 'variables', icon: VariableIcon, color: 'from-amber-400 to-yellow-300' },
    { key: 'minigames', icon: Gamepad2Icon, color: 'from-red-500 to-orange-400' },
    { key: 'richInteractive', icon: LayersIcon, color: 'from-rose-500 to-pink-400' },
    { key: 'crossPlatform', icon: GlobeIcon, color: 'from-orange-600 to-red-500' },
  ];

  const toolchain = [
    { key: 'parser', icon: CodeIcon },
    { key: 'assetGenerator', icon: DatabaseIcon },
    { key: 'cloudflare', icon: CloudIcon },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 text-white py-20 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">{t('heroTitle')}</h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">{t('heroSubtitle')}</p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">{t('missionTitle')}</h2>
          <p className="text-lg text-gray-600 leading-relaxed text-center max-w-3xl mx-auto">{t('missionContent')}</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('featuresTitle')}</h2>
            <p className="text-lg text-gray-600">{t('featuresSubtitle')}</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ key, icon: Icon, color }) => (
              <div
                key={key}
                className="bg-stone-50 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t(`features.${key}.title`)}</h3>
                <p className="text-gray-600">{t(`features.${key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant Showcase */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('aiSectionTitle')}</h2>
              <p className="text-lg text-gray-600 mb-4">{t('aiSectionContent1')}</p>
              <p className="text-gray-600">{t('aiSectionContent2')}</p>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/about-ai.png"
                alt="AI Assistant"
                width={600}
                height={338}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Visual Editor Showcase */}
      <section className="py-16 px-4 bg-gradient-to-b from-orange-50 to-amber-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/about-editor.png"
                alt="Visual Editor"
                width={600}
                height={338}
                className="w-full"
              />
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('editorSectionTitle')}</h2>
              <p className="text-lg text-gray-600 mb-4">{t('editorSectionContent1')}</p>
              <p className="text-gray-600">{t('editorSectionContent2')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Toolchain */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('toolchainTitle')}</h2>
            <p className="text-lg text-gray-600">{t('toolchainSubtitle')}</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {toolchain.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="bg-stone-50 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t(`toolchain.${key}.title`)}</h3>
                <p className="text-gray-600">{t(`toolchain.${key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Platform */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('platformSectionTitle')}</h2>
              <p className="text-lg text-gray-600 mb-4">{t('platformSectionContent1')}</p>
              <p className="text-gray-600">{t('platformSectionContent2')}</p>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/about-platform.png"
                alt="Cross Platform"
                width={600}
                height={338}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">{t('ctaTitle')}</h2>
          <p className="text-gray-300 mb-8">{t('ctaContent')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/games"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all">
              {t('ctaPlay')}
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-all">
              {t('ctaCreate')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
