import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { getPublicMinigames, getPublicMinigamesCount } from '@/lib/minigames';
import { MiniGameCard } from '@/components/home';
import Pagination from '@/components/Pagination';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 16;

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('minigames');
  return {
    title: t('pageTitle'),
    description: t('pageDescription'),
  };
}

export default async function MinigamesPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10));
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [minigames, totalCount, t] = await Promise.all([
    getPublicMinigames({ limit: PAGE_SIZE, offset }),
    getPublicMinigamesCount(),
    getTranslations('minigames'),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-600">{t('subtitle')}</p>
        </div>

        {minigames.length > 0 ? (
          <>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mb-12">
              {minigames.map((minigame) => (
                <MiniGameCard
                  key={minigame.id}
                  minigame={minigame}
                />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath="/minigames"
            />
          </>
        ) : (
          <div className="text-center text-gray-500 py-16 bg-white rounded-xl">{t('noMinigames')}</div>
        )}
      </div>
    </div>
  );
}
