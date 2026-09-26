'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { StarIcon } from '@phosphor-icons/react';
import { authClient } from '@/lib/auth-client';
import ReviewDialog from './ReviewDialog';

interface RatingWidgetProps {
  slug: string;
  initialAvg?: number;
  initialCount?: number;
}

interface Draft {
  rating: number;
  content: string;
  updatedAt: number;
}

/** 登录前写的评价草稿最多保留 7 天 */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function ratedKey(slug: string) {
  return `game-rating:${slug}`;
}

function draftKey(slug: string) {
  return `game-review-draft:${slug}`;
}

function readRated(slug: string): number | null {
  try {
    const raw = window.localStorage.getItem(ratedKey(slug));
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

function readDraft(slug: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (
      typeof draft.rating !== 'number' ||
      typeof draft.content !== 'string' ||
      !draft.content ||
      Date.now() - draft.updatedAt > DRAFT_TTL_MS
    ) {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function writeDraft(slug: string, rating: number, content: string) {
  try {
    window.localStorage.setItem(draftKey(slug), JSON.stringify({ rating, content, updatedAt: Date.now() }));
  } catch {
    // 无痕模式等 storage 不可用时直接放弃草稿
  }
}

function clearDraft(slug: string) {
  try {
    window.localStorage.removeItem(draftKey(slug));
  } catch {
    // 忽略 storage 写入失败
  }
}

/**
 * 结局打分区：5 星可点（匿名）→ 弹留言框（写评价需登录）。
 * 登录前写的评价存草稿，登录回来后自动提交，稿子不丢。
 * 本浏览器已评时只读展示，登录用户可改分（服务端 upsert）。
 */
export default function RatingWidget({ slug, initialAvg, initialCount }: RatingWidgetProps) {
  const t = useTranslations('game');
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [avg, setAvg] = useState<number | undefined>(initialAvg);
  const [count, setCount] = useState(initialCount ?? 0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hover, setHover] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDismissed, setDialogDismissed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [restored, setRestored] = useState(false);
  // 草稿只处理一次（自动提交或自动打开回填二选一）
  const draftHandled = useRef(false);

  // 初挂载：读本地已评 + 草稿，拉取最新均分
  useEffect(() => {
    setMyRating(readRated(slug));
    setDraft(readDraft(slug));
    let cancelled = false;
    fetch(`/api/games/${encodeURIComponent(slug)}/ratings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((raw: unknown) => {
        if (!raw || typeof raw !== 'object' || cancelled) return;
        const data = raw as { avg?: unknown; count?: unknown; myRating?: { rating?: unknown } };
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

  // 草稿处理：登录回来自动提交；仍是匿名则自动打开留言框回填
  useEffect(() => {
    if (sessionPending || !draft || draftHandled.current) return;
    if (session) {
      draftHandled.current = true;
      void (async () => {
        setSubmitting(true);
        try {
          const result = await postRating(draft.rating, draft.content);
          if (result.ok) {
            clearDraft(slug);
            setDraft(null);
            setMyRating(draft.rating);
            if (typeof result.avg === 'number') setAvg(result.avg);
            if (typeof result.count === 'number') setCount(result.count);
            try {
              window.localStorage.setItem(ratedKey(slug), String(draft.rating));
            } catch {
              // 忽略 storage 写入失败
            }
            setSaved(true);
            setRestored(true);
          } else {
            // 自动提交失败（如网络抖动）：打开留言框，内容已回填，用户可手动再交
            setDialogOpen(true);
          }
        } finally {
          setSubmitting(false);
        }
      })();
    } else if (myRating !== null) {
      draftHandled.current = true;
      setDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPending, session, draft, myRating, slug]);

  const hasRated = myRating !== null;
  // 未登录且本浏览器已评过：只读，不再接受投票
  const readOnly = hasRated && !session;

  async function postRating(
    stars: number,
    content?: string,
  ): Promise<{ ok: boolean; loginRequired?: boolean; avg?: number; count?: number }> {
    const res = await fetch(`/api/games/${encodeURIComponent(slug)}/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content ? { rating: stars, content } : { rating: stars }),
    });
    if (res.status === 401) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (data?.error === 'LOGIN_REQUIRED') return { ok: false, loginRequired: true };
    }
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { avg: number; count: number };
    return { ok: true, avg: data.avg, count: data.count };
  }

  async function handleRate(stars: number) {
    if (readOnly || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await postRating(stars);
      if (!result.ok) return;
      setAvg(result.avg);
      setCount(result.count ?? 0);
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
    if (!content) {
      closeDialog();
      return;
    }
    setSubmitting(true);
    setError(null);
    setLoginRequired(false);
    try {
      const result = await postRating(myRating, content);
      if (result.loginRequired) {
        // 先存草稿再让人去登录，回来自动提交
        writeDraft(slug, myRating, content);
        setDraft({ rating: myRating, content, updatedAt: Date.now() });
        setLoginRequired(true);
        return;
      }
      if (!result.ok) {
        setError('提交失败，请稍后重试');
        return;
      }
      clearDraft(slug);
      setDraft(null);
      setSaved(true);
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
        {saved && hasRated && (
          <span className="block text-green-600 mt-1">{restored ? t('reviewRestored') : t('rateSuccess')}</span>
        )}
      </div>
      {myRating !== null && (
        <ReviewDialog
          open={dialogOpen}
          rating={myRating}
          submitting={submitting}
          loginRequired={loginRequired}
          error={error}
          initialContent={draft?.rating === myRating ? draft.content : ''}
          loginHref={`/sign-in?redirect=${encodeURIComponent(`/play/${slug}`)}`}
          onClose={closeDialog}
          onSubmit={handleSubmitReview}
        />
      )}
    </div>
  );
}
