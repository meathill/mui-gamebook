'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { RuntimeState } from '@mui-gamebook/parser/src/types';

interface MiniGameAPI {
  init(container: HTMLElement, variables: Record<string, number | string | boolean>): void;
  onComplete(callback: (variables: Record<string, number | string | boolean>) => void): void;
  destroy(): void;
}

interface MiniGamePlayerProps {
  url: string;
  variables: string[];
  runtimeState: RuntimeState;
  onComplete: (updatedVariables: Record<string, number | string | boolean>) => void;
}

export default function MiniGamePlayer({ url, variables, runtimeState, onComplete }: MiniGamePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<MiniGameAPI | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 提取小游戏需要的变量
  const getGameVariables = useCallback(() => {
    const gameVars: Record<string, number | string | boolean> = {};
    for (const varName of variables) {
      if (varName in runtimeState) {
        gameVars[varName] = runtimeState[varName];
      }
    }
    return gameVars;
  }, [variables, runtimeState]);

  // 加载并初始化小游戏
  const loadGame = useCallback(
    async (container: HTMLDivElement) => {
      if (!url) {
        setError('小游戏 URL 未配置');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 获取小游戏代码
        const response = await fetch(url, {
          mode: 'cors',
        });
        if (!response.ok) {
          throw new Error(`加载失败: ${response.status}`);
        }
        const code = await response.text();

        // 使用 Blob URL 创建可导入的模块
        const blob = new Blob([code], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        try {
          const gameModule = await import(/* webpackIgnore: true */ blobUrl);
          const game: MiniGameAPI = gameModule.default || gameModule;

          if (!game.init || !game.onComplete || !game.destroy) {
            throw new Error('小游戏模块缺少必要的接口（需要 init, onComplete, destroy）');
          }

          gameRef.current = game;

          // 注册完成回调
          game.onComplete((updatedVars) => {
            setIsPlaying(false);
            onComplete(updatedVars);
          });

          // 初始化游戏
          game.init(container, getGameVariables());
          setIsPlaying(true);
        } finally {
          // 清理 Blob URL
          URL.revokeObjectURL(blobUrl);
        }
      } catch (e) {
        console.error('加载小游戏失败:', e);
        setError((e as Error).message || '加载小游戏失败');
      } finally {
        setLoading(false);
      }
    },
    [url, getGameVariables, onComplete],
  );

  // 当容器出现且已开始时，加载游戏
  useEffect(() => {
    if (isStarted && containerRef.current && !isPlaying && !loading && !error) {
      loadGame(containerRef.current);
    }
  }, [isStarted, isPlaying, loading, error, loadGame]);

  // 清理游戏
  useEffect(() => {
    return () => {
      if (gameRef.current) {
        try {
          gameRef.current.destroy();
        } catch (e) {
          console.error('销毁小游戏失败:', e);
        }
        gameRef.current = null;
      }
    };
  }, []);

  const handleStart = () => {
    setIsStarted(true);
  };

  const handleRetry = () => {
    setError(null);
    if (containerRef.current) {
      loadGame(containerRef.current);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600 text-sm mb-2">小游戏加载失败</p>
        <p className="text-red-500 text-xs">{error}</p>
        <button
          onClick={handleRetry}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 text-sm">
          重试
        </button>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
        <p className="text-purple-700 mb-4">准备好开始小游戏了吗？</p>
        <button
          onClick={handleStart}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-medium shadow-md hover:shadow-lg transition-all">
          开始游戏
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2
              size={32}
              className="mx-auto text-purple-600 animate-spin"
            />
            <p className="text-gray-600 mt-2 text-sm">加载小游戏中...</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full min-h-[300px] bg-gray-900 rounded-lg overflow-hidden"
        style={{ aspectRatio: '16/9' }}
      />
    </div>
  );
}
