import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ArrowRightIcon } from 'lucide-react';
import { getPublishedGames } from '@/lib/games';
import { getPublicMinigames } from '@/lib/minigames';
import { HeroSection, FeaturesSection, FaqSection, GameCard, MiniGameCard } from '@/components/home';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { env } = await getCloudflareContext({ async: true });

  // Headless 模式：自动跳转到 admin 页面
  if (env.HEADLESS_MODE === 'true') {
    if (!env.COOKIE_DOMAIN) {
      throw new Error('HEADLESS_MODE 启用时必须配置 COOKIE_DOMAIN');
    }
    redirect('/admin');
  }

  const [games, minigames, t] = await Promise.all([
    getPublishedGames({ limit: 9 }),
    getPublicMinigames({ limit: 8 }),
    getTranslations('home'),
  ]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero 区域 */}
      <HeroSection />

      {/* 最近更新游戏 */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('recentGames')}</h2>
            <Link
              href="/games"
              className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium text-sm group">
              {t('viewAll')}
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {games.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => (
                <GameCard
                  key={game.slug}
                  game={game}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12 bg-white rounded-xl shadow-sm">{t('noGames')}</div>
          )}
        </div>
      </section>

      {/* 小游戏展示 */}
      {minigames.length > 0 && (
        <section className="py-16 px-4 bg-gradient-to-b from-orange-50 to-amber-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('minigamesTitle')}</h2>
                <p className="text-gray-600 mt-1">{t('minigamesSubtitle')}</p>
              </div>
              <Link
                href="/minigames"
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-medium text-sm group">
                {t('viewAll')}
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-4">
              {minigames.map((minigame) => (
                <MiniGameCard
                  key={minigame.id}
                  minigame={minigame}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 产品特色 */}
      <FeaturesSection />

      {/* Open Source */}
      <section className="py-20 px-4 bg-stone-900 text-white overflow-hidden relative">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">{t('openSource.title')}</h2>
          <p className="text-xl text-stone-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('openSource.description')}
          </p>
          <Link
            href="/open"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-stone-900 rounded-full font-bold hover:bg-stone-100 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-stone-900/50">
            {t('openSource.cta')}
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />

      {/* 关于作者 */}
      <section className="py-16 px-4 bg-gradient-to-br from-stone-800 to-stone-900 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">{t('aboutTitle')}</h2>
          <p className="text-gray-300 leading-relaxed mb-4">{t('aboutContent')}</p>
          <p className="text-gray-300 leading-relaxed mb-6">{t('aboutContent2')}</p>
          <a
            href="mailto:meathill@gmail.com"
            className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium">
            {t('contactLink')}
            <ArrowRightIcon className="w-4 h-4" />
          </a>
          <p className="text-gray-400 mt-6 text-sm">{t('signature')}</p>
        </div>
      </section>
    </div>
  );
}
