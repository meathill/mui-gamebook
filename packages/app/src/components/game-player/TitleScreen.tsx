'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import ShareButton from '@/components/ShareButton';

interface TitleScreenProps {
  game: PlayableGame;
  onStart: () => void;
}

export default function TitleScreen({ game, onStart }: TitleScreenProps) {
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const t = useTranslations('game');

  return (
    <div className="flex flex-col min-h-150 bg-white">
      <div className="relative w-full h-64 md:h-80 bg-gray-200 overflow-hidden">
        {game.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.cover_image}
            alt={game.title}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <span className="text-4xl font-bold opacity-20">{game.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end">
          <div className="p-6 md:p-8 text-white flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{game.title}</h1>
            {game.tags && (
              <div className="flex gap-2">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* 分享按钮 - 右上角 */}
        <div className="absolute top-4 right-4">
          <ShareButton
            title={game.title}
            url={shareUrl}
          />
        </div>
      </div>

      <div className="flex-1 p-6 md:p-8 flex flex-col items-center text-center">
        {game.backgroundStory ? (
          <div className="text-gray-600 text-base mb-8 max-w-2xl leading-relaxed text-left prose prose-gray prose-sm">
            <ReactMarkdown>{game.backgroundStory}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-gray-600 text-lg mb-8 max-w-xl leading-relaxed">
            {game.description || t('defaultDescription')}
          </p>
        )}

        <button
          onClick={onStart}
          className="px-8 py-3 bg-blue-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5">
          {t('startAdventure')}
        </button>

        <Link
          href="/"
          className="mt-6 text-sm text-gray-500 hover:text-gray-800 underline">
          {t('backToLibrary')}
        </Link>
      </div>
    </div>
  );
}
