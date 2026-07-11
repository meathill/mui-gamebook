'use client';

import { EyeIcon, EyeSlashIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useDialog } from '@/components/Dialog';

interface GameItem {
  id: number;
  slug: string;
  title: string;
  published: boolean;
  ownerEmail: string | null;
  createdAt: string | number;
  updatedAt: string | number;
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

export default function AdminGamesPage() {
  const queryClient = useQueryClient();
  const dialog = useDialog();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useQuery<GamesResponse>({
    queryKey: ['admin', 'games', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/games?${params}`);
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  async function handleDelete(game: GameItem) {
    const confirmed = await dialog.confirm(
      `确定要删除游戏「${game.title}」（${game.slug}）吗？剧本内容和统计数据将一并删除，此操作无法撤销。`,
    );
    if (!confirmed) return;
    deleteMutation.mutate(game.slug);
  }

  function formatDate(value: string | number): string {
    return new Date(value).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">游戏管理</h1>
        <p className="text-gray-500 mt-1">检查全站游戏，可打开编辑器修改、切换发布状态或删除</p>
      </header>

      {/* 搜索 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form
          onSubmit={handleSearch}
          className="flex gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索标题、slug 或作者邮箱..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            搜索
          </button>
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
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">游戏</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">作者</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">状态</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">更新时间</th>
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
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        game.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {game.published ? '已发布' : '未发布'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(game.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/my/edit/${game.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded"
                        title="打开编辑器">
                        <PencilIcon size={16} />
                      </Link>
                      <button
                        onClick={() => publishMutation.mutate({ slug: game.slug, published: !game.published })}
                        disabled={publishMutation.isPending}
                        className="p-2 text-gray-400 hover:text-amber-600 rounded disabled:opacity-50"
                        title={game.published ? '下架' : '发布'}>
                        {game.published ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
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

        {/* 分页 */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              共 {data.pagination.total} 个游戏，第 {data.pagination.page} / {data.pagination.totalPages} 页
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50">
                上一页
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50">
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
