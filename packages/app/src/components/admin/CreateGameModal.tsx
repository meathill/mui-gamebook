'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function CreateGameModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const createMutation = useMutation({
    mutationFn: async (gameTitle: string) => {
      const res = await fetch('/api/cms/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: gameTitle }),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: (data) => {
      setTitle('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['games'] });
      router.push(`/admin/edit/${data.id}?showImporter=true`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim()) {
      createMutation.mutate(title.trim());
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <Plus size={18} />
          创建新游戏
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md shadow-xl z-50">
          <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">创建新游戏</Dialog.Title>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="game-title"
                className="block text-sm font-medium text-gray-700 mb-2">
                游戏标题
              </label>
              <input
                id="game-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="如：迷失之城"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
                required
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
                  取消
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={createMutation.isPending || !title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {createMutation.isPending ? '创建中...' : '创建'}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="关闭">
              <X size={20} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
