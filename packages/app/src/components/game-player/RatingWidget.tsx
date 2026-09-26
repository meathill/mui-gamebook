'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { StarIcon } from '@phosphor-icons/react';
import { authClient } from '@/lib/auth-client';
import ReviewDialog from './ReviewDialog';

interface RatingWidgetProps {
  slug: string;
  initialAvg?: number;
  initialCount?: number;
}

function ratedKey(slug: string) {
  return `game-rating:${slug}`;
}

/**
 * 结局打分区：5 星可点（匿名）→ 弹留言框（写评价需登录）。
 * 本浏览器已评时只读展示，登录用户可改分（服务端 upsert）。
 */
export default function RatingWidget({ slug, initialAvg, initialCount }: RatingWidgetProps) {
  const t = useTranslations('game');
  const { data: session } = authClient.useSession();
  const [avg, setAvg] = useState<number | undefined>(initialAvg);
  const [count, setCount] = useState(initialCount ?? 0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hover, setHover] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDismissed, setDialogDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // 拉取最新均分 + 登录用户的已有评分；匿名已评读 localStorage
  useEffect(() => {
    try {
      const local = window.localStorage.getItem(ratedKey(slug));
      if (local) setMyRating(Number(local));
    } catch {
      // 无痕模式等 storage 不可用时降级为未评态
    }
    let cancelled = false;
    fetch(`/api/games/${encodeURIComponent(slug)}/ratings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || cancelled) return;
        if (typeof data.avg === 'number') setAvg(data.avg);
        if (typeof data.count === 'number') setCount(data.count);
        if (data.myRating && typeof data.myRating.rating === 'number') {
          setMyRating(data.myRating.rating);
          try {
            window.localStorage.setItem(ratedKey(slug), String(data.myRating.rating));
          } catch {
            // 忽略 storage 写入失败
          }
        }
      })
      .catch(() => {
        // 评分区加载失败不阻塞结局页
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const hasRated = myRating !== null;
  // 未登录且本浏览器已评过：只读，不再接受投票
  const readOnly = hasRated && !session;

  async function handleRate(stars: number) {
    if (readOnly || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(slug)}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: stars }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { avg: number; count: number };
      setAvg(data.avg);
      setCount(data.count);
      setMyRating(stars);
      setSaved(true);
      try {
        window.localStorage.setItem(ratedKey(slug), String(stars));
      } catch {
        // 忽略 storage 写入失败
      }
      if (!dialogDismissed) setDialogOpen(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReview(content: string) {
    if (myRating === null) {
      closeDialog();
      return;
    }
    setSubmitting(true);
    setError(null);
    setLoginRequired(false);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(slug)}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: myRating, content }),
      });
      if (res.status === 401) {
        const data = (await res.json()) as { error?: string };
        if (data.error === 'LOGIN_REQUIRED') {
          setLoginRequired(true);
          return;
        }
      }
      if (!res.ok) {
        setError(`${res.status}`);
        return;
      }
      closeDialog();
    } finally {
      setSubmitting(false);
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    setDialogDismissed(true);
    setLoginRequired(false);
    setError(null);
  }

  const displayStars = hover || myRating || 0;

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <p className="text-sm font-medium text-gray-700 mb-1">{t('rateTitle')}</p>
      {!hasRated && <p className="text-xs text-gray-400 mb-3">{t('ratePrompt')}</p>}
      <div
        className="flex items-center justify-center gap-1"
        role="radiogroup"
        aria-label={t('rateTitle')}>
        {[1, 2, 3, 4, 5].map((stars) => (
          <button
            key={stars}
            type="button"
            role="radio"
            aria-checked={myRating === stars}
            aria-label={`${stars}`}
            disabled={readOnly}
            onClick={() => handleRate(stars)}
            onMouseEnter={() => !readOnly && setHover(stars)}
            onMouseLeave={() => setHover(0)}
            className={readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}>
            <StarIcon
              size={28}
              weight={stars <= displayStars ? 'fill' : 'regular'}
              className={stars <= displayStars ? 'text-amber-400' : 'text-gray-300'}
            />
          </button>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500 min-h-4">
        {hasRated && <span className="text-orange-600 font-medium">{t('alreadyRated', { stars: myRating })} · </span>}
        {count > 0 && typeof avg === 'number' ? (
          <span>
            {t('averageRating', { avg: avg.toFixed(1) })} · {t('ratingCount', { count })}
          </span>
        ) : (
          !hasRated && <span>{t('noRatings')}</span>
        )}
        {saved && hasRated && <span className="block text-green-600 mt-1">{t('rateSuccess')}</span>}
      </div>
      {myRating !== null && (
        <ReviewDialog
          open={dialogOpen}
          rating={myRating}
          submitting={submitting}
          loginRequired={loginRequired}
          error={error}
          onClose={closeDialog}
          onSubmit={handleSubmitReview}
        />
      )}
    </div>
  );
}
