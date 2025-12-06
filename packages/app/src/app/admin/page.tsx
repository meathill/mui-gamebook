'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Eye, Lock, Globe } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useDialog } from '@/components/Dialog';

interface GameListItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  cover_image?: string;
  published: boolean;
  updatedAt: string | number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json() as Promise<GameListItem[]>);

export default function AdminPage() {
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const dialog = useDialog();

  // Use React Query to fetch games
  const { data: games, isLoading, error } = useQuery({
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
      // 创建成功后立刻跳转到编辑页面，并带上 showImporter 参数
      router.push(`/admin/edit/${data.id}?showImporter=true`);
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

  if (isAuthPending) return <div className="p-8 text-center">加载中...</div>;

  if (!session) {
    router.push('/sign-in');
    return null;
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newTitle);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await dialog.confirm('确定要删除吗？此操作无法撤销。');
    if (!confirmed) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的游戏</h1>
            <p className="text-gray-500 mt-1">管理你的互动故事</p>
          </div>
          <div className="text-sm text-gray-600">
            {session.user.email}
          </div>
        </header>

        {/* Create New Game */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-semibold mb-4">创建新游戏</h2>
          <form onSubmit={handleCreate} className="flex gap-4">
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
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={18} /> {createMutation.isPending ? '创建中...' : '创建'}
            </button>
          </form>
        </div>

        {/* Games List */}
        {error && <div className="text-red-500">加载游戏失败</div>}
        {isLoading && <div className="text-gray-500">加载游戏中...</div>}

        <div className="grid md:grid-cols-2 gap-4">
          {games && games.length === 0 && (
            <p className="text-center text-gray-500 py-8">还没有游戏，在上方创建一个吧！</p>
          )}

          {games?.map((game) => (
            <div key={game.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-full ${game.published ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                  {game.published ? <Globe size={20} /> : <Lock size={20} />}
                </div>
                <div className="flex items-center gap-2 transition-opacity">
                  <Link
                    href={`/play/${game.slug}`}
                    target="_blank"
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="预览"
                  >
                    <Eye size={18} />
                  </Link>
                  <Link
                    href={`/admin/edit/${game.id}`}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                    title="编辑"
                  >
                    <Edit size={18} />
                  </Link>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div>
                {game.cover_image && <Image
                  alt={game.title}
                  className="w-full object-cover rounded mb-4"
                  height={200}
                  src={game.cover_image}
                  width={400}
                />}
                <h3 className="font-medium text-gray-900">{game.title}</h3>
                <p className="text-xs text-gray-500">/{game.slug} • 更新于：{new Date(game.updatedAt).toLocaleDateString('zh-CN')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
