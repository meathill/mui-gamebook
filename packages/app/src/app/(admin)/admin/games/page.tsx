'use client';

import { EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, PencilIcon, ProhibitIcon, TrashIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import PaginationBar from '@/components/admin/PaginationBar';
import SortableHeader from '@/components/admin/SortableHeader';
import { useDialog } from '@/components/Dialog';
import { useListQuery } from '@/hooks/useListQuery';
import { formatDateTime as formatDate } from '@mui-gamebook/site-common/utils';

interface GameItem {
  id: number;
  slug: string;
  title: string;
  published: boolean;
  shadowBanned: boolean;
  ownerEmail: string | null;
  createdAt: string | number;
  updatedAt: string | number;
  openCount: number;
}

interface GamesResponse {
  games: GameItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '未发布' },
  { value: 'banned', label: '已封禁' },
] as const;

export default function AdminGamesPage() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const list = useListQuery({ defaultSort: 'updatedAt', defaultOrder: 'desc', defaultFilters: { status: 'all' } });

  const { data, isLoading } = useQuery<GamesResponse>({
    queryKey: ['admin', 'games', list.queryKey],
    queryFn: async () => {
      const res = await fetch(`/api/admin/games?${list.buildSearchParams()}`);
      if (!res.ok) throw new Error('获取游戏列表失败');
      return res.json();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ slug, published }: { slug: string; published: boolean }) => {
      const res = await fetch(`/api/admin/games/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || '操作失败');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'games'] });
    },
    onError: (e) => {
      dialog.error((e as Error).message);
    },
  });

  const shadowBanMutation = useMutation({
    mutationFn: async ({ slug, shadowBanned }: { slug: string; shadowBanned: boolean }) => {
      const res = await fetch(`/api/admin/games/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shadowBanned }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || '操作失败');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'games'] });
    },
    onError: (e) => {
      dialog.error((e as Error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/admin/games/${slug}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || '删除失败');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'games'] });
    },
    onError: (e) => {
      dialog.error((e as Error).message);
    },
  });

  async function handleDelete(game: GameItem) {
    const confirmed = await dialog.confirm(
      `确定要删除游戏「${game.title}」（${game.slug}）吗？剧本内容和统计数据将一并删除，此操作无法撤销。`,
    );
    if (!confirmed) return;
    deleteMutation.mutate(game.slug);
  }

  async function handleShadowBan(game: GameItem) {
    const next = !game.shadowBanned;
    const message = next
      ? `确定要封禁「${game.title}」吗？封禁后作品会从目录、首页、标签页和站点地图中消失，只有作者和管理员能通过预览看到它。`
      : `确定要解封「${game.title}」吗？解封后作品会重新出现在公开列表中。`;
    const confirmed = await dialog.confirm(message);
    if (!confirmed) return;
    shadowBanMutation.mutate({ slug: game.slug, shadowBanned: next });
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">游戏管理</h1>
        <p className="text-gray-500 mt-1">检查全站游戏，可打开编辑器修改、切换发布状态、封禁或删除</p>
      </header>

      {/* 搜索与筛选 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form
          onSubmit={list.handleSearch}
          className="flex gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={list.searchInput}
              onChange={(e) => list.setSearchInput(e.target.value)}
              placeholder="搜索标题、slug 或作者邮箱..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={list.filters.status ?? 'all'}
            onChange={(e) => list.setFilter('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
            {STATUS_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            搜索
          </button>
          {list.search && (
            <button
              type="button"
              onClick={list.handleClearSearch}
              className="px-3 py-2 text-gray-500 hover:text-gray-700">
              清除
            </button>
          )}
        </form>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : !data?.games.length ? (
          <div className="p-8 text-center text-gray-500">没有找到游戏</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <SortableHeader
                  label="游戏"
                  sortKey="title"
                  activeSort={list.sort}
                  order={list.order}
                  onSort={list.toggleSort}
                />
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">作者</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">状态</th>
                <SortableHeader
                  label="更新时间"
                  sortKey="updatedAt"
                  activeSort={list.sort}
                  order={list.order}
                  onSort={list.toggleSort}
                />
                <SortableHeader
                  label="打开数"
                  sortKey="openCount"
                  activeSort={list.sort}
                  order={list.order}
                  onSort={list.toggleSort}
                  align="right"
                />
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.games.map((game) => (
                <tr
                  key={game.id}
                  className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{game.title}</p>
                    <p className="text-xs text-gray-400">{game.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{game.ownerEmail || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                          game.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {game.published ? '已发布' : '未发布'}
                      </span>
                      {game.shadowBanned && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                          已封禁
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(game.updatedAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{game.openCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/my/edit/${game.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded"
                        title="打开编辑器">
                        <PencilIcon size={16} />
                      </Link>
                      <Link
                        href={`/preview/${game.slug}`}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded"
                        title="预览（以作者视角）">
                        <EyeIcon size={16} />
                      </Link>
                      <button
                        onClick={() => publishMutation.mutate({ slug: game.slug, published: !game.published })}
                        disabled={publishMutation.isPending}
                        className="p-2 text-gray-400 hover:text-amber-600 rounded disabled:opacity-50"
                        title={game.published ? '下架' : '发布'}>
                        {game.published ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
                      </button>
                      <button
                        onClick={() => handleShadowBan(game)}
                        disabled={shadowBanMutation.isPending}
                        className={`p-2 rounded disabled:opacity-50 ${
                          game.shadowBanned ? 'text-red-600 hover:text-red-700' : 'text-gray-400 hover:text-red-600'
                        }`}
                        title={game.shadowBanned ? '解封' : '封禁（从公开列表移除，作者仍可预览）'}>
                        <ProhibitIcon size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(game)}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                        title="删除">
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {data && (
          <PaginationBar
            page={data.pagination.page}
            total={data.pagination.total}
            totalPages={data.pagination.totalPages}
            unit="个游戏"
            onPageChange={list.setPage}
          />
        )}
      </div>
    </div>
  );
}
