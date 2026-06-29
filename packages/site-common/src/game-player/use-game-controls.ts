'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface GameControlsState {
  isAutoPlaying: boolean;
  isSkipping: boolean;
}

export interface GameControlsActions {
  toggleAutoPlay(): void;
  toggleSkip(): void;
  stopAll(): void;
}

export interface UseGameControlsOptions {
  /** 自动播放间隔（毫秒），默认 3000 */
  autoPlayInterval?: number;
  /** 自动前进时的回调 */
  onAutoAdvance?: () => void;
}

/**
 * 游戏控制 Hook
 * 提供自动播放和跳过（快进）功能
 */
export function useGameControls(options: UseGameControlsOptions = {}): GameControlsState & GameControlsActions {
  const { autoPlayInterval = 3000, onAutoAdvance } = options;
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAutoAdvanceRef = useRef(onAutoAdvance);
  onAutoAdvanceRef.current = onAutoAdvance;

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 自动播放定时器管理
  useEffect(() => {
    if (isAutoPlaying && onAutoAdvanceRef.current) {
      timerRef.current = setInterval(() => {
        onAutoAdvanceRef.current?.();
      }, autoPlayInterval);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAutoPlaying, autoPlayInterval]);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying((prev) => {
      if (!prev) setIsSkipping(false);
      return !prev;
    });
  }, []);

  const toggleSkip = useCallback(() => {
    setIsSkipping((prev) => {
      if (!prev) setIsAutoPlaying(false);
      return !prev;
    });
  }, []);

  const stopAll = useCallback(() => {
    setIsAutoPlaying(false);
    setIsSkipping(false);
  }, []);

  return {
    isAutoPlaying,
    isSkipping,
    toggleAutoPlay,
    toggleSkip,
    stopAll,
  };
}
