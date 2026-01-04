import { getTranslations } from 'next-intl/server';
import { getRelatedGames } from '@/lib/games';
import { GameCard } from '@/components/home';

interface RelatedGamesProps {
  currentSlug: string;
  tags: string[];
}

export default async function RelatedGames({ currentSlug, tags }: RelatedGamesProps) {
  const games = await getRelatedGames(currentSlug, tags, 4);
  const t = await getTranslations('game');

  if (games.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 py-8 border-t border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('relatedGames')}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {games.map((game) => (
          <GameCard
            key={game.slug}
            game={game}
          />
        ))}
      </div>
    </section>
  );
}
