import { notFound } from 'next/navigation';
import { getGame, getPlayableGame } from '@/lib/api';
import GamePlayerWrapper from './GamePlayerWrapper';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGame(slug);

  if (!game) {
    return {
      title: '游戏未找到',
    };
  }

  return {
    title: game.title,
    description: game.description || undefined,
    openGraph: {
      title: game.title,
      description: game.description || undefined,
      images: game.cover_image ? [game.cover_image] : undefined,
    },
  };
}

export default async function PlayPage({ params }: Props) {
  const { slug } = await params;
  const [game, playableGame] = await Promise.all([getGame(slug), getPlayableGame(slug)]);

  if (!game || !playableGame) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <GamePlayerWrapper
        game={playableGame}
        gameId={game.id}
        slug={slug}
      />
    </div>
  );
}
