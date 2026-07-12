'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import { useGamePlayer } from '@mui-gamebook/site-common/game-player';
import { useDialog } from '@/components/Dialog';
import ShareButton from '@/components/ShareButton';
import { Button } from '@radix-ui/themes';
import {
  TitleScreen,
  EndScreen,
  VariableIndicator,
  SceneNodes,
  usePreload,
  useAudioPlayer,
} from '@/components/game-player';
import { useGameAnalytics } from '@/hooks/useGameAnalytics';

export default function GamePlayer({ game, slug }: { game: PlayableGame & { id?: number }; slug: string }) {
  const [minigameCompleted, setMinigameCompleted] = useState(false);
  const [textVisible, setTextVisible] = useState(true);
  const [hasReadAll, setHasReadAll] = useState(false);
  const [autoScrolling, setAutoScrolling] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const dialog = useDialog();
  const t = useTranslations('game');
  const audioPlayer = useAudioPlayer();
  const analytics = useGameAnalytics();

  const gamePlayer = useGamePlayer(game, slug, {
    storagePrefix: 'game_progress',
    confirmRestart: () => dialog.confirm(t('restartConfirm')),
    onChoice: (sceneId, choiceIndex) => {
      if (game.id && typeof choiceIndex === 'number') {
        analytics.trackChoice(game.id, sceneId, choiceIndex);
      }
    },
  });
  const {
    currentSceneId,
    currentScene,
    runtimeState,
    isLoaded,
    isGameStarted,
    currentImageUrl,
    imageLoading,
    visibleVariables,
    hasConfiguredChoices,
    handleStartGame,
    handleRestart,
    handleChoice: gamePlayerHandleChoice,
    applyStateUpdate,
    setImageLoading,
  } = gamePlayer;

  // 预加载下一个可能场景的素材
  usePreload(game, currentSceneId);

  // 打开游戏页面时上报（与"点击开始"是两个不同事件，页面一加载就算打开）
  useEffect(() => {
    if (game.id) {
      analytics.trackOpen(game.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasMinigame = currentScene ? currentScene.nodes.some((node) => node.type === 'minigame' && node.url) : false;
  const showEndScreen = !hasConfiguredChoices && (!hasMinigame || minigameCompleted);

  useEffect(() => {
    if (showEndScreen && game.id) {
      analytics.trackComplete(game.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEndScreen]);

  // 每次到达场景都上报（不去重，与埋点数据的既有口径一致）
  useEffect(() => {
    if (isGameStarted && game.id && currentSceneId) {
      analytics.trackScene(game.id, currentSceneId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, isGameStarted]);

  // 场景切换时自动播放语音
  useEffect(() => {
    if (isGameStarted && currentScene) {
      audioPlayer.stop();
      const audioUrl = gamePlayer.getSceneAudioUrl(currentScene.nodes);
      if (audioUrl) {
        setTimeout(() => {
          audioPlayer.play(audioUrl);
        }, 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, isGameStarted]);

  function handleChoice(nextSceneId: string, setInstruction?: string, choiceIndex?: number) {
    gamePlayerHandleChoice(nextSceneId, setInstruction, choiceIndex);
    // 切换场景时重置小游戏完成状态和停止音频
    setMinigameCompleted(false);
    setTextVisible(true);
    setHasReadAll(false);
    setAutoScrolling(true);
    audioPlayer.stop();
  }

  // 处理小游戏完成后的变量更新
  function handleMiniGameComplete(updatedVars: Record<string, number | string | boolean>) {
    const triggerScene = applyStateUpdate(updatedVars);
    setMinigameCompleted(!triggerScene);
  }

  // 处理滚动检测是否读完
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
    if (isAtBottom && !hasReadAll) {
      setHasReadAll(true);
    }
  }

  // Auto-detect when content doesn't need scrolling (all text visible without scroll)
  useEffect(() => {
    if (hasReadAll || !currentImageUrl) return;
    const el = contentRef.current;
    if (!el) return;
    // If content fits without scrolling, mark as read
    if (el.scrollHeight <= el.clientHeight + 10) {
      setHasReadAll(true);
    }
  }, [currentSceneId, hasReadAll, currentImageUrl]);

  // 移动端自动滚动文本
  useEffect(() => {
    if (!autoScrolling || hasReadAll || !currentImageUrl) return;
    const el = contentRef.current;
    if (!el) return;

    let lastTime = 0;
    const speed = 40; // px per second

    const step = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;

      el.scrollTop += (speed * delta) / 1000;

      // CheckIcon if reached bottom
      if (el.scrollHeight - el.scrollTop <= el.clientHeight + 10) {
        setHasReadAll(true);
        setAutoScrolling(false);
        return;
      }
      autoScrollRef.current = requestAnimationFrame(step);
    };

    // Delay start to let user see the beginning
    const timeout = setTimeout(() => {
      autoScrollRef.current = requestAnimationFrame(step);
    }, 1000);

    return () => {
      clearTimeout(timeout);
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
    };
  }, [autoScrolling, hasReadAll, currentImageUrl, currentSceneId]);

  // 用户手动滚动时停止自动滚动
  function handleUserInteraction() {
    if (autoScrolling) {
      setAutoScrolling(false);
    }
  }

  // 处理图片点击切换文本显示
  function handleImageClick() {
    setTextVisible((prev) => !prev);
  }

  if (!isLoaded) {
    return <div className="p-8 text-center">{t('loading')}</div>;
  }

  if (!isGameStarted) {
    return (
      <TitleScreen
        game={game}
        onStart={handleStartGame}
      />
    );
  }

  if (!currentScene) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">{t('sceneNotFound')}</h2>
        <p className="mb-6">{t('cannotFindScene', { sceneId: currentSceneId })}</p>
        <Button
          variant="soft"
          color="gray"
          onClick={() => handleRestart()}>
          {t('backToTitle')}
        </Button>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="flex flex-col min-h-dvh sm:min-h-[600px]">
      {/* Header */}
      <div className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-10 bg-opacity-90 backdrop-blur-sm">
        <h1 className="text-lg font-bold truncate text-gray-800">{game.title}</h1>
        <div className="flex gap-2 text-sm items-center">
          <ShareButton
            title={game.title}
            url={shareUrl}
          />
          <Button
            variant="ghost"
            color="red"
            onClick={() => handleRestart()}>
            {t('exit')}
          </Button>
        </div>
      </div>

      {/* 可见变量状态栏 */}
      {visibleVariables.length > 0 && (
        <div className="bg-gray-50 border-b px-4 py-2">
          <div className="max-w-2xl mx-auto grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
            {visibleVariables.map(({ key, meta }) => (
              <VariableIndicator
                key={key}
                varKey={key}
                meta={meta}
                currentValue={runtimeState[key]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ImageIcon and Content Container - 移动端时文本叠加在图片上 */}
      <div className="relative flex-1 sm:flex-none sm:block overflow-hidden">
        {/* Persistent ImageIcon Display */}
        {currentImageUrl && (
          <div className="w-full sm:relative absolute inset-0 overflow-hidden bg-gray-100">
            <Image
              src={currentImageUrl}
              alt="Scene"
              width={1200}
              height={675}
              className={`w-full h-full object-cover sm:h-auto sm:object-contain transition-opacity duration-700 ease-in-out ${imageLoading ? 'opacity-50 blur-sm' : 'opacity-100 blur-0'}`}
              onLoad={() => setImageLoading(false)}
              onClick={handleImageClick}
              sizes="(max-width: 640px) 100vw, 1200px"
              priority
            />
            {/* 移动端渐变遮罩，提升文字可读性 */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent sm:hidden transition-opacity duration-300 ${textVisible ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* 移动端文本隐藏时的提示 */}
            {!textVisible && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm sm:hidden">
                点击显示文字
              </div>
            )}
          </div>
        )}

        {/* Scene Content - 移动端文本层，mt-auto 让短内容贴底 */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          onTouchStart={handleUserInteraction}
          onWheel={handleUserInteraction}
          className={`relative z-10 p-4 md:p-8 max-w-2xl mx-auto w-full flex flex-col overflow-y-auto transition-opacity duration-300 ${currentImageUrl ? 'absolute bottom-0 left-0 right-0 h-[50dvh] sm:static sm:h-auto sm:inset-auto' : ''} ${textVisible ? 'opacity-100' : 'opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto'}`}>
          <div className="mt-auto space-y-2 sm:mt-0 sm:space-y-6">
            <SceneNodes
              nodes={currentScene.nodes}
              runtimeState={runtimeState}
              hasMinigame={hasMinigame}
              minigameCompleted={minigameCompleted}
              hasReadAll={hasReadAll}
              hasImage={!!currentImageUrl}
              audioPlayer={audioPlayer}
              onChoice={handleChoice}
              onMiniGameComplete={handleMiniGameComplete}
            />

            {/* End Screen */}
            {showEndScreen && (
              <EndScreen
                title={game.title}
                shareUrl={shareUrl}
                onRestart={handleRestart}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
