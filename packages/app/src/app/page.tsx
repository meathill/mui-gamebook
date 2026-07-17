import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr';
import { getFeaturedGames } from '@/lib/games';
import JsonLd from '@/components/JsonLd';
import {
  HeroSection,
  FeaturesSection,
  HighlightsSection,
  FaqSection,
  GameCard,
  WorkflowSection,
  CtaSection,
  BlogPreviewSection,
} from '@/components/home';

export const dynamic = 'force-dynamic';

// Bing 高展示搜索词对应的作品固定出现在首页精选（issue #5）
const FEATURED_SLUGS = ['zhumadian-exorcist', 'the-steam-punk-dream-of-the-red-chamber'];
// FAQ 内容的 key 列表：FaqSection 渲染与 FAQPage 结构化数据共用一份
const FAQ_KEYS = ['whatIs', 'howCreate', 'pricing', 'export', 'aiRole'];

const HOME_TITLE = '姆伊游戏书 - 在线互动小说创作与阅读平台';
const HOME_DESCRIPTION =
  '姆伊游戏书是免费的在线互动小说网站：阅读《驻马店驱魔人》《绯红庄园之梦》等交互小说，或用 Markdown 和 AI 助手创作你自己的互动小说，一键发布分享。';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: HOME_TITLE },
    description: HOME_DESCRIPTION,
    openGraph: {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      type: 'website',
      locale: 'zh_CN',
      siteName: '姆伊游戏书',
      url: '/',
    },
  };
}

export default async function Home() {
  const { env } = await getCloudflareContext({ async: true });

  // Headless 模式：自动跳转到 admin 页面
  // wrangler.jsonc 里 HEADLESS_MODE 的默认值固定是 "false"，wrangler types 会把它
  // 推断成字面量类型而不是 string，这里显式加宽类型，避免部署环境把它改成 "true" 时
  // 这个比较被 TS 判定为"两个字面量类型没有交集"
  if ((env.HEADLESS_MODE as string) === 'true') {
    if (!env.COOKIE_DOMAIN) {
      throw new Error('HEADLESS_MODE 启用时必须配置 COOKIE_DOMAIN');
    }
    redirect('/admin');
  }

  const [games, t] = await Promise.all([
    getFeaturedGames({ pinnedSlugs: FEATURED_SLUGS, limit: 6 }),
    getTranslations('home'),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muistory.com';
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '姆伊游戏书',
    alternateName: ['MuiStory', 'Muistory'],
    url: baseUrl,
    description: HOME_DESCRIPTION,
    inLanguage: 'zh-CN',
  };
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_KEYS.map((key) => ({
      '@type': 'Question',
      name: t(`faq.${key}.question`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(`faq.${key}.answer`),
      },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={websiteLd} />
      <JsonLd data={faqLd} />

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
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('recentGames')}</h2>
                <p className="mt-2 text-gray-600">{t('recentGamesSubtitle')}</p>
              </div>
              <Link
                href="/games"
                className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium text-sm shrink-0">
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
      <FaqSection faqKeys={FAQ_KEYS} />

      {/* CTA */}
      <CtaSection />
    </div>
  );
}
