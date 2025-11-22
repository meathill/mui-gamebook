import { cachedGetGameBySlug } from '@/lib/games';
import GamePlayer from '@/components/GamePlayer';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await cachedGetGameBySlug(slug);

  if (!game) {
    return {
      title: '游戏未找到',
    };
  }

  return {
    title: game.title,
    description: game.description,
    openGraph: {
      title: game.title,
      description: game.description,
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
          <h1 className="text-2xl font-bold text-red-600">Game Not Found</h1>
          <p className="mt-2 text-gray-600">Could not find story: {slug}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 py-12">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
        <GamePlayer game={game} slug={slug} />
      </div>
    </main>
  );
}
