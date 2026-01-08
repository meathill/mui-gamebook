import { useCallback } from 'react';

/**
 * Game Analytics Hook
 * 用于发送游戏统计数据到后端 API
 */
export function useGameAnalytics() {
  /**
   * 记录游戏打开/访问
   */
  const trackOpen = useCallback(async (gameId: number) => {
    try {
      await fetch('/api/analytics/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
    } catch (error) {
      console.error('Failed to track open:', error);
    }
  }, []);

  /**
   * 记录场景访问
   */
  const trackScene = useCallback(async (gameId: number, sceneId: string) => {
    try {
      await fetch('/api/analytics/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, sceneId }),
      });
    } catch (error) {
      console.error('Failed to track scene:', error);
    }
  }, []);

  /**
   * 记录选项点击
   */
  const trackChoice = useCallback(async (gameId: number, sceneId: string, choiceIndex: number) => {
    try {
      await fetch('/api/analytics/choice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, sceneId, choiceIndex }),
      });
    } catch (error) {
      console.error('Failed to track choice:', error);
    }
  }, []);

  /**
   * 记录游戏完成
   */
  const trackComplete = useCallback(async (gameId: number) => {
    try {
      await fetch('/api/analytics/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
    } catch (error) {
      console.error('Failed to track completion:', error);
    }
  }, []);

  return {
    trackOpen,
    trackScene,
    trackChoice,
    trackComplete,
  };
}
