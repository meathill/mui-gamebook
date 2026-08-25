'use client';

import { useState } from 'react';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';

const PLACEHOLDER_COVER = '/placeholder-cover-400x600.png';
function resolveCover(src: string | undefined | null): string | null {
  if (!src) return null;
  const t = src.trim();
  if (!t || t.includes('picsum.photos')) return PLACEHOLDER_COVER;
  return t;
}

interface Props {
  game: PlayableGame;
  hasAutoSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
}

/**
 * 标题画面
 * 显示游戏封面、标题，提供「开始」和「继续」按钮
 */
export default function TitleScreen({ game, hasAutoSave, onNewGame, onContinue }: Props) {
  const [imgError, setImgError] = useState(false);
  const resolved = resolveCover(game.cover_image);
  const displaySrc = imgError ? PLACEHOLDER_COVER : resolved;
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen">
      {/* 背景封面图 */}
      {displaySrc && (
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt={`${game.title} 封面背景`}
            className="w-full h-full object-cover opacity-30 blur-sm"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        </div>
      )}

      {/* 内容 */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        {/* 标题 */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-wider mb-4 animate-title-reveal">{game.title}</h1>

        {/* 描述 */}
        {game.description && (
          <p
            className="text-muted text-base sm:text-lg mb-12 animate-fade-in"
            style={{ animationDelay: '0.8s', opacity: 0 }}>
            {game.description}
          </p>
        )}

        {/* 按钮组 */}
        <div
          className="flex flex-col gap-3 w-full max-w-xs animate-slide-up"
          style={{ animationDelay: '1.2s', opacity: 0 }}>
          {hasAutoSave ? (
            <>
              <button
                onClick={onContinue}
                className="btn btn-accent text-lg py-4">
                继续
              </button>
              <button
                onClick={onNewGame}
                className="btn btn-ghost">
                新游戏
              </button>
            </>
          ) : (
            <button
              onClick={onNewGame}
              className="btn btn-accent text-lg py-4">
              开始
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
