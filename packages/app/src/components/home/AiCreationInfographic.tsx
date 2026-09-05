import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  ChatCenteredDotsIcon,
  ImageIcon,
  VideoCameraIcon,
  MusicNotesIcon,
  MicrophoneIcon,
  FingerprintIcon,
  SparkleIcon,
  LightningIcon,
  FileCodeIcon,
  ShareNetworkIcon,
  CpuIcon,
  GiftIcon,
  ArrowRightIcon,
} from '@phosphor-icons/react/dist/ssr';

export default async function AiCreationInfographic() {
  const t = await getTranslations('home');

  const capabilities = [
    {
      key: 'chatbot',
      Icon: ChatCenteredDotsIcon,
      color: 'from-amber-500 to-orange-500',
      badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      accent: 'text-orange-400',
    },
    {
      key: 'image',
      Icon: ImageIcon,
      color: 'from-blue-500 to-cyan-500',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      accent: 'text-blue-400',
    },
    {
      key: 'video',
      Icon: VideoCameraIcon,
      color: 'from-purple-500 to-pink-500',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      accent: 'text-purple-400',
    },
    {
      key: 'music',
      Icon: MusicNotesIcon,
      color: 'from-emerald-500 to-teal-500',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      accent: 'text-emerald-400',
    },
    {
      key: 'tts',
      Icon: MicrophoneIcon,
      color: 'from-rose-500 to-red-500',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      accent: 'text-rose-400',
    },
    {
      key: 'voiceClone',
      Icon: FingerprintIcon,
      color: 'from-indigo-500 to-violet-500',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      accent: 'text-indigo-400',
    },
  ];

  return (
    <section className="py-20 bg-stone-900 text-white relative overflow-hidden">
      {/* Background Decorative Blur Orbs */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <SparkleIcon
              weight="fill"
              className="w-4 h-4"
            />
            {t('aiStudio.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            {t('aiStudio.title')}
          </h2>
          <p className="text-stone-300 text-base sm:text-lg leading-relaxed">{t('aiStudio.subtitle')}</p>
        </div>

        {/* 6 Grid Capabilities Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16">
          {capabilities.map(({ key, Icon, color, badgeBg, accent }) => (
            <div
              key={key}
              className="group relative bg-stone-800/80 backdrop-blur border border-stone-700/70 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-stone-500 hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                    <Icon
                      weight="duotone"
                      className="w-6 h-6"
                    />
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${badgeBg}`}>
                    {t(`aiStudio.${key}.tag`)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                  {t(`aiStudio.${key}.title`)}
                </h3>
                <p className="text-sm text-stone-300 leading-relaxed">{t(`aiStudio.${key}.desc`)}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-700/50 flex items-center gap-1.5 text-xs text-stone-400">
                <LightningIcon
                  weight="fill"
                  className={`w-3.5 h-3.5 ${accent}`}
                />
                <span>开箱即用 · 极速响应</span>
              </div>
            </div>
          ))}
        </div>

        {/* Infographic: Streamlined Multimodal Pipeline */}
        <div className="bg-stone-800/90 border border-stone-700 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                <CpuIcon
                  weight="fill"
                  className="w-5 h-5"
                />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">{t('aiStudio.pipeline.title')}</h3>
            </div>
            <span className="text-xs text-stone-400 font-mono">End-to-End Multimodal Gamebook Engine</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div className="bg-stone-900/90 border border-stone-700/60 rounded-xl p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-orange-400 font-bold">STEP 01</span>
                <FileCodeIcon
                  weight="duotone"
                  className="w-5 h-5 text-orange-400"
                />
              </div>
              <h4 className="text-base font-bold text-white mb-1">{t('aiStudio.pipeline.step1Title')}</h4>
              <p className="text-xs text-stone-400 leading-relaxed">{t('aiStudio.pipeline.step1Desc')}</p>
            </div>

            {/* Step 2 */}
            <div className="bg-stone-900/90 border border-stone-700/60 rounded-xl p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-amber-400 font-bold">STEP 02</span>
                <ChatCenteredDotsIcon
                  weight="duotone"
                  className="w-5 h-5 text-amber-400"
                />
              </div>
              <h4 className="text-base font-bold text-white mb-1">{t('aiStudio.pipeline.step2Title')}</h4>
              <p className="text-xs text-stone-400 leading-relaxed">{t('aiStudio.pipeline.step2Desc')}</p>
            </div>

            {/* Step 3 */}
            <div className="bg-stone-900/90 border border-stone-700/60 rounded-xl p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-purple-400 font-bold">STEP 03</span>
                <SparkleIcon
                  weight="duotone"
                  className="w-5 h-5 text-purple-400"
                />
              </div>
              <h4 className="text-base font-bold text-white mb-1">{t('aiStudio.pipeline.step3Title')}</h4>
              <p className="text-xs text-stone-400 leading-relaxed">{t('aiStudio.pipeline.step3Desc')}</p>
            </div>

            {/* Step 4 */}
            <div className="bg-stone-900/90 border border-stone-700/60 rounded-xl p-5 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-emerald-400 font-bold">STEP 04</span>
                <ShareNetworkIcon
                  weight="duotone"
                  className="w-5 h-5 text-emerald-400"
                />
              </div>
              <h4 className="text-base font-bold text-white mb-1">{t('aiStudio.pipeline.step4Title')}</h4>
              <p className="text-xs text-stone-400 leading-relaxed">{t('aiStudio.pipeline.step4Desc')}</p>
            </div>
          </div>
        </div>

        {/* Limited Time Free Promotional Banner & CTA */}
        <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-purple-500/20 border border-orange-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl backdrop-blur">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30">
              <GiftIcon
                weight="duotone"
                className="w-7 h-7"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/30">
                  限时福利
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white">AI 辅助创作套件全面限时免费开放</h4>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 max-w-2xl">{t('aiStudio.freeBanner')}</p>
            </div>
          </div>
          <Link
            href="/my/dashboard"
            prefetch={false}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-orange-500/30 transition-all shrink-0 hover:-translate-y-0.5">
            <span>{t('aiStudio.freeCta')}</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
