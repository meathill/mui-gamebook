'use client';

import { useEffect, useState, useRef } from 'react';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import { useAudioPlayer } from '@mui-gamebook/app/hooks/useAudioPlayer';
import { evaluateCondition, interpolateVariables, resolveSpeakerName } from '@mui-gamebook/site-common/utils';
import { useGameState } from './hooks/useGameState';
import SceneImage from './components/SceneImage';
import AudioControls from './components/AudioControls';
import GameStartScreen from './components/GameStartScreen';
import GameEndScreen from './components/GameEndScreen';

interface Props {
  game: PlayableGame;
  gameId: number;
  slug: string;
}

/**
 * GamePlayerWrapper - 简简站点的儿童友好游戏播放器
 */
export default function GamePlayerWrapper({ game, gameId, slug }: Props) {
  const audioPlayer = useAudioPlayer();
  const choiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingChoiceIndex, setPlayingChoiceIndex] = useState<number | null>(null);
  const {
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
  } = useGameState({ game, gameId, slug });

  // 场景切换时自动播放语音并预加载下一场景
  useEffect(() => {
    if (isGameStarted && currentScene) {
      audioPlayer.stop();
      // 停止选项音频
      if (choiceAudioRef.current) {
        choiceAudioRef.current.pause();
        setPlayingChoiceIndex(null);
      }

      const audioUrl = getSceneAudioUrl(currentScene.nodes);
      if (audioUrl) {
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

        const imageUrl = getSceneImage(scene.nodes);
        if (imageUrl) {
          const img = new Image();
          img.src = imageUrl;
        }

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

  function handleChoiceWithAudio(nextSceneId: string, choiceIndex: number, setInstruction?: string) {
    audioPlayer.stop();
    if (choiceAudioRef.current) {
      choiceAudioRef.current.pause();
      setPlayingChoiceIndex(null);
    }
    handleChoice(nextSceneId, choiceIndex, setInstruction);
  }

  function handleRestartWithAudio() {
    audioPlayer.stop();
    handleRestart();
  }

  // 播放/暂停选项语音
  function toggleChoiceAudio(url: string, index: number) {
    // 如果正在播放同一个，则暂停
    if (playingChoiceIndex === index && choiceAudioRef.current) {
      choiceAudioRef.current.pause();
      setPlayingChoiceIndex(null);
      return;
    }

    // 停止之前的音频
    if (choiceAudioRef.current) {
      choiceAudioRef.current.pause();
    }

    // 播放新音频
    const audio = new Audio(url);
    choiceAudioRef.current = audio;
    setPlayingChoiceIndex(index);

    audio.onended = () => {
      setPlayingChoiceIndex(null);
    };

    audio.play().catch((e) => {
      console.error('Failed to play choice audio:', e);
      setPlayingChoiceIndex(null);
    });
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
      <GameStartScreen
        title={game.title}
        description={game.description}
        coverImage={game.cover_image}
        onStart={handleStartGame}
      />
    );
  }

  // 场景未找到
  if (!currentScene) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="text-5xl mb-4">😢</div>
        <h2 className="text-2xl font-bold mb-4">哎呀，找不到这一页了</h2>
        <button
          onClick={handleRestartWithAudio}
          className="btn btn-primary">
          <span className="mr-2">🔄</span>
          重新开始
        </button>
      </div>
    );
  }

  const hasConfiguredChoices = currentScene.nodes.some((node) => node.type === 'choice');
  const showEndScreen = !hasConfiguredChoices;
  const hasTextAudio = currentScene.nodes.some(
    (n) => (n.type === 'text' || n.type === 'dialogue') && 'audio_url' in n && n.audio_url,
  );

  return (
    <div className="flex flex-col min-h-[60vh]">
      {/* 顶部栏 */}
      <div className="bg-card-bg border-b-[3px] border-card-border p-4 flex justify-between items-center sticky top-16 sm:top-20 z-10">
        <h1 className="text-lg sm:text-xl font-bold truncate flex items-center gap-2">
          <span>📖</span>
          {game.title}
        </h1>
        <button
          onClick={handleRestartWithAudio}
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
        <SceneImage
          url={currentImageUrl}
          loading={imageLoading}
          onLoad={() => setImageLoading(false)}
        />
      )}

      {/* 音频控制（放在图片下方、文字上方） */}
      {hasTextAudio && <AudioControls audioPlayer={audioPlayer} />}

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

              case 'dialogue':
                return (
                  <p
                    key={index}
                    className="game-text animate-bounce-in"
                    style={{ animationDelay: `${index * 0.1}s` }}>
                    <strong>{resolveSpeakerName(node.speaker, game.characters)}：</strong>
                    {interpolateVariables(node.content, runtimeState)}
                  </p>
                );

              case 'choice':
                if (!evaluateCondition(node.condition, runtimeState)) {
                  return null;
                }
                const choiceHasAudio = 'audio_url' in node && !!node.audio_url;
                const isPlaying = playingChoiceIndex === index;
                return (
                  <div
                    key={index}
                    className="flex gap-2 items-center animate-bounce-in"
                    style={{ animationDelay: `${index * 0.1}s` }}>
                    {choiceHasAudio && (
                      <button
                        onClick={() => toggleChoiceAudio((node as { audio_url: string }).audio_url, index)}
                        className={`p-3 rounded-full transition-colors flex-shrink-0 ${
                          isPlaying
                            ? 'bg-accent-purple/30 text-accent-purple'
                            : 'bg-accent-purple/10 hover:bg-accent-purple/20 text-accent-purple'
                        }`}
                        title={isPlaying ? '暂停' : '播放语音'}>
                        {isPlaying ? '⏸️' : '▶️'}
                      </button>
                    )}
                    <button
                      className="choice-btn flex-1"
                      onClick={() => handleChoiceWithAudio(node.nextSceneId, index, node.set)}>
                      <span className="mr-2">👉</span>
                      {interpolateVariables(node.text, runtimeState)}
                    </button>
                  </div>
                );

              case 'static_image':
              case 'ai_image':
                return null;

              default:
                return null;
            }
          })}

          {/* 结局画面 */}
          {showEndScreen && (
            <GameEndScreen
              gameId={gameId}
              gameStartTime={gameStartTime}
              onRestart={handleRestartWithAudio}
            />
          )}
        </div>
      </div>
    </div>
  );
}
