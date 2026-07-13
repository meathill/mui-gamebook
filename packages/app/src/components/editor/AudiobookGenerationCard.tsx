'use client';

import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircleIcon, MusicNotesIcon, SpinnerIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react/dist/ssr';
import type { Game } from '@mui-gamebook/parser/src/types';

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
 * 一键生成有声书：逐场景调用 generate-scene 接口，前端驱动整体进度
 * （由这里的循环决定顺序/节奏，服务端只负责单个场景的分段+TTS）
 */
export default function AudiobookGenerationCard({ gameId, game }: AudiobookGenerationCardProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<SceneProgress[]>([]);
  const cancelledRef = useRef(false);

  const sceneIds = Object.keys(game.scenes);

  function handleOpenChange(nextOpen: boolean) {
    if (running) return; // 生成中不允许关闭，只能点"取消剩余"
    setOpen(nextOpen);
    if (!nextOpen) {
      setProgress([]);
    }
  }

  async function handleStart() {
    cancelledRef.current = false;
    setRunning(true);
    setProgress(sceneIds.map((sceneId) => ({ sceneId, status: 'pending' })));

    for (const sceneId of sceneIds) {
      if (cancelledRef.current) break;

      setProgress((prev) => prev.map((p) => (p.sceneId === sceneId ? { ...p, status: 'generating' } : p)));

      try {
        const res = await fetch(`/api/cms/games/${gameId}/audiobook/generate-scene`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

    setRunning(false);
  }

  function handleCancel() {
    cancelledRef.current = true;
  }

  const doneCount = progress.filter((p) => p.status === 'done').length;
  const errorCount = progress.filter((p) => p.status === 'error').length;

  return (
    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
      <h3 className="text-sm font-medium text-amber-900 mb-2 flex items-center gap-2">
        <MusicNotesIcon size={16} />
        有声书生成
      </h3>
      <p className="text-xs text-gray-600 mb-3">
        为全书每个场景分角色生成语音（旁白与角色对白使用不同音色），生成后可在游戏内自动播放。
      </p>

      <Dialog.Root
        open={open}
        onOpenChange={handleOpenChange}>
        <Dialog.Trigger asChild>
          <button className="w-full py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700 flex justify-center items-center gap-2">
            <MusicNotesIcon size={14} />
            一键生成有声书
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-lg shadow-xl z-50 max-h-[80vh] flex flex-col">
            <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">生成有声书</Dialog.Title>

            {progress.length === 0 && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  将为全书 {sceneIds.length} 个场景逐个生成语音，可能需要几分钟，过程中请不要关闭页面。
                </p>
                <div className="flex gap-3 justify-end">
                  <Dialog.Close asChild>
                    <button className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">取消</button>
                  </Dialog.Close>
                  <button
                    onClick={handleStart}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                    开始生成
                  </button>
                </div>
              </>
            )}

            {progress.length > 0 && (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  {`${running ? '生成中' : '已完成'}：${doneCount} / ${sceneIds.length} 个场景${
                    errorCount > 0 ? `，${errorCount} 个失败` : ''
                  }`}
                </p>

                <div className="flex-1 overflow-y-auto border border-gray-200 rounded-md divide-y">
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
                      <span className="font-mono text-xs text-gray-700 truncate">{p.sceneId}</span>
                      {p.error && <span className="text-xs text-red-600 truncate">{p.error}</span>}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-end mt-4">
                  {running ? (
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
                      取消剩余
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenChange(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                      关闭
                    </button>
                  )}
                </div>
              </>
            )}

            {!running && (
              <Dialog.Close asChild>
                <button
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  aria-label="关闭">
                  <XIcon size={20} />
                </button>
              </Dialog.Close>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
