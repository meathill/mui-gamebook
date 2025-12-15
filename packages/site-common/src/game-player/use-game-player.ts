'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PlayableGame, RuntimeState, SerializablePlayableGame } from '@mui-gamebook/parser/src/types';
import {
  isVariableMeta,
  extractRuntimeState,
  getVisibleVariables,
  fromSerializablePlayableGame,
} from '@mui-gamebook/parser/src/types';
import { evaluateCondition, executeSet, interpolateVariables } from '../utils/evaluator';

export interface GamePlayerState {
  game: PlayableGame;
  currentSceneId: string;
  runtimeState: RuntimeState;
  isLoaded: boolean;
  isGameStarted: boolean;
  visibleVariables: ReturnType<typeof getVisibleVariables>;
  currentScene: ReturnType<PlayableGame['scenes']['get']>;
  hasConfiguredChoices: boolean;
  showEndScreen: boolean;
}

export interface GamePlayerActions {
  handleStartGame: () => void;
  handleRestart: (noConfirm?: boolean) => void;
  handleChoice: (nextSceneId: string, setInstruction?: string) => void;
}

export interface UseGamePlayerOptions {
  storagePrefix?: string;
  confirmRestart?: () => Promise<boolean> | boolean;
}

/**
 * 游戏播放器逻辑 Hook
 * 提供游戏状态管理和操作方法，UI 由各站点自定义
 */
export function useGamePlayer(
  serializedGame: SerializablePlayableGame,
  slug: string,
  options: UseGamePlayerOptions = {},
): GamePlayerState & GamePlayerActions {
  const { storagePrefix = 'game', confirmRestart = () => confirm('确定要重新开始吗？') } = options;

  const game: PlayableGame = useMemo(() => fromSerializablePlayableGame(serializedGame), [serializedGame]);
  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => extractRuntimeState(game.initialState));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const visibleVariables = getVisibleVariables(game.initialState);
  const storageKey = `${storagePrefix}_${slug}`;

  // 检查变量触发器
  const checkTriggers = useCallback(
    (state: RuntimeState): string | null => {
      for (const [key, val] of Object.entries(game.initialState)) {
        if (isVariableMeta(val) && val.trigger) {
          const currentValue = state[key];
          const condition = `${currentValue} ${val.trigger.condition}`;
          if (evaluateCondition(condition, {})) {
            return val.trigger.scene;
          }
        }
      }
      return null;
    },
    [game.initialState],
  );

  // 从 localStorage 加载进度
  useEffect(() => {
    const savedProgress = localStorage.getItem(storageKey);
    if (savedProgress) {
      try {
        const { sceneId, state } = JSON.parse(savedProgress);
        if (game.scenes.has(sceneId)) {
          setCurrentSceneId(sceneId);
          setIsGameStarted(true);
        }
        setRuntimeState(state);
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    }
    setIsLoaded(true);
  }, [storageKey, game.scenes]);

  // 保存进度
  useEffect(() => {
    if (isLoaded && isGameStarted) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          sceneId: currentSceneId,
          state: runtimeState,
        }),
      );
    }
  }, [currentSceneId, runtimeState, storageKey, isLoaded, isGameStarted]);

  const handleStartGame = useCallback(() => {
    setIsGameStarted(true);
    if (!localStorage.getItem(storageKey)) {
      setCurrentSceneId(game.startSceneId || 'start');
      setRuntimeState(extractRuntimeState(game.initialState));
    }
  }, [storageKey, game.startSceneId, game.initialState]);

  const handleRestart = useCallback(
    async (noConfirm = false) => {
      const confirmed = noConfirm || (await confirmRestart());
      if (!confirmed) return;

      localStorage.removeItem(storageKey);
      setCurrentSceneId(game.startSceneId || 'start');
      setRuntimeState(extractRuntimeState(game.initialState));
      setIsGameStarted(false);
    },
    [storageKey, game.startSceneId, game.initialState, confirmRestart],
  );

  const handleChoice = useCallback(
    (nextSceneId: string, setInstruction?: string) => {
      let newState = runtimeState;
      if (setInstruction) {
        newState = executeSet(setInstruction, runtimeState);
        setRuntimeState(newState);
      }

      const triggerScene = checkTriggers(newState);
      if (triggerScene && game.scenes.has(triggerScene)) {
        setCurrentSceneId(triggerScene);
      } else {
        setCurrentSceneId(nextSceneId);
      }
    },
    [runtimeState, checkTriggers, game.scenes],
  );

  const currentScene = game.scenes.get(currentSceneId);
  const hasConfiguredChoices = currentScene?.nodes.some((node) => node.type === 'choice') ?? false;
  const showEndScreen = !hasConfiguredChoices;

  return {
    game,
    currentSceneId,
    runtimeState,
    isLoaded,
    isGameStarted,
    visibleVariables,
    currentScene,
    hasConfiguredChoices,
    showEndScreen,
    handleStartGame,
    handleRestart,
    handleChoice,
  };
}

export { evaluateCondition, executeSet, interpolateVariables };
