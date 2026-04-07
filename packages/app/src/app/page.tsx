import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ArrowRightIcon } from 'lucide-react';
import { getPublishedGames } from '@/lib/games';
import { HeroSection, FeaturesSection, HighlightsSection, FaqSection, GameCard, WorkflowSection, CtaSection, BlogPreviewSection } from '@/components/home';

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

  const [games, t] = await Promise.all([
    getPublishedGames({ limit: 6 }),
    getTranslations('home'),
  ]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <HeroSection />

      {/* 功能亮点 */}
      <FeaturesSection />

      {/* 详细卖点 */}
      <HighlightsSection />

      {/* 创作流程 */}
      <WorkflowSection />

      {/* 精选作品 */}
      {games.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('recentGames')}</h2>
              <Link
                href="/games"
                className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium text-sm">
                {t('viewAll')}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => (
                <GameCard
                  key={game.slug}
                  game={game}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog 预览 */}
      <BlogPreviewSection />

      {/* FAQ */}
      <FaqSection />

      {/* CTA */}
      <CtaSection />
    </div>
  );
}
