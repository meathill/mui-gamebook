import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import Link from 'next/link';
import { TagIcon, ArrowLeftIcon } from 'lucide-react';
import { getGamesByTag } from '@/lib/games';
import GameCard from '@/components/home/GameCard';
import Pagination from '@/components/Pagination';

export const dynamic = 'force-dynamic';

const GAMES_PER_PAGE = 12;

type Props = {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const t = await getTranslations('tags');

  return {
    title: t('pageTitle', { tag: decodedTag }),
    description: t('pageDescription', { tag: decodedTag }),
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { tag } = await params;
  const { page } = await searchParams;
  const decodedTag = decodeURIComponent(tag);
  const currentPage = parseInt(page || '1', 10);
  const offset = (currentPage - 1) * GAMES_PER_PAGE;
  const t = await getTranslations('tags');

  const { games, total } = await getGamesByTag(decodedTag, {
    limit: GAMES_PER_PAGE,
    offset,
  });

  const totalPages = Math.ceil(total / GAMES_PER_PAGE);

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/games"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          {t('backToGames')}
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <TagIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{decodedTag}</h1>
          </div>
          <p className="text-gray-600">{t('gamesCount', { count: total })}</p>
        </div>

        {games.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => (
                <GameCard
                  key={game.slug}
                  game={game}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath={`/tags/${tag}`}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <TagIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('noGames')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
