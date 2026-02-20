import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon, CheckIcon, GithubIcon, BotIcon } from 'lucide-react';

export default async function OpenPage() {
  const t = await getTranslations('open');

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-stone-50 to-white">
        <h1 className="text-4xl md:text-6xl font-black text-stone-900 mb-6 tracking-tight">{t('hero.title')}</h1>
        <p className="text-xl text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed">{t('hero.subtitle')}</p>
        <div className="flex justify-center gap-4">
          <a
            href="https://github.com/meathill/mui-gamebook"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-full font-bold hover:bg-stone-800 transition-colors">
            <GithubIcon className="w-5 h-5" />
            {t('hero.cta')}
          </a>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">{t('advantages.title')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {['control', 'customize', 'community', 'cost'].map((key) => (
              <div
                key={key}
                className="p-6 bg-stone-50 rounded-2xl border border-stone-100 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm text-stone-900">
                  <CheckIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{t(`advantages.items.${key}.title`)}</h3>
                <p className="text-stone-600 leading-relaxed text-sm">{t(`advantages.items.${key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Cases */}
      <section className="py-20 px-4 bg-stone-50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">{t('successCases.title')}</h2>
          <p className="text-stone-600 mb-12 max-w-2xl mx-auto">{t('successCases.description')}</p>
          <div className="grid md:grid-cols-1 gap-8 max-w-2xl mx-auto">
            <a
              href="https://xiaoniaoshuo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2 group-hover:text-amber-600 transition-colors">
                  {t('successCases.items.xiaoniao.title')}
                </h3>
                <p className="text-stone-600">{t('successCases.items.xiaoniao.description')}</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Deployment & Support */}
      <section className="py-20 px-4 bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start">
          <div>
            <h2 className="text-3xl font-bold mb-6">{t('deployment.title')}</h2>
            <p className="text-stone-300 text-lg mb-8 leading-relaxed">{t('deployment.description')}</p>
            <div className="space-y-4 mb-8">
              {['1', '2', '3'].map((step) => (
                <div
                  key={step}
                  className="flex items-center gap-4 text-stone-300">
                  <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {step}
                  </div>
                  <span>{t(`deployment.steps.${step}`)}</span>
                </div>
              ))}
            </div>
            <a
              href="https://github.com/meathill/mui-gamebook/blob/main/DEPLOYMENT.md"
              target="_blank"
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold border-b-2 border-amber-400 pb-1">
              {t('deployment.cta')}
              <ArrowRightIcon className="w-4 h-4" />
            </a>
          </div>
          <div>
            <div className="bg-stone-800 p-8 rounded-3xl border border-stone-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                  <BotIcon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">{t('support.title')}</h3>
              </div>
              <p className="text-stone-300 mb-8 leading-relaxed">{t('support.content')}</p>
              <a
                href="mailto:meathill@gmail.com"
                className="w-full py-3 bg-white text-stone-900 rounded-xl font-bold hover:bg-stone-200 transition-colors block text-center mb-4">
                {t('support.emailUs')}
              </a>
              <p className="text-center text-stone-500 text-sm">{t('support.emailDescription')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
