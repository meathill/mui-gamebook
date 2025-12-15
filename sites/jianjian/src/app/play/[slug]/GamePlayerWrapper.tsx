'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PlayableGame, RuntimeState, SerializablePlayableGame } from '@mui-gamebook/parser/src/types';
import {
  isVariableMeta,
  extractRuntimeState,
  getVisibleVariables,
  fromSerializablePlayableGame,
} from '@mui-gamebook/parser/src/types';
import { evaluateCondition, executeSet, interpolateVariables } from './evaluator';

interface Props {
  game: SerializablePlayableGame;
  slug: string;
}

/**
 * GamePlayerWrapper - 简简站点的儿童友好游戏播放器
 */
export default function GamePlayerWrapper({ game: serializedGame, slug }: Props) {
  const game: PlayableGame = useMemo(() => fromSerializablePlayableGame(serializedGame), [serializedGame]);
  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => extractRuntimeState(game.initialState));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const visibleVariables = getVisibleVariables(game.initialState);

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
  }, [slug, game.scenes]);

  // 保存进度
  useEffect(() => {
    if (isLoaded && isGameStarted) {
      localStorage.setItem(
        `jianjian_game_${slug}`,
        JSON.stringify({
          sceneId: currentSceneId,
          state: runtimeState,
        }),
      );
    }
  }, [currentSceneId, runtimeState, slug, isLoaded, isGameStarted]);

  const handleStartGame = () => {
    setIsGameStarted(true);
    if (!localStorage.getItem(`jianjian_game_${slug}`)) {
      setCurrentSceneId(game.startSceneId || 'start');
      setRuntimeState(extractRuntimeState(game.initialState));
    }
  };

  const handleRestart = () => {
    if (!confirm('确定要重新开始这个故事吗？🤔')) return;
    localStorage.removeItem(`jianjian_game_${slug}`);
    setCurrentSceneId(game.startSceneId || 'start');
    setRuntimeState(extractRuntimeState(game.initialState));
    setIsGameStarted(false);
  };

  const handleChoice = (nextSceneId: string, setInstruction?: string) => {
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
  };

  // 加载中
  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="text-5xl mb-4 animate-bounce">📖</div>
        <p className="text-xl font-semibold text-foreground/70">故事正在打开...</p>
      </div>
    );
  }

  // 标题画面
  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        {/* 装饰 */}
        <div className="flex gap-3 text-4xl mb-6">
          <span className="animate-bounce-in">✨</span>
          <span
            className="animate-bounce-in"
            style={{ animationDelay: '0.1s' }}>
            📖
          </span>
          <span
            className="animate-bounce-in"
            style={{ animationDelay: '0.2s' }}>
            ✨
          </span>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 title-fun">{game.title}</h1>

        {/* 描述 */}
        {game.description && (
          <p className="text-lg sm:text-xl text-foreground/80 mb-8 max-w-md leading-relaxed">{game.description}</p>
        )}

        {/* 开始按钮 */}
        <button
          onClick={handleStartGame}
          className="btn btn-primary text-xl px-10 py-4">
          <span className="mr-2">🚀</span>
          开始冒险！
        </button>
      </div>
    );
  }

  const currentScene = game.scenes.get(currentSceneId);

  // 场景未找到
  if (!currentScene) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="text-5xl mb-4">😢</div>
        <h2 className="text-2xl font-bold mb-4">哎呀，找不到这一页了</h2>
        <button
          onClick={handleRestart}
          className="btn btn-primary">
          <span className="mr-2">🔄</span>
          重新开始
        </button>
      </div>
    );
  }

  const hasConfiguredChoices = currentScene.nodes.some((node) => node.type === 'choice');
  const showEndScreen = !hasConfiguredChoices;

  return (
    <div className="flex flex-col min-h-[60vh]">
      {/* 顶部栏 */}
      <div className="bg-card-bg border-b-[3px] border-card-border p-4 flex justify-between items-center sticky top-16 sm:top-20 z-10">
        <h1 className="text-lg sm:text-xl font-bold truncate flex items-center gap-2">
          <span>📖</span>
          {game.title}
        </h1>
        <button
          onClick={handleRestart}
          className="px-4 py-2 text-foreground/70 hover:text-accent-pink font-semibold rounded-full hover:bg-accent-pink/10 transition-colors flex items-center gap-1">
          <span>🏠</span>
          <span className="hidden sm:inline">退出</span>
        </button>
      </div>

      {/* 变量状态栏 */}
      {visibleVariables.length > 0 && (
        <div className="bg-primary-light/50 border-b-[3px] border-card-border px-4 py-3">
          <div className="max-w-2xl mx-auto flex flex-wrap gap-3 justify-center">
            {visibleVariables.map(({ key, meta }) => (
              <div
                key={key}
                className="var-badge">
                <span>{meta.label || key}:</span>
                <span className="text-primary font-bold">{runtimeState[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 场景内容 */}
      <div className="flex-1 p-6 sm:p-8 max-w-2xl mx-auto w-full">
        <div className="space-y-6">
          {currentScene.nodes.map((node, index) => {
            switch (node.type) {
              case 'text':
                return (
                  <p
                    key={index}
                    className="game-text animate-bounce-in"
                    style={{ animationDelay: `${index * 0.1}s` }}>
                    {interpolateVariables(node.content, runtimeState)}
                  </p>
                );

              case 'choice':
                if (!evaluateCondition(node.condition, runtimeState)) {
                  return null;
                }
                return (
                  <button
                    key={index}
                    className="choice-btn animate-bounce-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => handleChoice(node.nextSceneId, node.set)}>
                    <span className="mr-2">👉</span>
                    {interpolateVariables(node.text, runtimeState)}
                  </button>
                );

              default:
                return null;
            }
          })}

          {/* 结局画面 */}
          {showEndScreen && (
            <div className="card p-8 text-center mt-8 animate-bounce-in">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 title-fun">故事结束啦！</h2>
              <p className="text-lg text-foreground/70 mb-6">谢谢你的阅读！想再看一遍吗？</p>
              <button
                onClick={() => handleRestart()}
                className="btn btn-primary">
                <span className="mr-2">🔄</span>
                再看一遍！
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
