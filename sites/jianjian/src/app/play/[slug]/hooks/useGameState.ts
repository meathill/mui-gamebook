'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlayableGame, RuntimeState, PlayableSceneNode } from '@mui-gamebook/parser/src/types';
import { isVariableMeta, extractRuntimeState, getVisibleVariables } from '@mui-gamebook/parser/src/utils';
import { evaluateCondition, executeSet } from '../evaluator';

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

interface UseGameStateReturn {
  currentSceneId: string;
  currentScene: PlayableGame['scenes'][string] | undefined;
  runtimeState: RuntimeState;
  isLoaded: boolean;
  isGameStarted: boolean;
  currentImageUrl: string | undefined;
  imageLoading: boolean;
  visibleVariables: ReturnType<typeof getVisibleVariables>;
  gameStartTime: number | null;
  setImageLoading: (loading: boolean) => void;
  handleStartGame: () => void;
  handleRestart: () => void;
  handleChoice: (nextSceneId: string, choiceIndex: number, setInstruction?: string) => void;
  getSceneImage: (nodes: PlayableSceneNode[]) => string | undefined;
  getSceneAudioUrl: (nodes: PlayableSceneNode[]) => string | undefined;
}

/**
 * 游戏状态管理 Hook
 * 管理场景切换、变量更新、进度保存和统计等逻辑
 */
export function useGameState({ game, gameId, slug }: UseGameStateProps): UseGameStateReturn {
  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => extractRuntimeState(game.initialState));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [imageLoading, setImageLoading] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);

  // 已记录的场景（避免重复统计）
  const recordedScenes = useRef<Set<string>>(new Set());

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
        const { sceneId, state, imageUrl, startTime, scenes } = JSON.parse(savedProgress);
        if (game.scenes[sceneId]) {
          setCurrentSceneId(sceneId);
          setIsGameStarted(true);
        }
        setRuntimeState(state);
        if (imageUrl) setCurrentImageUrl(imageUrl);
        if (startTime) setGameStartTime(startTime);
        if (scenes) recordedScenes.current = new Set(scenes);
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
          startTime: gameStartTime,
          scenes: Array.from(recordedScenes.current),
        }),
      );
    }
  }, [currentSceneId, runtimeState, slug, isLoaded, isGameStarted, currentImageUrl, gameStartTime]);

  // 记录场景访问
  const recordSceneVisit = useCallback(
    (sceneId: string) => {
      if (!recordedScenes.current.has(sceneId)) {
        recordedScenes.current.add(sceneId);
        sendAnalytics('scene', { gameId, sceneId });
      }
    },
    [gameId],
  );

  function handleStartGame() {
    const startTime = Date.now();
    setGameStartTime(startTime);
    setIsGameStarted(true);

    const startSceneId = game.startSceneId || 'start';
    if (!localStorage.getItem(`jianjian_game_${slug}`)) {
      setCurrentSceneId(startSceneId);
      setRuntimeState(extractRuntimeState(game.initialState));
    }

    // 记录游戏打开
    sendAnalytics('open', { gameId });

    // 记录初始场景
    recordSceneVisit(startSceneId);
  }

  function handleRestart() {
    if (!confirm('确定要重新开始这个故事吗？🤔')) return;
    localStorage.removeItem(`jianjian_game_${slug}`);
    recordedScenes.current.clear();

    const startSceneId = game.startSceneId || 'start';
    setCurrentSceneId(startSceneId);
    setRuntimeState(extractRuntimeState(game.initialState));
    setCurrentImageUrl(undefined);
    setIsGameStarted(false);
    setGameStartTime(null);

    const startScene = game.scenes[startSceneId];
    if (startScene) {
      const firstImage = getSceneImage(startScene.nodes);
      if (firstImage) setCurrentImageUrl(firstImage);
    }
  }

  function handleChoice(nextSceneId: string, choiceIndex: number, setInstruction?: string) {
    let newState = runtimeState;
    if (setInstruction) {
      newState = executeSet(setInstruction, runtimeState);
      setRuntimeState(newState);
    }

    // 记录选项点击
    sendAnalytics('choice', { gameId, sceneId: currentSceneId, choiceIndex });

    const triggerScene = checkTriggers(newState);
    const targetSceneId = triggerScene && game.scenes[triggerScene] ? triggerScene : nextSceneId;
    setCurrentSceneId(targetSceneId);

    // 记录新场景访问
    recordSceneVisit(targetSceneId);
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
    gameStartTime,
    setImageLoading,
    handleStartGame,
    handleRestart,
    handleChoice,
    getSceneImage,
    getSceneAudioUrl,
  };
}
