'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StarIcon, EyeIcon, EyeSlashIcon, PushPinIcon } from '@phosphor-icons/react';
import { formatDate } from '@mui-gamebook/site-common/utils';

interface ManagedRating {
  id: number;
  rating: number;
  content: string | null;
  hidden: boolean;
  pinned: boolean;
  userName: string | null;
  createdAt: string | number;
}

interface RatingsResponse {
  game: { id: number; slug: string; title: string };
  avg: number;
  count: number;
  ratings: ManagedRating[];
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarIcon
          key={s}
          size={14}
          weight={s <= value ? 'fill' : 'regular'}
          className={s <= value ? 'text-amber-400' : 'text-gray-300'}
        />
      ))}
    </span>
  );
}

export default function GameRatingsPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<RatingsResponse>({
    queryKey: ['cms', 'ratings', gameId],
    queryFn: async () => {
      const res = await fetch(`/api/cms/games/${gameId}/ratings`);
      if (!res.ok) throw new Error('Failed to fetch ratings');
      return res.json() as Promise<RatingsResponse>;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      ratingId,
      updates,
    }: {
      ratingId: number;
      updates: { hidden?: boolean; pinned?: boolean };
    }) => {
      const res = await fetch(`/api/cms/games/${gameId}/ratings/${ratingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update rating');
    },
    onMutate: ({ ratingId }) => setUpdatingId(ratingId),
    onSettled: () => {
      setUpdatingId(null);
      queryClient.invalidateQueries({ queryKey: ['cms', 'ratings', gameId] });
    },
  });

  if (isLoading) return <div className="text-gray-500">加载评价中...</div>;
  if (error || !data) return <div className="bg-red-50 text-red-600 p-4 rounded-lg">加载评价失败，请稍后重试。</div>;

  return (
    <div>
      <header className="mb-8">
        <Link
          href="/my/games"
          prefetch={false}
          className="text-sm text-blue-600 hover:underline">
          ← 游戏管理
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">「{data.game.title}」的评价</h1>
        <p className="text-gray-500 mt-1">
          {data.count > 0 ? (
            <>
              平均 {data.avg.toFixed(1)} 分 · {data.count} 条计入评分
            </>
          ) : (
            '还没有收到评价'
          )}
        </p>
      </header>

      {data.ratings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          还没有人打分。把游戏分享出去，通关后会邀请玩家打分。
        </div>
      ) : (
        <div className="space-y-3">
          {data.ratings.map((r) => (
            <div
              key={r.id}
              className={`bg-white rounded-lg shadow p-4 ${r.hidden ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <Stars value={r.rating} />
                <span className="text-sm text-gray-500">{r.userName ?? '匿名玩家'}</span>
                <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                {r.pinned && (
                  <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                    置顶
                  </span>
                )}
                {r.hidden && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">已隐藏</span>}
                <span className="ms-auto flex items-center gap-2">
                  <button
                    type="button"
                    disabled={updatingId === r.id}
                    onClick={() => updateMutation.mutate({ ratingId: r.id, updates: { pinned: !r.pinned } })}
                    title={r.pinned ? '取消置顶' : '置顶'}
                    className={`p-1.5 rounded hover:bg-amber-50 ${r.pinned ? 'text-amber-600' : 'text-gray-400 hover:text-amber-600'} disabled:opacity-50`}>
                    <PushPinIcon size={17} />
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === r.id}
                    onClick={() => updateMutation.mutate({ ratingId: r.id, updates: { hidden: !r.hidden } })}
                    title={r.hidden ? '显示' : '隐藏'}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                    {r.hidden ? <EyeIcon size={17} /> : <EyeSlashIcon size={17} />}
                  </button>
                </span>
              </div>
              {r.content && (
                <p className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{r.content}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
