'use client';

import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import { useGamePlayer } from '@mui-gamebook/site-common/game-player';
import type { GamePlayerState, GamePlayerActions } from '@mui-gamebook/site-common/game-player';

// 检查是否允许发送统计（基于 GDPR 同意）
function canSendAnalytics(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('analytics_consent') === 'accepted';
}

// 发送统计请求（忽略错误）
async function sendAnalytics(endpoint: string, data: Record<string, unknown>): Promise<void> {
  if (!canSendAnalytics()) return;

  try {
    await fetch(`/api/analytics/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

interface UseGameStateProps {
  game: PlayableGame;
  gameId: number;
  slug: string;
}

interface UseGameStateReturn extends GamePlayerState {
  handleStartGame: GamePlayerActions['handleStartGame'];
  handleRestart: GamePlayerActions['handleRestart'];
  handleChoice: (nextSceneId: string, choiceIndex: number, setInstruction?: string) => void;
  setImageLoading: GamePlayerActions['setImageLoading'];
  getSceneImage: GamePlayerActions['getSceneImage'];
  getSceneAudioUrl: GamePlayerActions['getSceneAudioUrl'];
  handleContinue: GamePlayerActions['handleContinue'];
}

/**
 * 游戏状态管理 Hook（简简站点）
 * 组合 site-common 的 useGamePlayer，接入本站的埋点上报。
 * storagePrefix 固定为 'jianjian_game' 以保持既有存档的 localStorage key 不变。
 */
export function useGameState({ game, gameId, slug }: UseGameStateProps): UseGameStateReturn {
  const gamePlayer = useGamePlayer(game, slug, {
    storagePrefix: 'jianjian_game',
    confirmRestart: () => confirm('确定要重新开始这个故事吗？🤔'),
    onGameStart: () => sendAnalytics('open', { gameId }),
    onSceneVisit: (sceneId) => sendAnalytics('scene', { gameId, sceneId }),
    onChoice: (sceneId, choiceIndex) => sendAnalytics('choice', { gameId, sceneId, choiceIndex }),
  });

  function handleChoice(nextSceneId: string, choiceIndex: number, setInstruction?: string) {
    gamePlayer.handleChoice(nextSceneId, setInstruction, choiceIndex);
  }

  return {
    ...gamePlayer,
    handleChoice,
  };
}
