'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusIcon } from '@phosphor-icons/react';
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
      router.push(`/my/edit/${data.id}?showImporter=true`);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim()) {
      createMutation.mutate(title.trim());
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="violet">
          <PlusIcon size={12} />
          创建新游戏
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>创建新游戏</DialogTitle>
          <DialogDescription>创建后会进入编辑器，可以导入现有故事或从零开始。</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-2 pb-4">
            <Label htmlFor="game-title">游戏标题</Label>
            <Input
              id="game-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：迷失之城"
              autoFocus
              required
            />
          </div>

          <DialogFooter>
            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                variant="outline">
                取消
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}>
              {createMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
