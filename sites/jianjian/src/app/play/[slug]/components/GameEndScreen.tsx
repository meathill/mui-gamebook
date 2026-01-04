'use client';

import { useState } from 'react';
import StarRating from './StarRating';

interface GameEndScreenProps {
  gameId: number;
  gameStartTime: number | null;
  onRestart: () => void;
}

// 检查是否允许发送统计
function canSendAnalytics(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('analytics_consent') === 'accepted';
}

/**
 * 游戏结束画面
 */
export default function GameEndScreen({ gameId, gameStartTime, onRestart }: GameEndScreenProps) {
  const [hasRated, setHasRated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRate(rating: number) {
    setIsSubmitting(true);

    // 计算游戏时长（秒）
    const duration = gameStartTime ? Math.round((Date.now() - gameStartTime) / 1000) : 0;

    if (canSendAnalytics()) {
      try {
        await fetch('/api/analytics/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, duration, rating }),
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }
    }

    setIsSubmitting(false);
    setHasRated(true);
  }

  async function handleSkipRating() {
    // 即使跳过评分，也记录完成
    const duration = gameStartTime ? Math.round((Date.now() - gameStartTime) / 1000) : 0;

    if (canSendAnalytics()) {
      try {
        await fetch('/api/analytics/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, duration }),
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }
    }

    setHasRated(true);
  }

  return (
    <div className="card p-8 text-center mt-8 animate-bounce-in">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 title-fun">故事结束啦！</h2>

      {!hasRated ? (
        <div className="mb-6">
          <p className="text-lg text-foreground/70 mb-4">喜欢这个故事吗？给它打个分吧！</p>
          <StarRating
            onRate={handleRate}
            disabled={isSubmitting}
          />
          <button
            onClick={handleSkipRating}
            disabled={isSubmitting}
            className="mt-4 text-sm text-foreground/50 hover:text-foreground/70 underline">
            跳过
          </button>
        </div>
      ) : (
        <p className="text-lg text-foreground/70 mb-6">谢谢你的阅读！想再看一遍吗？</p>
      )}

      <button
        onClick={onRestart}
        className="btn btn-primary">
        <span className="mr-2">🔄</span>
        再看一遍！
      </button>
    </div>
  );
}
