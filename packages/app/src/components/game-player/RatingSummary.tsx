'use client';

import { useTranslations } from 'next-intl';
import { StarIcon } from '@phosphor-icons/react';

interface RatingSummaryProps {
  avg?: number;
  count?: number;
  className?: string;
}

/** 只读均分：标题页 / 游戏卡片用；无评分时渲染空（调用方决定是否占位） */
export default function RatingSummary({ avg, count = 0, className = '' }: RatingSummaryProps) {
  const t = useTranslations('game');

  if (!count || typeof avg !== 'number') return null;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <StarIcon
        size={14}
        weight="fill"
        className="text-amber-400"
      />
      <span className="font-medium">{avg.toFixed(1)}</span>
      <span className="opacity-70">({t('ratingCount', { count })})</span>
    </span>
  );
}
