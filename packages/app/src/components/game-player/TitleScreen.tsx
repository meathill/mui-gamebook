'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import { UserIcon, ClockIcon, QuestionIcon } from '@phosphor-icons/react/dist/ssr';
import { formatLongDate } from '@mui-gamebook/site-common/utils';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import ShareButton from '@/components/ShareButton';
import { PLACEHOLDER_COVER, resolveCoverSrc } from '../../../image-loader';
import RatingSummary from './RatingSummary';

interface TitleScreenProps {
  game: PlayableGame;
  /** 是否有本地存档。SSR 与水合首帧必须为 false，由调用方在读完 localStorage 的 effect 之后才置真 */
  hasSave: boolean;
  /** 开始 / 继续，同一个入口 */
  onStart: () => void;
  /** 清档重来，仅 hasSave 时渲染 */
  onRestart: () => void;
  /** 作者与更新时间（沉浸模式标题页用；经典模式由播放页单独渲染，不传即不显示） */
  authorName?: string;
  updatedAt?: string;
  /** 评分均分与条数（详情接口透出，不传即不显示） */
  avgRating?: number;
  ratingCount?: number;
}

export default function TitleScreen({
  game,
  hasSave,
  onStart,
  onRestart,
  authorName,
  updatedAt,
  avgRating,
  ratingCount,
}: TitleScreenProps) {
  // 不用 location.href：播放页把视图状态放进了 hash，分享出去的链接不该带上 #settings 之类
  const shareUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const t = useTranslations('game');
  const [imgError, setImgError] = useState(false);
  const coverSrc = imgError ? PLACEHOLDER_COVER : resolveCoverSrc(game.cover_image);

  if (game.title_layout === 'fullscreen') {
    return (
      <section className="relative flex-1 flex items-center justify-center overflow-hidden min-h-[calc(100dvh-4rem)]">
        <Image
          src={coverSrc}
          alt={game.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
        {/* 分享按钮 - 右上角，深色底垫一层保证可读 */}
        <div className="absolute top-4 right-4 z-10 rounded-full bg-black/40 backdrop-blur-sm">
          <ShareButton
            title={game.title}
            url={shareUrl}
          />
        </div>

        <div className="relative z-10 w-[min(92vw,44rem)] my-10 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl p-6 md:p-10 text-center text-white">
          <h1 className="text-3xl md:text-5xl font-bold mb-3">{game.title}</h1>
          {game.tags && game.tags.length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap mb-3">
              {game.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-white/15 backdrop-blur-sm rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {(authorName || updatedAt) && (
            <div className="flex items-center justify-center gap-4 flex-wrap text-sm text-white/70 mb-4">
              {authorName && (
                <span className="flex items-center gap-1.5">
                  <UserIcon size={15} />
                  {t('byAuthor', { name: authorName })}
                </span>
              )}
              {updatedAt && (
                <span className="flex items-center gap-1.5">
                  <ClockIcon size={15} />
                  {t('updatedAt', { date: formatLongDate(updatedAt) })}
                </span>
              )}
              <RatingSummary
                avg={avgRating}
                count={ratingCount}
              />
              <Link
                href="/how-to-play"
                className="flex items-center gap-1.5 text-orange-300 hover:text-orange-200 font-medium transition-colors">
                <QuestionIcon
                  size={15}
                  weight="fill"
                />
                {t('howToPlay')}
              </Link>
            </div>
          )}

          {game.backgroundStory ? (
            <div className="text-left prose prose-invert prose-sm max-h-[36dvh] overflow-y-auto mb-8 mx-auto max-w-2xl leading-relaxed">
              <ReactMarkdown>{game.backgroundStory}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-white/85 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
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
                className="text-sm text-white/70 hover:text-white underline">
                {t('restartFromStart')}
              </button>
            )}
          </div>

          <Link
            href="/"
            prefetch={false}
            className="mt-3 text-sm text-white/70 hover:text-white underline">
            {t('backToLibrary')}
          </Link>
        </div>
      </section>
    );
  }

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
        {(authorName || updatedAt) && (
          <div className="flex items-center justify-center gap-4 flex-wrap text-sm text-gray-500 mb-4">
            {authorName && (
              <span className="flex items-center gap-1.5">
                <UserIcon
                  size={15}
                  className="text-gray-400"
                />
                {t('byAuthor', { name: authorName })}
              </span>
            )}
            {updatedAt && (
              <span className="flex items-center gap-1.5">
                <ClockIcon
                  size={15}
                  className="text-gray-400"
                />
                {t('updatedAt', { date: formatLongDate(updatedAt) })}
              </span>
            )}
            <RatingSummary
              avg={avgRating}
              count={ratingCount}
            />
          </div>
        )}
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
