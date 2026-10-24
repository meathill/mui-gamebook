'use client';

import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  MusicNotesIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react/dist/ssr';
import type { Game } from '@roudanio/parser/src/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getGameSessionHeaders } from '@/lib/editor/game-session';

interface AudiobookGenerationCardProps {
  gameId: string;
  game: Game;
}

type SceneStatus = 'pending' | 'generating' | 'done' | 'error';

interface SceneProgress {
  sceneId: string;
  status: SceneStatus;
  error?: string;
}

/**
 * 一键生成有声书：逐场景调用 generate-scene 接口，前端驱动整体进度。
 * 打开弹窗时先查询哪些场景已经生成过（增量生成/断点续跑：已生成的默认跳过），
 * 每一行也有单独的"重新生成"按钮，可以只重跑某一个场景。
 */
export default function AudiobookGenerationCard({ gameId, game }: AudiobookGenerationCardProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState<SceneProgress[]>([]);
  const cancelledRef = useRef(false);

  const sceneIds = Object.keys(game.scenes);
  const busy = running || progress.some((p) => p.status === 'generating');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setChecking(true);
    setProgress(sceneIds.map((sceneId) => ({ sceneId, status: 'pending' })));

    fetch(`/api/cms/games/${gameId}/audiobook/status`)
      .then((res) => (res.ok ? res.json() : Promise.resolve({ generatedSceneIds: [] })))
      .then((data) => {
        if (cancelled) return;
        const generatedSceneIds = (data as { generatedSceneIds?: string[] }).generatedSceneIds ?? [];
        const doneSet = new Set(generatedSceneIds);
        setProgress(sceneIds.map((sceneId) => ({ sceneId, status: doneSet.has(sceneId) ? 'done' : 'pending' })));
      })
      .catch(() => {
        // 查询失败就当作都还没生成，退化成从头生成，不阻塞使用
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gameId]);

  function handleOpenChange(nextOpen: boolean) {
    if (busy) return; // 生成中（批量或单场景）不允许关闭
    setOpen(nextOpen);
    if (!nextOpen) {
      setProgress([]);
    }
  }

  async function generateOne(sceneId: string) {
    setProgress((prev) =>
      prev.map((p) => (p.sceneId === sceneId ? { ...p, status: 'generating', error: undefined } : p)),
    );
    try {
      const res = await fetch(`/api/cms/games/${gameId}/audiobook/generate-scene`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getGameSessionHeaders(gameId),
        },
        body: JSON.stringify({ sceneId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `生成失败（${res.status}）`);
      }
      setProgress((prev) => prev.map((p) => (p.sceneId === sceneId ? { ...p, status: 'done' } : p)));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setProgress((prev) => prev.map((p) => (p.sceneId === sceneId ? { ...p, status: 'error', error: message } : p)));
    }
  }

  async function handleStart() {
    cancelledRef.current = false;
    setRunning(true);
    const doneIds = new Set(progress.filter((p) => p.status === 'done').map((p) => p.sceneId));

    for (const sceneId of sceneIds) {
      if (cancelledRef.current) break;
      if (doneIds.has(sceneId)) continue; // 增量生成：跳过已经生成过的场景，只处理剩余/失败的

      await generateOne(sceneId);
    }

    setRunning(false);
  }

  function handleCancel() {
    cancelledRef.current = true;
  }

  const doneCount = progress.filter((p) => p.status === 'done').length;
  const errorCount = progress.filter((p) => p.status === 'error').length;
  const remainingCount = sceneIds.length - doneCount;

  return (
    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
      <h3 className="text-sm font-medium text-amber-900 mb-2 flex items-center gap-2">
        <MusicNotesIcon size={16} />
        有声书生成
      </h3>
      <p className="text-xs text-gray-600 mb-3">
        为全书每个场景分角色生成语音（旁白与角色对白使用不同音色），生成后可在游戏内自动播放。
      </p>

      <Dialog
        open={open}
        onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <button className="w-full py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700 flex justify-center items-center gap-2">
            <MusicNotesIcon size={14} />
            一键生成有声书
          </button>
        </DialogTrigger>

        {/* 生成过程中不允许关闭，取消走「取消剩余」；关闭走底部按钮 */}
        <DialogContent
          showCloseButton={false}
          className="max-w-lg">
          <DialogHeader>
            <DialogTitle>生成有声书</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground text-sm">
            {checking
              ? '正在检查已生成的场景...'
              : `${running ? '生成中' : '当前'}：${doneCount} / ${sceneIds.length} 个场景已生成${
                  errorCount > 0 ? `，${errorCount} 个失败` : ''
                }`}
          </p>

          <div className="min-h-0 flex-1 overflow-y-auto border rounded-md divide-y">
            {progress.map((p) => (
              <div
                key={p.sceneId}
                className="flex items-center gap-2 px-3 py-2 text-sm">
                {p.status === 'pending' && <span className="w-4 h-4 rounded-full bg-gray-200 shrink-0" />}
                {p.status === 'generating' && (
                  <SpinnerIcon
                    size={16}
                    className="animate-spin text-amber-600 shrink-0"
                  />
                )}
                {p.status === 'done' && (
                  <CheckCircleIcon
                    size={16}
                    className="text-green-600 shrink-0"
                  />
                )}
                {p.status === 'error' && (
                  <WarningCircleIcon
                    size={16}
                    className="text-red-600 shrink-0"
                  />
                )}
                <span className="font-mono text-xs text-gray-700 truncate flex-1">{p.sceneId}</span>
                {p.error && <span className="text-xs text-red-600 truncate">{p.error}</span>}
                {!busy && (
                  <button
                    onClick={() => generateOne(p.sceneId)}
                    title="重新生成这个场景"
                    aria-label={`重新生成场景 ${p.sceneId}`}
                    className="text-gray-400 hover:text-amber-600 shrink-0">
                    <ArrowClockwiseIcon size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            {running ? (
              <Button
                variant="ghost"
                onClick={handleCancel}>
                取消剩余
              </Button>
            ) : (
              <>
                <DialogPrimitive.Close asChild>
                  <Button
                    variant="outline"
                    disabled={busy}>
                    关闭
                  </Button>
                </DialogPrimitive.Close>
                <Button
                  onClick={handleStart}
                  disabled={busy || checking || remainingCount === 0}>
                  {doneCount > 0 ? `继续生成剩余 ${remainingCount} 个` : '开始生成'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
