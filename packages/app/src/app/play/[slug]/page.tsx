import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cachedGetGameBySlug, getPublishedGames } from '@/lib/games';
import GamePlayer from '@/components/GamePlayer';
import { GamePlayerImmersive } from '@/components/game-player';
import RelatedGames from '@/components/RelatedGames';
import Comment from '@/components/Comment';
import JsonLd from '@/components/JsonLd';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { UserIcon, ClockIcon, QuestionIcon } from '@phosphor-icons/react/dist/ssr';
import { formatLongDate, getPublicSiteUrl } from '@mui-gamebook/site-common/utils';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const games = await getPublishedGames();
    return games.map((game) => ({ slug: game.slug }));
  } catch {
    return [];
  }
}

type GameForLd = NonNullable<Awaited<ReturnType<typeof cachedGetGameBySlug>>>;

// 播放页结构化数据：面包屑 + 作品信息，供 Bing/Google 生成更清晰的摘要（issue #5/#14）
function buildGameJsonLd(game: GameForLd, slug: string) {
  const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: '互动小说', item: `${baseUrl}/games` },
      { '@type': 'ListItem', position: 3, name: game.title },
    ],
  };
  const safeCover = game.cover_image?.includes('picsum.photos') ? undefined : game.cover_image || undefined;
  const gameLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    url: `${baseUrl}/play/${slug}`,
    description: game.description || undefined,
    image: safeCover,
    genre: game.tags?.length ? game.tags : undefined,
    gamePlatform: 'Web browser',
    inLanguage: 'zh-CN',
    dateModified: game.updatedAt || undefined,
    author: game.authorName ? { '@type': 'Person', name: game.authorName } : undefined,
    publisher: { '@type': 'Organization', name: '姆伊游戏书', url: baseUrl },
  };
  return { breadcrumbLd, gameLd };
}

type Props = {
  params: Promise<{ slug: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const game = await cachedGetGameBySlug(slug);
    const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

    if (!game) {
      return {
        title: '游戏未找到',
        robots: { index: false, follow: true },
      };
    }

    // 优先取作者填写的描述；若无则截取背景故事；最后回退至定制场景词描述
    const cleanBackgroundStory = game.backgroundStory
      ? game.backgroundStory
          .replace(/^[#*>\s-]+/gm, '')
          .replace(/\n+/g, ' ')
          .trim()
          .slice(0, 150)
      : undefined;

    const description =
      game.description ||
      cleanBackgroundStory ||
      `在姆伊游戏书在线体验《${game.title}》，开启你的文字冒险与互动小说之旅。分支剧情由你抉择。`;

    // 独立 OG 图片：优先使用作品封面图，未配置封面或为失效外链（picsum）时回退至站点默认大图
    const isBlockedCover = game.cover_image?.includes('picsum.photos');
    const coverUrl =
      game.cover_image && !isBlockedCover
        ? game.cover_image.startsWith('http')
          ? game.cover_image
          : `${baseUrl}${game.cover_image.startsWith('/') ? '' : '/'}${game.cover_image}`
        : `${baseUrl}/hero-bg.png`;

    const ogImages = [
      {
        url: coverUrl,
        width: 1200,
        height: 630,
        alt: `${game.title} - 互动小说封面`,
      },
    ];

    const fullTitle = `${game.title} - 在线互动小说`;

    return {
      title: game.title,
      description,
      alternates: { canonical: `/play/${slug}` },
      openGraph: {
        title: `${fullTitle} | 姆伊游戏书`,
        description,
        images: ogImages,
        type: 'article',
        siteName: '姆伊游戏书',
        url: `${baseUrl}/play/${slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${fullTitle} | 姆伊游戏书`,
        description,
        images: ogImages.map((img) => img.url),
      },
    };
  } catch {
    return {
      title: '游戏未找到',
      robots: { index: false, follow: true },
    };
  }
}

export default async function PlayPage({ params }: Props) {
  const { slug } = await params;
  const game = await cachedGetGameBySlug(slug);
  const t = await getTranslations('game');

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">游戏未找到</h1>
          <p className="mt-2 text-gray-600">找不到故事：{slug}</p>
        </div>
      </div>
    );
  }

  // 绑定了子站点的游戏，重定向到子站点
  if (game.subdomain) {
    const subdomainUrl = `https://${game.subdomain}.muistory.com/play/${slug}`;
    return redirect(subdomainUrl);
  }

  const { breadcrumbLd, gameLd } = buildGameJsonLd(game, slug);

  if (game.display_mode === 'immersive') {
    return (
      <>
        <JsonLd data={breadcrumbLd} />
        <JsonLd data={gameLd} />
        <GamePlayerImmersive
          game={game}
          slug={slug}
        />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 sm:py-12">
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={gameLd} />

      <div className="max-w-3xl mx-auto">
        {/* 面包屑：关键词锚文本链回首页与作品库 */}
        <nav
          aria-label="面包屑"
          className="px-4 sm:px-0 py-3 sm:pt-0 text-sm text-gray-500">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link
                href="/"
                className="hover:text-gray-900 transition-colors">
                首页
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link
                href="/games"
                className="hover:text-gray-900 transition-colors">
                互动小说
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li
              className="text-gray-900 truncate max-w-[16rem]"
              aria-current="page">
              《{game.title}》
            </li>
          </ol>
        </nav>

        {/* 作品元信息：作者、更新时间、玩法入口（issue #14） */}
        {(game.authorName || game.updatedAt) && (
          <div className="px-4 sm:px-0 pb-4 flex items-center gap-4 flex-wrap text-sm text-gray-500">
            {game.authorName && (
              <span className="flex items-center gap-1.5">
                <UserIcon
                  size={15}
                  className="text-gray-400"
                />
                {t('byAuthor', { name: game.authorName })}
              </span>
            )}
            {game.updatedAt && (
              <span className="flex items-center gap-1.5">
                <ClockIcon
                  size={15}
                  className="text-gray-400"
                />
                {t('updatedAt', { date: formatLongDate(game.updatedAt) })}
              </span>
            )}
            <Link
              href="/how-to-play"
              className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-medium transition-colors ms-auto">
              <QuestionIcon
                size={15}
                weight="fill"
              />
              {t('howToPlay')}
            </Link>
          </div>
        )}
        <div className="bg-white sm:shadow-xl sm:rounded-2xl overflow-hidden">
          <GamePlayer
            game={game}
            slug={slug}
          />
        </div>
      </div>

      {/* 评论系统 */}
      <div className="max-w-5xl mx-auto px-4 sm:px-0">
        <Comment postId={slug} />
      </div>

      {/* 相关游戏推荐 */}
      {game.tags && game.tags.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-0">
          <RelatedGames
            currentSlug={slug}
            tags={game.tags}
          />
        </div>
      )}
    </main>
  );
}
