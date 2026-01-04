import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { SparklesIcon, PlayIcon } from 'lucide-react';

export default async function HeroSection() {
  const t = await getTranslations('home');

  return (
    <section className="relative overflow-hidden text-white min-h-[600px] flex items-center">
      {/* 背景图与渐变遮罩 */}
      <div className="absolute inset-0 z-0 select-none">
        <Image
          src="/hero-bg.png"
          alt="Hero Background"
          fill
          className="object-cover object-center"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-orange-900/90 via-amber-800/80 to-yellow-900/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      {/* 装饰光效 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl mix-blend-screen" />
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 sm:py-28 text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <SparklesIcon className="w-6 h-6 text-yellow-300 animate-pulse drop-shadow-lg" />
          <span className="text-sm font-bold bg-black/30 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-sm tracking-wide">
            {t('hero.badge')}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold mb-8 leading-tight tracking-tight drop-shadow-xl">
          {t('hero.title')}
        </h1>

        <p className="text-lg sm:text-2xl text-white/95 max-w-2xl mx-auto mb-12 drop-shadow-md font-medium">
          {t('hero.subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row gap-5 justify-center">
          <Link
            href="/games"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-orange-500/50 hover:scale-105 transition-all duration-300">
            <PlayIcon className="w-6 h-6 fill-current" />
            <span className="text-lg">{t('hero.playNow')}</span>
          </Link>
          <Link
            href="/admin"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-black/40 backdrop-blur-md border border-white/30 text-white font-bold rounded-xl hover:bg-black/60 hover:border-white/50 transition-all duration-300">
            <span className="text-lg">{t('hero.createStory')}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
