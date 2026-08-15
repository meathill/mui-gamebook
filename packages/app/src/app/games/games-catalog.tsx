import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import Link from 'next/link';
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import { getPublishedGames, getPublishedGamesCount } from '@/lib/games';
import { catalogPageHref } from '@/lib/catalog-path';
import { GameCard } from '@/components/home';
import Pagination from '@/components/Pagination';
import JsonLd from '@/components/JsonLd';

export const GAMES_PAGE_SIZE = 12;

export async function generateGamesMetadata(page: number): Promise<Metadata> {
  const t = await getTranslations('games');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
    alternates: { canonical: catalogPageHref('/games', page) },
  };
}

export async function GamesCatalog({ page }: { page: number }) {
  const currentPage = Math.max(1, page);
  const offset = (currentPage - 1) * GAMES_PAGE_SIZE;

  const [games, totalCount, t] = await Promise.all([
    getPublishedGames({ limit: GAMES_PAGE_SIZE, offset }),
    getPublishedGamesCount(),
    getTranslations('games'),
  ]);

  const totalPages = Math.ceil(totalCount / GAMES_PAGE_SIZE);
  const baseUrl = getPublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('title'),
    itemListElement: games.map((game, index) => ({
      '@type': 'ListItem',
      position: offset + index + 1,
      url: `${baseUrl}/play/${game.slug}`,
      name: game.title,
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <JsonLd data={itemListLd} />
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-600">{t('subtitle')}</p>
          <Link
            href="/interactive-fiction"
            className="inline-flex items-center gap-1 mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors">
            {t('whatIs')}
          </Link>
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
