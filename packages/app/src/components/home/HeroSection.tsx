import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon, PenLineIcon } from 'lucide-react';

export default async function HeroSection() {
  const t = await getTranslations('home');

  return (
    <section className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
              {t('hero.title')}
            </h1>

            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-lg">{t('hero.subtitle')}</p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/my/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors">
                <PenLineIcon className="w-4 h-4" />
                {t('hero.startCreating')}
              </Link>
              <Link
                href="/games"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                {t('hero.browseStories')}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right: Editor preview placeholder */}
          <div className="hidden lg:block">
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              {/* Mock editor UI */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white border-b border-gray-200">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span className="ml-3 text-xs text-gray-400 font-mono">my-story.md</span>
              </div>
              <div className="p-6 space-y-4 font-mono text-sm">
                <div>
                  <span className="text-gray-400"># </span>
                  <span className="text-gray-900 font-bold text-lg">start</span>
                </div>
                <div className="text-gray-600 leading-relaxed">
                  <p>你站在古老城堡的大门前，月光洒在斑驳的石墙上。</p>
                  <p className="mt-2">远处传来猫头鹰的叫声，门上的铁环在微风中轻轻摇晃。</p>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">*</span>
                    <span className="text-orange-600">[推开大门走进去]</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-blue-600">enter_castle</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">*</span>
                    <span className="text-orange-600">[绕到城堡后面查看]</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-blue-600">back_garden</span>
                  </div>
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-orange-500 animate-pulse rounded-sm" />
                  <span className="text-gray-300 text-xs">AI: 建议在选项中加入勇气变量检查...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
