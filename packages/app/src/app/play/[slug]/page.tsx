import { cachedGetGameBySlug } from '@/lib/games';
import GamePlayer from '@/components/GamePlayer';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await cachedGetGameBySlug(slug);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muistory.com';

  if (!game) {
    return {
      title: '游戏未找到',
    };
  }

  return {
    title: game.title,
    description: game.description || `在姆伊游戏书体验《${game.title}》，开启你的互动冒险之旅。`,
    openGraph: {
      title: `${game.title} | 姆伊游戏书`,
      description: game.description || `在姆伊游戏书体验《${game.title}》，开启你的互动冒险之旅。`,
      images: game.cover_image ? [{ url: game.cover_image, width: 1200, height: 630 }] : [],
      type: 'article',
      url: `${baseUrl}/play/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${game.title} | 姆伊游戏书`,
      description: game.description || `在姆伊游戏书体验《${game.title}》，开启你的互动冒险之旅。`,
      images: game.cover_image ? [game.cover_image] : [],
    },
  };
}

export default async function PlayPage({ params }: Props) {
  const { slug } = await params;
  const game = await cachedGetGameBySlug(slug);

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

  return (
    <main className="min-h-screen bg-neutral-100 sm:py-12">
      <div className="max-w-3xl mx-auto bg-white sm:shadow-xl sm:rounded-2xl overflow-hidden">
        <GamePlayer
          game={game}
          slug={slug}
        />
      </div>
    </main>
  );
}
