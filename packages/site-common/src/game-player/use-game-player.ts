'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PlayableGame, PlayableScene, PlayableSceneNode, RuntimeState } from '@mui-gamebook/parser/src/types';
import { isVariableMeta, extractRuntimeState, getVisibleVariables } from '@mui-gamebook/parser/src/utils';
import { normalizeTriggerCondition } from '@mui-gamebook/parser/src/expression';
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
  /** 当前状态下命中的块级重定向目标（首个条件通过者），无则为 null */
  redirectTarget: string | null;
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
  /**
   * 从存档数据恢复：场景 + 变量状态（以初始状态为底座合并）。
   * 供多存档系统（save-manager）读档使用；场景不存在时返回 false。
   */
  restoreSave: (sceneId: string, savedState: RuntimeState) => boolean;
  /** 执行当前命中的块级重定向（应用其 set、触发器照常生效）；无命中时为空操作 */
  handleContinue: () => void;
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
          // 前缀式条件（如 "<= 0"）补全 LHS 后带完整 state 求值；
          // 旧做法是把当前值拼进字符串再用空 state 求值，字符串变量会失效
          const condition = normalizeTriggerCondition(val.trigger.condition, key);
          if (evaluateCondition(condition, state)) {
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
        // 以初始状态为底座合并：游戏更新新增变量后，老玩家存档不再缺字段
        // （否则新变量为 undefined：条件恒假、插值裸露 {{var}}）
        setRuntimeState({ ...extractRuntimeState(game.initialState), ...state });
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
  }, [storageKey, game.scenes, game.startSceneId, game.initialState]);

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

  const restoreSave = useCallback(
    (sceneId: string, savedState: RuntimeState): boolean => {
      if (!game.scenes[sceneId]) return false;
      setCurrentSceneId(sceneId);
      // 与单存档路径一致：初始状态为底座合并，游戏更新后老存档不缺新变量
      setRuntimeState({ ...extractRuntimeState(game.initialState), ...savedState });
      setIsGameStarted(true);
      notifySceneVisit(sceneId);
      return true;
    },
    [game.scenes, game.initialState, notifySceneVisit],
  );

  const hasConfiguredChoices = currentScene?.nodes.some((node) => node.type === 'choice') ?? false;

  // 块级重定向：按序求值，首个条件命中且目标场景存在者生效（DSL_V2_DESIGN §4.6）
  let activeRedirect: Extract<PlayableSceneNode, { type: 'redirect' }> | null = null;
  for (const node of currentScene?.nodes ?? []) {
    if (node.type === 'redirect' && game.scenes[node.nextSceneId] && evaluateCondition(node.condition, runtimeState)) {
      activeRedirect = node;
      break;
    }
  }
  const redirectTarget = activeRedirect?.nextSceneId ?? null;
  const activeRedirectRef = useRef(activeRedirect);
  activeRedirectRef.current = activeRedirect;

  const handleContinue = useCallback(() => {
    const redirect = activeRedirectRef.current;
    if (redirect) {
      handleChoice(redirect.nextSceneId, redirect.set);
    }
  }, [handleChoice]);

  // 纯路由场景（只有重定向，无正文/选项/小游戏）进入即自动跳转；连续跳数上限防环
  const autoJumpCountRef = useRef(0);
  useEffect(() => {
    if (!isLoaded || !isGameStarted || !currentScene) return;
    const redirect = activeRedirectRef.current;
    const hasVisibleContent = currentScene.nodes.some(
      (n) => n.type === 'text' || n.type === 'dialogue' || n.type === 'choice' || n.type === 'minigame',
    );
    if (!redirect || hasVisibleContent) {
      autoJumpCountRef.current = 0;
      return;
    }
    if (autoJumpCountRef.current >= 10) {
      console.warn(`Redirect chain exceeded 10 hops at scene "${currentSceneId}", stopping auto-jump`);
      return;
    }
    autoJumpCountRef.current += 1;
    handleChoice(redirect.nextSceneId, redirect.set);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isGameStarted, currentSceneId, currentScene, runtimeState, handleChoice]);

  const showEndScreen = !hasConfiguredChoices && !redirectTarget;

  return {
    game,
    currentSceneId,
    runtimeState,
    isLoaded,
    isGameStarted,
    visibleVariables,
    currentScene,
    hasConfiguredChoices,
    redirectTarget,
    showEndScreen,
    currentImageUrl,
    imageLoading,
    gameStartTime,
    handleStartGame,
    handleRestart,
    handleChoice,
    applyStateUpdate,
    restoreSave,
    handleContinue,
    setImageLoading,
    getSceneImage,
    getSceneAudioUrl,
  };
}

export { evaluateCondition, executeSet, interpolateVariables };
