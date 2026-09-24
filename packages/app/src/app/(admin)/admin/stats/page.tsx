'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TrendUpIcon, UsersIcon, StarIcon, GameControllerIcon } from '@phosphor-icons/react';
import PaginationBar from '@/components/admin/PaginationBar';
import SortableHeader from '@/components/admin/SortableHeader';
import type { SortOrder } from '@/lib/list-query';

interface GameAnalytics {
  id: number;
  slug: string;
  title: string;
  openCount: number;
  completionCount: number;
  completionRate: number;
  avgDuration: number;
  avgRating: number;
  ratingCount: number;
}

interface AnalyticsResponse {
  analytics: GameAnalytics[];
  summary: {
    totalOpens: number;
    totalCompletions: number;
    overallCompletionRate: string;
    avgRating: string;
    totalRatings: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}小时${remainingMinutes}分钟`;
}

export default function GlobalStatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  // 排序状态放在 URL 上，刷新/分享链接后保持一致
  const sort = searchParams.get('sort') || 'openCount';
  const order: SortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

  const { data, isLoading, error } = useQuery<AnalyticsResponse>({
    queryKey: ['admin', 'stats', page, limit, sort, order],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), sort, order });
      const res = await fetch(`/api/admin/stats?${params}`);
      if (!res.ok) {
        if (res.status === 403) throw new Error('Permission denied');
        throw new Error('Failed to fetch stats');
      }
      return res.json();
    },
  });

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  /** 同列再点切换升降序，换列回到该列默认方向 */
  function handleSort(nextSort: string) {
    const params = new URLSearchParams(searchParams);
    const nextOrder = sort === nextSort && order === 'desc' ? 'asc' : 'desc';
    params.set('sort', nextSort);
    params.set('order', nextOrder);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载全站统计数据中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        {error instanceof Error && error.message === 'Permission denied'
          ? '您没有权限查看此页面。'
          : '加载统计数据失败，请稍后重试。'}
      </div>
    );
  }

  const { analytics, summary, pagination } = data!;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">全站数据统计</h1>
        <p className="text-gray-500 mt-1">查看所有游戏的运营数据概览（管理员可见）</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="总打开数"
          value={summary.totalOpens.toLocaleString()}
          icon={
            <TrendUpIcon
              size={24}
              className="text-blue-600"
            />
          }
          color="bg-blue-100"
        />
        <StatCard
          title="总完成数"
          value={summary.totalCompletions.toLocaleString()}
          icon={
            <UsersIcon
              size={24}
              className="text-green-600"
            />
          }
          color="bg-green-100"
        />
        <StatCard
          title="整体完成率"
          value={`${summary.overallCompletionRate}%`}
          icon={
            <GameControllerIcon
              size={24}
              className="text-purple-600"
            />
          }
          color="bg-purple-100"
        />
        <StatCard
          title="平均评分"
          value={summary.totalRatings > 0 ? `${summary.avgRating} ⭐` : '暂无'}
          icon={
            <StarIcon
              size={24}
              className="text-yellow-600"
            />
          }
          color="bg-yellow-100"
        />
      </div>

      {/* Games Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">游戏统计列表</h2>
          <div className="text-sm text-gray-500">
            共 {pagination.total} 个游戏，第 {pagination.page} / {pagination.totalPages} 页
          </div>
        </div>

        {analytics.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader
                    label="游戏"
                    sortKey="title"
                    activeSort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="打开数"
                    sortKey="openCount"
                    activeSort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="完成数"
                    sortKey="completionCount"
                    activeSort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    完成率
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    平均时长
                  </th>
                  <SortableHeader
                    label="评分"
                    sortKey="avgRating"
                    activeSort={sort}
                    order={order}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.map((game) => (
                  <tr
                    key={game.id}
                    className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{game.title}</div>
                          <div className="text-sm text-gray-500">/{game.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {game.openCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {game.completionCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span
                        className={`${
                          game.completionRate >= 50
                            ? 'text-green-600'
                            : game.completionRate >= 20
                              ? 'text-yellow-600'
                              : 'text-gray-500'
                        }`}>
                        {game.completionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {game.avgDuration > 0 ? formatDuration(game.avgDuration) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {game.ratingCount > 0 ? (
                        <span>
                          {game.avgRating.toFixed(1)} ⭐<span className="text-gray-400 ml-1">({game.ratingCount})</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PaginationBar
          page={pagination.page}
          total={pagination.total}
          totalPages={pagination.totalPages}
          unit="个游戏"
          onPageChange={(updater) => handlePageChange(updater(pagination.page))}
        />
      </div>
    </div>
  );
}
