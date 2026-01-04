import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { getPublishedGames, getPublishedGamesCount } from '@/lib/games';
import { GameCard } from '@/components/home';
import Pagination from '@/components/Pagination';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('games');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function GamesPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [games, totalCount, t] = await Promise.all([
    getPublishedGames({ limit: PAGE_SIZE, offset }),
    getPublishedGamesCount(),
    getTranslations('games'),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-600">{t('subtitle')}</p>
        </div>

        {games.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-12">
              {games.map((game) => (
                <GameCard
                  key={game.slug}
                  game={game}
                />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath="/games"
            />
          </>
        ) : (
          <div className="text-center text-gray-500 py-16 bg-white rounded-xl">{t('noGames')}</div>
        )}
      </div>
    </div>
  );
}
