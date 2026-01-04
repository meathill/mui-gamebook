import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, BookOpenIcon } from 'lucide-react';
import { getMinigameById } from '@/lib/minigames';
import StandaloneMiniGamePlayer from '@/components/game-player/StandaloneMiniGamePlayer';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const minigame = await getMinigameById(parseInt(id, 10));
  const t = await getTranslations('minigames');

  if (!minigame) {
    return { title: t('notFound') };
  }

  return {
    title: `${minigame.name} | ${t('pageTitle')}`,
    description: minigame.description || t('defaultDescription'),
  };
}

export default async function MinigameDetailPage({ params }: Props) {
  const { id } = await params;
  const minigame = await getMinigameById(parseInt(id, 10));
  const t = await getTranslations('minigames');

  if (!minigame) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/minigames"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          {t('backToList')}
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{minigame.name}</h1>
            {minigame.description && <p className="text-gray-600">{minigame.description}</p>}
          </div>

          {/* 小游戏播放器 */}
          <div className="p-6">
            <StandaloneMiniGamePlayer code={minigame.code} />
          </div>

          {/* 来源剧本链接 */}
          {minigame.source_game_slug && minigame.source_game_title && (
            <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 border-t border-orange-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <BookOpenIcon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-orange-600 font-medium mb-1">{t('sourceGame')}</p>
                  <p className="text-gray-900 font-semibold">{minigame.source_game_title}</p>
                </div>
                <Link
                  href={`/play/${minigame.source_game_slug}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 font-medium shadow-sm hover:shadow-md transition-all">
                  {t('playFullStory')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
