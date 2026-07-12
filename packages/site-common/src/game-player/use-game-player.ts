'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlayableGame, PlayableScene, PlayableSceneNode, RuntimeState } from '@mui-gamebook/parser/src/types';
import { isVariableMeta, extractRuntimeState, getVisibleVariables } from '@mui-gamebook/parser/src/utils';
import { evaluateCondition, executeSet, interpolateVariables } from '../utils/evaluator';

export interface GamePlayerState {
  game: PlayableGame;
  currentSceneId: string;
  runtimeState: RuntimeState;
  isLoaded: boolean;
  isGameStarted: boolean;
  visibleVariables: ReturnType<typeof getVisibleVariables>;
  currentScene: PlayableScene | undefined;
  hasConfiguredChoices: boolean;
  showEndScreen: boolean;
  /** 当前场景的图片 URL（如果有） */
  currentImageUrl: string | undefined;
  /** 图片是否正在切换加载中，由调用方在图片 onLoad 时清除 */
  imageLoading: boolean;
  /** 本局游戏开始/恢复的时间戳 */
  gameStartTime: number | null;
}

export interface GamePlayerActions {
  handleStartGame: () => void;
  handleRestart: (noConfirm?: boolean) => void;
  handleChoice: (nextSceneId: string, setInstruction?: string, choiceIndex?: number) => void;
  /**
   * 合并部分运行时状态更新并检查变量触发器（用于选项之外的状态变化来源，如小游戏结算）。
   * 触发跳转时返回目标场景 id，否则返回 null，调用方可据此决定自身的 UI 副作用。
   */
  applyStateUpdate: (updates: Partial<RuntimeState>) => string | null;
  setImageLoading: (loading: boolean) => void;
  getSceneImage: (nodes: PlayableSceneNode[]) => string | undefined;
  getSceneAudioUrl: (nodes: PlayableSceneNode[]) => string | undefined;
}

export interface UseGamePlayerOptions {
  storagePrefix?: string;
  confirmRestart?: () => Promise<boolean> | boolean;
  /** 游戏开始/恢复时触发（用于埋点等副作用，不影响游戏状态本身） */
  onGameStart?: () => void;
  /** 每个场景在本局中首次到达时触发一次 */
  onSceneVisit?: (sceneId: string) => void;
  /** 玩家做出选择时触发，sceneId 为做出选择时所在的场景 */
  onChoice?: (sceneId: string, choiceIndex?: number) => void;
}

/** 从场景节点中提取第一张图片 URL */
function getSceneImage(nodes: PlayableSceneNode[]): string | undefined {
  const imageNode = nodes.find((n) => n.type === 'static_image' || n.type === 'ai_image');
  if (imageNode && 'url' in imageNode && imageNode.url) {
    return imageNode.url;
  }
  return undefined;
}

/** 从场景节点中提取正文的 TTS 音频 URL */
function getSceneAudioUrl(nodes: PlayableSceneNode[]): string | undefined {
  const textNode = nodes.find((n) => n.type === 'text' && 'audio_url' in n && n.audio_url);
  if (textNode && 'audio_url' in textNode) {
    return textNode.audio_url as string;
  }
  return undefined;
}

/**
 * 游戏播放器逻辑 Hook
 * 提供游戏状态管理和操作方法，UI 由各站点自定义
 */
export function useGamePlayer(
  game: PlayableGame,
  slug: string,
  options: UseGamePlayerOptions = {},
): GamePlayerState & GamePlayerActions {
  const {
    storagePrefix = 'game',
    confirmRestart = () => confirm('确定要重新开始吗？'),
    onGameStart,
    onSceneVisit,
    onChoice,
  } = options;

  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => extractRuntimeState(game.initialState));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [imageLoading, setImageLoading] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);

  // 已通知过 onSceneVisit 的场景（本局内去重，不需要触发渲染，用 ref 即可）
  const recordedScenesRef = useRef<Set<string>>(new Set());

  const visibleVariables = getVisibleVariables(game.initialState);
  const storageKey = `${storagePrefix}_${slug}`;

  const notifySceneVisit = useCallback(
    (sceneId: string) => {
      if (!recordedScenesRef.current.has(sceneId)) {
        recordedScenesRef.current.add(sceneId);
        onSceneVisit?.(sceneId);
      }
    },
    [onSceneVisit],
  );

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
        const { sceneId, state, imageUrl, startTime, scenes } = JSON.parse(savedProgress);
        if (game.scenes[sceneId]) {
          setCurrentSceneId(sceneId);
          setIsGameStarted(true);
        }
        setRuntimeState(state);
        if (imageUrl) setCurrentImageUrl(imageUrl);
        if (startTime) setGameStartTime(startTime);
        if (scenes) recordedScenesRef.current = new Set(scenes);
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
  }, [storageKey, game.scenes, game.startSceneId]);

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
  }, [currentSceneId, currentScene, currentImageUrl, isGameStarted]);

  // 保存进度
  useEffect(() => {
    if (isLoaded && isGameStarted) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          sceneId: currentSceneId,
          state: runtimeState,
          imageUrl: currentImageUrl,
          startTime: gameStartTime,
          scenes: Array.from(recordedScenesRef.current),
        }),
      );
    }
  }, [currentSceneId, runtimeState, storageKey, isLoaded, isGameStarted, currentImageUrl, gameStartTime]);

  const handleStartGame = useCallback(() => {
    const startSceneId = game.startSceneId || 'start';
    setGameStartTime(Date.now());
    setIsGameStarted(true);
    if (!localStorage.getItem(storageKey)) {
      setCurrentSceneId(startSceneId);
      setRuntimeState(extractRuntimeState(game.initialState));
    }
    onGameStart?.();
    notifySceneVisit(startSceneId);
  }, [storageKey, game.startSceneId, game.initialState, onGameStart, notifySceneVisit]);

  const handleRestart = useCallback(
    async (noConfirm = false) => {
      const confirmed = noConfirm || (await confirmRestart());
      if (!confirmed) return;

      const startSceneId = game.startSceneId || 'start';
      localStorage.removeItem(storageKey);
      recordedScenesRef.current = new Set();
      setCurrentSceneId(startSceneId);
      setRuntimeState(extractRuntimeState(game.initialState));
      setGameStartTime(null);
      setIsGameStarted(false);

      const startScene = game.scenes[startSceneId];
      setCurrentImageUrl(startScene ? getSceneImage(startScene.nodes) : undefined);
    },
    [storageKey, game.startSceneId, game.initialState, game.scenes, confirmRestart],
  );

  const handleChoice = useCallback(
    (nextSceneId: string, setInstruction?: string, choiceIndex?: number) => {
      let newState = runtimeState;
      if (setInstruction) {
        newState = executeSet(setInstruction, runtimeState);
        setRuntimeState(newState);
      }

      onChoice?.(currentSceneId, choiceIndex);

      const triggerScene = checkTriggers(newState);
      const targetSceneId = triggerScene && game.scenes[triggerScene] ? triggerScene : nextSceneId;
      setCurrentSceneId(targetSceneId);

      notifySceneVisit(targetSceneId);
    },
    [runtimeState, checkTriggers, game.scenes, currentSceneId, onChoice, notifySceneVisit],
  );

  const applyStateUpdate = useCallback(
    (updates: Partial<RuntimeState>): string | null => {
      const newState = { ...runtimeState, ...updates } as RuntimeState;
      setRuntimeState(newState);

      const triggerScene = checkTriggers(newState);
      if (triggerScene && game.scenes[triggerScene]) {
        setCurrentSceneId(triggerScene);
        notifySceneVisit(triggerScene);
        return triggerScene;
      }
      return null;
    },
    [runtimeState, checkTriggers, game.scenes, notifySceneVisit],
  );

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
    currentImageUrl,
    imageLoading,
    gameStartTime,
    handleStartGame,
    handleRestart,
    handleChoice,
    applyStateUpdate,
    setImageLoading,
    getSceneImage,
    getSceneAudioUrl,
  };
}

export { evaluateCondition, executeSet, interpolateVariables };
