import { notFound } from 'next/navigation';
import { getGame, getPlayableGame } from '@/lib/api';
import VisualNovelShell from './play/[slug]/components/VisualNovelShell';
import type { Metadata } from 'next';

const targetIdentifier = process.env.NEXT_PUBLIC_GAME_ID || process.env.NEXT_PUBLIC_GAME_SLUG || 'demo';

export async function generateMetadata(): Promise<Metadata> {
  const game = await getGame(targetIdentifier);

  if (!game) {
    return { title: '游戏未找到' };
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

export default async function Home() {
  const [game, playableGame] = await Promise.all([getGame(targetIdentifier), getPlayableGame(targetIdentifier)]);

  if (!game || !playableGame) {
    notFound();
  }

  return (
    <VisualNovelShell
      game={playableGame}
      gameId={game.id}
      slug={playableGame.slug}
    />
  );
}
