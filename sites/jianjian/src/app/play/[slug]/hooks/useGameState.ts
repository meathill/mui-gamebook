'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PlayableGame, RuntimeState, PlayableSceneNode } from '@mui-gamebook/parser/src/types';
import { isVariableMeta, extractRuntimeState, getVisibleVariables } from '@mui-gamebook/parser/src/utils';
import { evaluateCondition, executeSet } from '../evaluator';

interface UseGameStateProps {
  game: PlayableGame;
  slug: string;
}

interface UseGameStateReturn {
  currentSceneId: string;
  currentScene: PlayableGame['scenes'][string] | undefined;
  runtimeState: RuntimeState;
  isLoaded: boolean;
  isGameStarted: boolean;
  currentImageUrl: string | undefined;
  imageLoading: boolean;
  visibleVariables: ReturnType<typeof getVisibleVariables>;
  setImageLoading: (loading: boolean) => void;
  handleStartGame: () => void;
  handleRestart: () => void;
  handleChoice: (nextSceneId: string, setInstruction?: string) => void;
  getSceneImage: (nodes: PlayableSceneNode[]) => string | undefined;
  getSceneAudioUrl: (nodes: PlayableSceneNode[]) => string | undefined;
}

/**
 * 游戏状态管理 Hook
 * 管理场景切换、变量更新、进度保存等逻辑
 */
export function useGameState({ game, slug }: UseGameStateProps): UseGameStateReturn {
  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => extractRuntimeState(game.initialState));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [imageLoading, setImageLoading] = useState(false);

  const visibleVariables = getVisibleVariables(game.initialState);

  // 从场景节点中提取第一张图片
  const getSceneImage = useCallback((nodes: PlayableSceneNode[]): string | undefined => {
    const imageNode = nodes.find((n) => n.type === 'static_image' || n.type === 'ai_image');
    if (imageNode && 'url' in imageNode && imageNode.url) {
      return imageNode.url;
    }
    return undefined;
  }, []);

  // 从场景节点中提取音频 URL
  const getSceneAudioUrl = useCallback((nodes: PlayableSceneNode[]): string | undefined => {
    const textNode = nodes.find((n) => n.type === 'text' && 'audio_url' in n && n.audio_url);
    if (textNode && 'audio_url' in textNode) {
      return textNode.audio_url as string;
    }
    return undefined;
  }, []);

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
    const savedProgress = localStorage.getItem(`jianjian_game_${slug}`);
    if (savedProgress) {
      try {
        const { sceneId, state, imageUrl } = JSON.parse(savedProgress);
        if (game.scenes[sceneId]) {
          setCurrentSceneId(sceneId);
          setIsGameStarted(true);
        }
        setRuntimeState(state);
        if (imageUrl) setCurrentImageUrl(imageUrl);
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    } else {
      const startScene = game.scenes[game.startSceneId || 'start'];
      if (startScene) {
        const firstImage = getSceneImage(startScene.nodes);
        if (firstImage) setCurrentImageUrl(firstImage);
      }
    }
    setIsLoaded(true);
  }, [slug, game.scenes, game.startSceneId, getSceneImage]);

  const currentScene = game.scenes[currentSceneId];

  // 场景切换时更新图片
  useEffect(() => {
    if (isGameStarted && currentScene) {
      const newImageUrl = getSceneImage(currentScene.nodes);
      if (newImageUrl && newImageUrl !== currentImageUrl) {
        setImageLoading(true);
        setCurrentImageUrl(newImageUrl);
      }
    }
  }, [currentSceneId, currentScene, currentImageUrl, isGameStarted, getSceneImage]);

  // 保存进度
  useEffect(() => {
    if (isLoaded && isGameStarted) {
      localStorage.setItem(
        `jianjian_game_${slug}`,
        JSON.stringify({
          sceneId: currentSceneId,
          state: runtimeState,
          imageUrl: currentImageUrl,
        }),
      );
    }
  }, [currentSceneId, runtimeState, slug, isLoaded, isGameStarted, currentImageUrl]);

  function handleStartGame() {
    setIsGameStarted(true);
    if (!localStorage.getItem(`jianjian_game_${slug}`)) {
      setCurrentSceneId(game.startSceneId || 'start');
      setRuntimeState(extractRuntimeState(game.initialState));
    }
  }

  function handleRestart() {
    if (!confirm('确定要重新开始这个故事吗？🤔')) return;
    localStorage.removeItem(`jianjian_game_${slug}`);
    setCurrentSceneId(game.startSceneId || 'start');
    setRuntimeState(extractRuntimeState(game.initialState));
    setCurrentImageUrl(undefined);
    setIsGameStarted(false);

    const startScene = game.scenes[game.startSceneId || 'start'];
    if (startScene) {
      const firstImage = getSceneImage(startScene.nodes);
      if (firstImage) setCurrentImageUrl(firstImage);
    }
  }

  function handleChoice(nextSceneId: string, setInstruction?: string) {
    let newState = runtimeState;
    if (setInstruction) {
      newState = executeSet(setInstruction, runtimeState);
      setRuntimeState(newState);
    }

    const triggerScene = checkTriggers(newState);
    if (triggerScene && game.scenes[triggerScene]) {
      setCurrentSceneId(triggerScene);
    } else {
      setCurrentSceneId(nextSceneId);
    }
  }

  return {
    currentSceneId,
    currentScene,
    runtimeState,
    isLoaded,
    isGameStarted,
    currentImageUrl,
    imageLoading,
    visibleVariables,
    setImageLoading,
    handleStartGame,
    handleRestart,
    handleChoice,
    getSceneImage,
    getSceneAudioUrl,
  };
}
