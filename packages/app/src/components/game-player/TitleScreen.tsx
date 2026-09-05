'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import ShareButton from '@/components/ShareButton';
import { PLACEHOLDER_COVER, resolveCoverSrc } from '../../../image-loader';

interface TitleScreenProps {
  game: PlayableGame;
  /** 是否有本地存档。SSR 与水合首帧必须为 false，由调用方在读完 localStorage 的 effect 之后才置真 */
  hasSave: boolean;
  /** 开始 / 继续，同一个入口 */
  onStart: () => void;
  /** 清档重来，仅 hasSave 时渲染 */
  onRestart: () => void;
}

export default function TitleScreen({ game, hasSave, onStart, onRestart }: TitleScreenProps) {
  // 不用 location.href：播放页把视图状态放进了 hash，分享出去的链接不该带上 #settings 之类
  const shareUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const t = useTranslations('game');
  const [imgError, setImgError] = useState(false);
  const coverSrc = imgError ? PLACEHOLDER_COVER : resolveCoverSrc(game.cover_image);

  return (
    <div className="flex flex-col min-h-150 bg-white">
      <div className="relative w-full h-64 md:h-80 bg-gray-200 overflow-hidden">
        <Image
          src={coverSrc}
          alt={game.title}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          onError={() => setImgError(true)}
        />
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
          className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-lg font-semibold rounded-full shadow-lg hover:from-orange-600 hover:to-amber-600 hover:shadow-xl transition-all transform hover:-translate-y-0.5">
          {hasSave ? t('continueAdventure') : t('startAdventure')}
        </button>

        {/* 存档信息只有客户端才知道，固定高度占位避免它到位后按钮区抖动 */}
        <div className="h-10 mt-3 flex items-center justify-center">
          {hasSave && (
            <button
              onClick={onRestart}
              className="text-sm text-gray-500 hover:text-gray-800 underline">
              {t('restartFromStart')}
            </button>
          )}
        </div>

        <Link
          href="/"
          prefetch={false}
          className="mt-3 text-sm text-gray-500 hover:text-gray-800 underline">
          {t('backToLibrary')}
        </Link>
      </div>
    </div>
  );
}
