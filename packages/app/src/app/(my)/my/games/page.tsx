'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, PencilSimpleIcon, EyeIcon, LockIcon, GlobeIcon } from '@phosphor-icons/react';
import ImageIcon from 'next/image';
import Link from 'next/link';
import { useDialog } from '@/components/Dialog';

interface GameListItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImage?: string;
  published: boolean;
  updatedAt: string | number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json() as Promise<GameListItem[]>);

export default function GamesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const dialog = useDialog();

  // Use React Query to fetch games
  const {
    data: games,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['games'],
    queryFn: () => fetcher('/api/cms/games'),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch('/api/cms/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: (data) => {
      setNewTitle('');
      queryClient.invalidateQueries({ queryKey: ['games'] });
      router.push(`/my/edit/${data.id}?showImporter=true`);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cms/games/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(newTitle);
  }

  async function handleDelete(id: string) {
    const confirmed = await dialog.confirm('确定要删除吗？此操作无法撤销。');
    if (!confirmed) return;
    deleteMutation.mutate(id);
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">游戏管理</h1>
        <p className="text-gray-500 mt-1">创建和管理你的互动故事</p>
      </header>

      {/* Create New Game */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">创建新游戏</h2>
        <form
          onSubmit={handleCreate}
          className="flex gap-4">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="游戏标题（如：迷失之城）"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            required
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            <PlusIcon size={18} /> {createMutation.isPending ? '创建中...' : '创建'}
          </button>
        </form>
      </div>

      {/* Games ListIcon */}
      {error && <div className="text-red-500">加载游戏失败</div>}
      {isLoading && <div className="text-gray-500">加载游戏中...</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {games && games.length === 0 && (
          <p className="text-center text-gray-500 py-8 col-span-2">还没有游戏，在上方创建一个吧！</p>
        )}

        {games?.map((game) => (
          <div
            key={game.id}
            className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-2 rounded-full ${
                  game.published ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}>
                {game.published ? <GlobeIcon size={20} /> : <LockIcon size={20} />}
              </div>
              <div className="flex items-center gap-2 transition-opacity">
                <Link
                  href={`/play/${game.slug}`}
                  target="_blank"
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="预览">
                  <EyeIcon size={18} />
                </Link>
                <Link
                  href={`/my/edit/${game.id}`}
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title="编辑">
                  <PencilSimpleIcon size={18} />
                </Link>
                <button
                  onClick={() => handleDelete(game.id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                  title="删除">
                  <TrashIcon size={18} />
                </button>
              </div>
            </div>
            <div>
              {game.coverImage && (
                <ImageIcon
                  alt={game.title}
                  className="w-full object-cover rounded mb-4"
                  height={200}
                  src={game.coverImage}
                  width={400}
                />
              )}
              <h3 className="font-medium text-gray-900">{game.title}</h3>
              <p className="text-xs text-gray-500">
                /{game.slug} • 更新于：
                {new Date(game.updatedAt).toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
