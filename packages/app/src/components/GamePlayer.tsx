'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import { useGamePlayer } from '@mui-gamebook/site-common/game-player';
import { PLACEHOLDER_COVER, resolveCoverSrc } from '../../image-loader';
import { useDialog } from '@/components/Dialog';
import ShareButton from '@/components/ShareButton';
import Button from '@/components/Button';
import {
  TitleScreen,
  EndScreen,
  VariableIndicator,
  SceneNodes,
  AudioControls,
  usePreload,
} from '@/components/game-player';
import { type GamePanel, useGameHashRoute } from '@/components/game-player/hooks/useGameHashRoute';
import { useSceneAudiobook } from '@/components/game-player/hooks/useSceneAudiobook';
import { useGameAnalytics } from '@/hooks/useGameAnalytics';

// classic 播放器没有叠加面板，注册空表让 #settings 之类归一成 intro，不会莫名把人塞进游戏
const NO_PANELS: readonly GamePanel[] = [];

export default function GamePlayer({ game, slug }: { game: PlayableGame & { id?: number }; slug: string }) {
  const route = useGameHashRoute(NO_PANELS);
  const isPlaying = route.view === 'play';
  const [minigameCompleted, setMinigameCompleted] = useState(false);
  const [textVisible, setTextVisible] = useState(true);
  const [hasReadAll, setHasReadAll] = useState(false);
  const [autoScrolling, setAutoScrolling] = useState(true);
  const [sceneImgError, setSceneImgError] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const dialog = useDialog();
  const t = useTranslations('game');
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
    // isGameStarted 的语义是「有没有进行中的存档」，不是「该显示哪一屏」——后者由 hash 决定
    isGameStarted: hasSave,
    currentImageUrl,
    imageLoading,
    visibleVariables,
    hasConfiguredChoices,
    redirectTarget,
    handleStartGame,
    handleRestart,
    handleChoice: gamePlayerHandleChoice,
    handleContinue,
    applyStateUpdate,
    setImageLoading,
  } = gamePlayer;

  const { audioPlayer, hasAudioThisScene } = useSceneAudiobook({
    slug,
    currentSceneId,
    currentScene,
    isPlaying,
    getSceneAudioUrl: gamePlayer.getSceneAudioUrl,
  });

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
  // 有块级重定向（redirectTarget）时不算结束，改为显示「继续」按钮
  const canContinue = !!redirectTarget && !hasConfiguredChoices && (!hasMinigame || minigameCompleted);
  const showEndScreen = !hasConfiguredChoices && !redirectTarget && (!hasMinigame || minigameCompleted);

  useEffect(() => {
    if (showEndScreen && game.id) {
      analytics.trackComplete(game.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEndScreen]);

  // 每次到达场景都上报（不去重，与埋点数据的既有口径一致）
  useEffect(() => {
    if (isPlaying && game.id && currentSceneId) {
      analytics.trackScene(game.id, currentSceneId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, isPlaying]);

  // 进入游戏视图时确保这一局已初始化。三条入口都走这里：点「开始冒险」、点「继续冒险」、
  // 冷启动 #play 深链。handleStartGame 内部自己读 localStorage：有档不重置（=继续），无档从头开始
  useEffect(() => {
    if (!isLoaded || !isPlaying || hasSave) return;
    handleStartGame();
  }, [isLoaded, isPlaying, hasSave, handleStartGame]);

  /** 清档回标题。noConfirm 用于结局页「再玩一次」和存档失效时的兜底恢复 */
  async function resetToTitle(noConfirm = false) {
    if (await handleRestart(noConfirm)) route.goToView('intro');
  }

  /** 标题页的「重新开始」：确认后清档，直接从头开始新的一局 */
  async function handleRestartFromTitle() {
    if (await handleRestart()) route.goToView('play');
  }

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

  // 场景切换时重置图片错误状态
  useEffect(() => {
    setSceneImgError(false);
  }, [currentImageUrl]);

  // 处理图片点击切换文本显示
  function handleImageClick() {
    setTextVisible((prev) => !prev);
  }

  // 不额外挡 isLoaded：让 SSR 首屏直接落到下面的标题页分支，带上真实标题和简介，而不是空的"加载中"
  if (!isPlaying) {
    return (
      <TitleScreen
        game={game}
        hasSave={hasSave}
        onStart={() => route.goToView('play')}
        onRestart={handleRestartFromTitle}
      />
    );
  }

  if (!currentScene) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-4">{t('sceneNotFound')}</h2>
        <p className="mb-6">{t('cannotFindScene', { sceneId: currentSceneId })}</p>
        {/* 存档指向了不存在的场景，必须清档，否则回标题页点「继续」会死循环 */}
        <Button
          variant="soft"
          color="gray"
          size="lg"
          onClick={() => resetToTitle(true)}>
          {t('backToTitle')}
        </Button>
      </div>
    );
  }

  // 不用 location.href：视图状态在 hash 里，分享出去的链接不该带上它
  const shareUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';

  return (
    <div className="flex flex-col min-h-dvh sm:min-h-[600px]">
      {/* Header */}
      <div className="bg-white border-b p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sticky top-0 z-10 bg-opacity-90 backdrop-blur-sm">
        <h1 className="text-lg font-bold truncate text-gray-800">{game.title}</h1>
        <div className="flex justify-center">
          <AudioControls
            audioPlayer={audioPlayer}
            hasAudio={hasAudioThisScene}
          />
        </div>
        <div className="flex gap-2 text-sm items-center justify-end">
          <ShareButton
            title={game.title}
            url={shareUrl}
          />
          {/* 回标题页，保留存档；销毁进度的入口只留标题页的「重新开始」和结局页的「再玩一次」 */}
          <Button
            variant="ghost"
            color="gray"
            onClick={() => route.goToView('intro')}>
            {t('backToTitle')}
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
              src={sceneImgError ? PLACEHOLDER_COVER : resolveCoverSrc(currentImageUrl)}
              alt={game.title ? `${game.title} 场景插画` : '场景插画'}
              width={1200}
              height={675}
              className={`w-full h-full object-cover sm:h-auto sm:object-contain transition-opacity duration-700 ease-in-out ${imageLoading ? 'opacity-50 blur-sm' : 'opacity-100 blur-0'}`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setSceneImgError(true);
                setImageLoading(false);
              }}
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
              characters={game.characters}
              runtimeState={runtimeState}
              hasMinigame={hasMinigame}
              minigameCompleted={minigameCompleted}
              hasReadAll={hasReadAll}
              hasImage={!!currentImageUrl}
              audioPlayer={audioPlayer}
              onChoice={handleChoice}
              onMiniGameComplete={handleMiniGameComplete}
            />

            {/* 块级重定向：读完点「继续」按当前状态路由（DSL v2） */}
            {canContinue && (
              <button
                className={`w-full text-left px-4 py-2 sm:py-4 border-2 rounded-xl transition-all group shadow-sm hover:shadow-md flex items-center gap-3 ${currentImageUrl ? 'bg-white/90 backdrop-blur-sm border-white/50 hover:bg-white hover:border-orange-400 sm:bg-transparent sm:backdrop-blur-none sm:border-amber-100' : 'border-amber-100'} hover:border-orange-400 hover:bg-orange-50`}
                onClick={handleContinue}>
                <span className="font-medium text-amber-800 group-hover:text-orange-700 text-lg flex-1">继续</span>
              </button>
            )}

            {/* End Screen */}
            {showEndScreen && (
              <EndScreen
                title={game.title}
                shareUrl={shareUrl}
                onRestart={resetToTitle}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
