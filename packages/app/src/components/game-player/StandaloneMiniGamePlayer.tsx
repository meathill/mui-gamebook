'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Loader2, RefreshCwIcon, CheckCircleIcon } from 'lucide-react';

interface MiniGameAPI {
  init(container: HTMLElement, variables: Record<string, number | string | boolean>): void;
  onComplete(callback: (variables: Record<string, number | string | boolean>) => void): void;
  destroy(): void;
}

interface StandaloneMiniGamePlayerProps {
  code: string;
}

export default function StandaloneMiniGamePlayer({ code }: StandaloneMiniGamePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<MiniGameAPI | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<Record<string, number | string | boolean> | null>(null);

  // 加载并初始化小游戏
  const loadGame = useCallback(
    async (container: HTMLDivElement) => {
      if (!code) {
        setError('小游戏代码未配置');
        return;
      }

      setLoading(true);
      setError(null);
      setIsCompleted(false);
      setResult(null);

      try {
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
            setIsCompleted(true);
            setResult(updatedVars);
          });

          // 初始化游戏（独立模式无变量）
          game.init(container, {});
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
    [code],
  );

  // 当容器出现且已开始时，加载游戏
  useEffect(() => {
    if (isStarted && containerRef.current && !isPlaying && !loading && !error && !isCompleted) {
      loadGame(containerRef.current);
    }
  }, [isStarted, isPlaying, loading, error, isCompleted, loadGame]);

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
    setIsCompleted(false);
    if (containerRef.current) {
      loadGame(containerRef.current);
    }
  };

  const handleReplay = () => {
    // 销毁旧游戏
    if (gameRef.current) {
      try {
        gameRef.current.destroy();
      } catch (e) {
        console.error('销毁小游戏失败:', e);
      }
      gameRef.current = null;
    }
    setIsCompleted(false);
    setResult(null);
    if (containerRef.current) {
      loadGame(containerRef.current);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 font-medium mb-2">小游戏加载失败</p>
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 text-sm font-medium">
          <RefreshCwIcon className="w-4 h-4" />
          重试
        </button>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-8 text-center">
        <p className="text-orange-700 mb-4 font-medium">准备好开始小游戏了吗？</p>
        <button
          onClick={handleStart}
          className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 font-semibold shadow-md hover:shadow-lg transition-all">
          开始游戏
        </button>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-8 text-center">
        <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <p className="text-green-700 font-semibold text-lg mb-2">游戏完成！</p>
        {result && Object.keys(result).length > 0 && (
          <div className="text-sm text-green-600 mb-4">
            {Object.entries(result).map(([key, value]) => (
              <p key={key}>
                {key}: {String(value)}
              </p>
            ))}
          </div>
        )}
        <button
          onClick={handleReplay}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-500 font-medium">
          <RefreshCwIcon className="w-4 h-4" />
          再玩一次
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
              className="mx-auto text-orange-500 animate-spin"
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
