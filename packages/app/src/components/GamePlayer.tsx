'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import type { PlayableGame, RuntimeState } from '@mui-gamebook/parser/src/types';
import { isVariableMeta, extractRuntimeState, getVisibleVariables } from '@mui-gamebook/parser/src/utils';
import { evaluateCondition, executeSet, interpolateVariables } from '@mui-gamebook/site-common/utils';
import { useDialog } from '@/components/Dialog';
import ShareButton from '@/components/ShareButton';
import { Button } from '@radix-ui/themes';
import {
  TitleScreen,
  EndScreen,
  VariableIndicator,
  MiniGamePlayer,
  AudioControls,
  usePreload,
  useAudioPlayer,
} from '@/components/game-player';
import { Volume2 } from 'lucide-react';
import { useGameAnalytics } from '@/hooks/useGameAnalytics';

export default function GamePlayer({ game, slug }: { game: PlayableGame & { id?: number }; slug: string }) {
  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => extractRuntimeState(game.initialState));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [imageLoading, setImageLoading] = useState(false);
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
  const trackedScenes = useRef<Set<string>>(new Set());

  const visibleVariables = getVisibleVariables(game.initialState);

  // 预加载下一个可能场景的素材
  usePreload(game, currentSceneId);

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

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(`game_progress_${slug}`);

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
      const firstImage = startScene?.nodes.find((n) => n.type === 'static_image' || n.type === 'ai_image');
      if (firstImage && 'url' in firstImage && firstImage.url) {
        setCurrentImageUrl(firstImage.url);
      }
    }
    setIsLoaded(true);
  }, [slug, game.scenes, game.startSceneId]);

  // Track game open
  useEffect(() => {
    if (game.id) {
      analytics.trackOpen(game.id);
    }
    // Only track once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentScene = game.scenes[currentSceneId];

  // Track completion
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hasConfiguredChoices =
    currentScene && currentSceneId ? game.scenes[currentSceneId].nodes.some((node) => node.type === 'choice') : false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hasMinigame =
    currentScene && currentSceneId
      ? game.scenes[currentSceneId].nodes.some((node) => node.type === 'minigame' && node.url)
      : false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const showEndScreen = !hasConfiguredChoices && (!hasMinigame || minigameCompleted);

  useEffect(() => {
    if (showEndScreen && game.id) {
      analytics.trackComplete(game.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEndScreen]);

  // Update image when scene changes
  useEffect(() => {
    if (isGameStarted && currentScene) {
      const newImageNode = currentScene.nodes.find((n) => n.type === 'static_image' || n.type === 'ai_image');
      if (newImageNode && 'url' in newImageNode && newImageNode.url) {
        if (newImageNode.url !== currentImageUrl) {
          setImageLoading(true);
          setCurrentImageUrl(newImageNode.url);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, currentScene, currentImageUrl, isGameStarted]);

  // Track scene visit (separate effect to avoid duplicate calls)
  useEffect(() => {
    if (isGameStarted && game.id && currentSceneId) {
      analytics.trackScene(game.id, currentSceneId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, isGameStarted]);

  // 场景切换时自动播放语音
  useEffect(() => {
    if (isGameStarted && currentScene) {
      // 停止之前的音频
      audioPlayer.stop();

      // 查找文本节点的音频
      const textNode = currentScene.nodes.find((n) => n.type === 'text' && 'audio_url' in n && n.audio_url);
      if (textNode && 'audio_url' in textNode && textNode.audio_url) {
        // 延迟播放，让用户先看到文字
        setTimeout(() => {
          audioPlayer.play(textNode.audio_url!);
        }, 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, isGameStarted]);

  // Save progress whenever state changes
  useEffect(() => {
    if (isLoaded && isGameStarted) {
      localStorage.setItem(
        `game_progress_${slug}`,
        JSON.stringify({
          sceneId: currentSceneId,
          state: runtimeState,
          imageUrl: currentImageUrl,
        }),
      );
    }
  }, [currentSceneId, runtimeState, slug, isLoaded, currentImageUrl, isGameStarted]);

  const handleStartGame = () => {
    setIsGameStarted(true);
    if (!localStorage.getItem(`game_progress_${slug}`)) {
      setCurrentSceneId(game.startSceneId || 'start');
      setRuntimeState(extractRuntimeState(game.initialState));
    }
  };

  const handleRestart = async (noConfirm = false) => {
    const confirmed = noConfirm || (await dialog.confirm(t('restartConfirm')));
    if (!confirmed) return;

    localStorage.removeItem(`game_progress_${slug}`);
    setCurrentSceneId(game.startSceneId || 'start');
    setRuntimeState(extractRuntimeState(game.initialState));
    setCurrentImageUrl(undefined);
    setIsGameStarted(false);
    trackedScenes.current.clear(); // Clear tracked scenes

    const startScene = game.scenes[game.startSceneId || 'start'];
    const firstImage = startScene?.nodes.find((n) => n.type === 'static_image' || n.type === 'ai_image');
    if (firstImage && 'url' in firstImage && firstImage.url) {
      setCurrentImageUrl(firstImage.url);
    }
  };

  const handleChoice = (nextSceneId: string, setInstruction?: string, choiceIndex?: number) => {
    if (game.id && typeof choiceIndex === 'number') {
      analytics.trackChoice(game.id, currentSceneId, choiceIndex);
    }

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
    // 切换场景时重置小游戏完成状态和停止音频
    setMinigameCompleted(false);
    setTextVisible(true);
    setHasReadAll(false);
    setAutoScrolling(true);
    audioPlayer.stop();
  };

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

      // Check if reached bottom
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

  // 处理小游戏完成后的变量更新
  const handleMiniGameComplete = (updatedVars: Record<string, number | string | boolean>) => {
    const newState = { ...runtimeState, ...updatedVars };
    setRuntimeState(newState);
    setMinigameCompleted(true);

    // 检查触发器
    const triggerScene = checkTriggers(newState);
    if (triggerScene && game.scenes[triggerScene]) {
      setCurrentSceneId(triggerScene);
      setMinigameCompleted(false);
    }
  };

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

      {/* Image and Content Container - 移动端时文本叠加在图片上 */}
      <div className="relative flex-1 sm:flex-none sm:block overflow-hidden">
        {/* Persistent Image Display */}
        {currentImageUrl && (
          <div className="w-full sm:relative absolute inset-0 overflow-hidden bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImageUrl}
              alt="Scene"
              className={`w-full h-full object-cover sm:h-auto sm:object-contain transition-opacity duration-700 ease-in-out ${imageLoading ? 'opacity-50 blur-sm' : 'opacity-100 blur-0'}`}
              onLoad={() => setImageLoading(false)}
              onClick={handleImageClick}
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
            {currentScene.nodes.map((node, index) => {
              switch (node.type) {
                case 'text': {
                  const hasTextAudio = 'audio_url' in node && !!node.audio_url;
                  return (
                    <div
                      key={index}
                      className="sm:space-y-2">
                      <div
                        className={`prose prose-lg max-w-none ${currentImageUrl ? 'prose-invert sm:prose-gray' : 'prose-gray'}`}>
                        <ReactMarkdown>{interpolateVariables(node.content, runtimeState)}</ReactMarkdown>
                      </div>
                      {hasTextAudio && (
                        <AudioControls
                          audioPlayer={audioPlayer}
                          hasAudio={hasTextAudio}
                        />
                      )}
                    </div>
                  );
                }

                case 'static_image':
                case 'ai_image':
                  return null;

                case 'minigame':
                  if (!node.url) return null;
                  return (
                    <MiniGamePlayer
                      key={index}
                      url={node.url}
                      variables={node.variables || []}
                      runtimeState={runtimeState}
                      onComplete={handleMiniGameComplete}
                    />
                  );

                case 'choice':
                  if (hasMinigame && !minigameCompleted) {
                    return null;
                  }
                  if (!evaluateCondition(node.condition, runtimeState)) {
                    return null;
                  }
                  // 移动端：阅读完才显示；桌面端：始终显示
                  if (!hasReadAll && currentImageUrl) {
                    return null;
                  }
                  const hasChoiceAudio = 'audio_url' in node && !!node.audio_url;
                  return (
                    <button
                      key={index}
                      className={`w-full text-left px-4 py-2 sm:py-4 border-2 rounded-xl transition-all group shadow-sm hover:shadow-md flex items-center gap-3 ${currentImageUrl ? 'bg-white/90 backdrop-blur-sm border-white/50 hover:bg-white hover:border-orange-400 sm:bg-transparent sm:backdrop-blur-none sm:border-amber-100' : 'border-amber-100'} hover:border-orange-400 hover:bg-orange-50`}
                      onClick={() => handleChoice(node.nextSceneId, node.set, index)}>
                      {hasChoiceAudio && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            audioPlayer.play((node as { audio_url: string }).audio_url);
                          }}
                          className="p-2 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-600 transition-colors flex-shrink-0"
                          title="播放语音">
                          <Volume2 size={16} />
                        </button>
                      )}
                      <span className="font-medium text-amber-800 group-hover:text-orange-700 text-lg flex-1">
                        {interpolateVariables(node.text, runtimeState)}
                      </span>
                    </button>
                  );

                default:
                  return null;
              }
            })}

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
