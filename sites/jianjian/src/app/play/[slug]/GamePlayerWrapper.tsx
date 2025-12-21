'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PlayableGame, RuntimeState, PlayableSceneNode } from '@mui-gamebook/parser/src/types';
import { isVariableMeta, extractRuntimeState, getVisibleVariables } from '@mui-gamebook/parser/src/utils';
import { evaluateCondition, executeSet, interpolateVariables } from './evaluator';
import { useAudioPlayer } from './useAudioPlayer';

interface Props {
  game: PlayableGame;
  slug: string;
}

/**
 * GamePlayerWrapper - 简简站点的儿童友好游戏播放器
 */
export default function GamePlayerWrapper({ game, slug }: Props) {
  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => extractRuntimeState(game.initialState));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [imageLoading, setImageLoading] = useState(false);
  const audioPlayer = useAudioPlayer();

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
      // 加载起始场景的图片
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

  // 场景切换时自动播放语音并预加载下一场景
  useEffect(() => {
    if (isGameStarted && currentScene) {
      audioPlayer.stop();

      // 查找文本节点的音频
      const audioUrl = getSceneAudioUrl(currentScene.nodes);
      if (audioUrl) {
        // 自动播放语音
        setTimeout(() => {
          audioPlayer.play(audioUrl);
        }, 300);
      }

      // 预加载下一场景的资源
      const nextSceneIds = currentScene.nodes
        .filter((n) => n.type === 'choice')
        .map((n) => (n as { nextSceneId: string }).nextSceneId)
        .filter((id) => id && game.scenes[id]);

      for (const sceneId of nextSceneIds) {
        const scene = game.scenes[sceneId];
        if (!scene) continue;

        // 预加载图片
        const imageUrl = getSceneImage(scene.nodes);
        if (imageUrl) {
          const img = new Image();
          img.src = imageUrl;
        }

        // 预加载音频
        const nextAudioUrl = getSceneAudioUrl(scene.nodes);
        if (nextAudioUrl) {
          const audio = new Audio();
          audio.preload = 'auto';
          audio.src = nextAudioUrl;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, isGameStarted, getSceneImage, getSceneAudioUrl]);

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
    audioPlayer.stop();

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
    audioPlayer.stop();
  }

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
        {/* 封面图 */}
        {game.cover_image && (
          <div className="w-full max-w-md mb-6 rounded-2xl overflow-hidden shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={game.cover_image}
              alt={game.title}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

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
  const hasTextAudio = currentScene.nodes.some((n) => n.type === 'text' && 'audio_url' in n && n.audio_url);

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

      {/* 场景图片 */}
      {currentImageUrl && (
        <div className="w-full aspect-video relative overflow-hidden bg-primary-light/30 shadow-inner max-h-[50vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImageUrl}
            alt="场景图片"
            className={`object-contain w-full h-full transition-opacity duration-500 ${imageLoading ? 'opacity-50' : 'opacity-100'}`}
            onLoad={() => setImageLoading(false)}
          />
        </div>
      )}

      {/* 音频控制（放在图片下方、文字上方） */}
      {hasTextAudio && (
        <div className="flex items-center justify-center gap-3 py-3 bg-primary-light/30 border-b border-card-border">
          <span className="text-foreground/50 text-sm">🔊 语音</span>
          <button
            onClick={audioPlayer.toggle}
            className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            title={audioPlayer.isPlaying ? '暂停' : audioPlayer.isPaused ? '继续' : '播放'}>
            {audioPlayer.isPlaying ? '⏸️' : '▶️'}
          </button>
          <button
            onClick={audioPlayer.replay}
            className="p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground/70 transition-colors"
            title="重播">
            🔄
          </button>
          <span className="text-foreground/40 text-xs">
            {audioPlayer.isPlaying ? '正在播放...' : audioPlayer.isPaused ? '已暂停' : ''}
          </span>
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
                const choiceHasAudio = 'audio_url' in node && !!node.audio_url;
                return (
                  <div
                    key={index}
                    className="flex gap-2 items-center animate-bounce-in"
                    style={{ animationDelay: `${index * 0.1}s` }}>
                    {choiceHasAudio && (
                      <button
                        onClick={() => audioPlayer.play((node as { audio_url: string }).audio_url)}
                        className="p-3 rounded-full bg-accent-purple/10 hover:bg-accent-purple/20 text-accent-purple transition-colors flex-shrink-0"
                        title="播放语音">
                        🔊
                      </button>
                    )}
                    <button
                      className="choice-btn flex-1"
                      onClick={() => handleChoice(node.nextSceneId, node.set)}>
                      <span className="mr-2">👉</span>
                      {interpolateVariables(node.text, runtimeState)}
                    </button>
                  </div>
                );

              // 跳过已在顶部显示的图片节点
              case 'static_image':
              case 'ai_image':
                return null;

              default:
                return null;
            }
          })}

          {/* 音频控制已移至图片下方 */}

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
