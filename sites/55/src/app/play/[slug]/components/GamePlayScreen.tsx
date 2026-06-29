'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MapIcon,
  SettingsIcon,
  SaveIcon,
  FolderOpenIcon,
  PlayIcon,
  FastForwardIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import type { PlayableGame, PlayableScene, RuntimeState } from '@mui-gamebook/parser/src/types';
import {
  evaluateCondition,
  interpolateVariables,
  useSfx,
  useGameSettings,
} from '@mui-gamebook/site-common/game-player';
import type { getVisibleVariables } from '@mui-gamebook/parser/src/utils';

interface Props {
  game: PlayableGame;
  currentScene: PlayableScene;
  runtimeState: RuntimeState;
  visibleVariables: ReturnType<typeof getVisibleVariables>;
  showEndScreen: boolean;
  isAutoPlaying: boolean;
  isSkipping: boolean;
  onChoice: (nextSceneId: string, setInstruction?: string) => void;
  onToggleAutoPlay: () => void;
  onToggleSkip: () => void;
  onOpenSave: () => void;
  onOpenLoad: () => void;
  onOpenRouteMap: () => void;
  onOpenSettings: () => void;
  onReturnToTitle: () => void;
  onRestart: () => void;
}

/**
 * 打字机效果文本组件
 */
function TypewriterText({
  text,
  speed = 40,
  onFinished,
  forceInstant = false,
  onTick,
}: {
  text: string;
  speed?: number;
  onFinished?: () => void;
  forceInstant?: boolean;
  onTick?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState(forceInstant ? text : '');
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (forceInstant) {
      setDisplayedText(text);
      onFinishedRef.current?.();
      return;
    }

    setDisplayedText('');
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex++;
      setDisplayedText(text.slice(0, currentIndex));
      onTickRef.current?.();
      if (currentIndex >= text.length) {
        clearInterval(interval);
        onFinishedRef.current?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, forceInstant]);

  return <span>{displayedText}</span>;
}

/**
 * 游戏主画面
 * 包含场景内容渲染和底部 HUD 栏
 */
export default function GamePlayScreen({
  game,
  currentScene,
  runtimeState,
  visibleVariables,
  showEndScreen,
  isAutoPlaying,
  isSkipping,
  onChoice,
  onToggleAutoPlay,
  onToggleSkip,
  onOpenSave,
  onOpenLoad,
  onOpenRouteMap,
  onOpenSettings,
  onReturnToTitle,
  onRestart,
}: Props) {
  // 引入设置及音效系统
  const { settings } = useGameSettings(game.slug);
  const sfx = useSfx(settings.sfxVolume);

  // 滚动容器 ref
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部函数
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // 提取场景图片
  const imageNode = currentScene.nodes.find((n) => n.type === 'static_image' || n.type === 'ai_image');
  const imageUrl = imageNode && 'url' in imageNode ? imageNode.url : undefined;

  // 提取当前场景的文本节点
  const textNodes = useMemo(() => {
    return currentScene.nodes.filter((node) => node.type === 'text');
  }, [currentScene.nodes]);

  const [visibleTextCount, setVisibleTextCount] = useState(1);
  const [typingFinished, setTypingFinished] = useState(false);
  const [forceInstant, setForceInstant] = useState(false);

  // 当场景发生变化时，重置所有打字相关的状态
  useEffect(() => {
    setVisibleTextCount(1);
    setForceInstant(false);
    if (textNodes.length === 0) {
      setTypingFinished(true);
    } else {
      setTypingFinished(false);
    }
  }, [currentScene.id, textNodes.length]);

  // 文字数量增长、打字完成或场景切换时触发自动滚动
  useEffect(() => {
    scrollToBottom();
    const t = setTimeout(scrollToBottom, 60);
    return () => clearTimeout(t);
  }, [visibleTextCount, typingFinished, currentScene.id, scrollToBottom]);

  const handleNext = useCallback(() => {
    if (showEndScreen && visibleTextCount >= textNodes.length && typingFinished) return;

    // 如果当前句子还在打字，立刻完成打字
    if (!typingFinished) {
      setForceInstant(true);
      setTypingFinished(true);
      return;
    }

    // 如果还有下一句，显示下一句
    if (visibleTextCount < textNodes.length) {
      setVisibleTextCount((prev) => prev + 1);
      setTypingFinished(false);
      setForceInstant(false);
      sfx.playNext();
    }
  }, [visibleTextCount, textNodes.length, typingFinished, showEndScreen, sfx]);

  // 监听键盘事件 (空格 / 回车)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext]);

  // 自动播放处理
  useEffect(() => {
    if (!isAutoPlaying) return;

    if (typingFinished) {
      const timer = setTimeout(() => {
        if (visibleTextCount < textNodes.length) {
          handleNext();
        }
      }, 2000); // 文字显示完后停顿 2 秒
      return () => clearTimeout(timer);
    }
  }, [isAutoPlaying, typingFinished, visibleTextCount, textNodes.length, handleNext]);

  // 跳过（快进）处理
  useEffect(() => {
    if (isSkipping) {
      setVisibleTextCount(textNodes.length);
      setTypingFinished(true);
      setForceInstant(true);
    }
  }, [isSkipping, textNodes.length]);

  const allTextsShown = visibleTextCount >= textNodes.length && typingFinished;

  return (
    <div className="flex flex-col h-full">
      {/* 场景区域 */}
      <div
        ref={scrollRef}
        className="flex-1 relative overflow-y-auto cursor-pointer select-none"
        onClick={handleNext}>
        {/* 场景背景图 */}
        {imageUrl && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        )}

        {/* 内容 */}
        <div className="relative z-10 flex flex-col justify-end min-h-full p-6 pb-4">
          {/* 变量状态栏 */}
          {visibleVariables.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {visibleVariables.map(({ key, meta }) => (
                <div
                  key={key}
                  className="px-3 py-1 rounded-full text-sm bg-surface border border-border">
                  <span className="text-muted">{meta.label || key}: </span>
                  <span className="font-medium text-primary-light">{runtimeState[key]}</span>
                </div>
              ))}
            </div>
          )}

          {/* 场景文字 */}
          <div className="space-y-4 mb-6">
            {textNodes.slice(0, visibleTextCount).map((node, index) => {
              const textContent = interpolateVariables(node.content, runtimeState);
              const isLast = index === visibleTextCount - 1;

              return (
                <p
                  key={index}
                  className="game-text">
                  {isLast ? (
                    <TypewriterText
                      text={textContent}
                      speed={game.typewriter_speed ?? 40}
                      forceInstant={forceInstant}
                      onFinished={() => setTypingFinished(true)}
                      onTick={sfx.playTick}
                    />
                  ) : (
                    <span>{textContent}</span>
                  )}
                </p>
              );
            })}
          </div>

          {/* 选项 */}
          {allTextsShown && !showEndScreen && (
            <div className="space-y-2">
              {currentScene.nodes.map((node, index) => {
                if (node.type !== 'choice') return null;
                if (!evaluateCondition(node.condition, runtimeState)) return null;

                return (
                  <button
                    key={index}
                    className="choice-btn animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
                    onMouseEnter={sfx.playHover}
                    onClick={(e) => {
                      e.stopPropagation();
                      sfx.playClick();
                      onChoice(node.nextSceneId, node.set);
                    }}>
                    {interpolateVariables(node.text, runtimeState)}
                  </button>
                );
              })}
            </div>
          )}

          {/* 结局 */}
          {allTextsShown && showEndScreen && (
            <div className="text-center py-8 animate-fade-in">
              <p className="text-lg text-muted mb-6">— 故事结束 —</p>
              <div className="flex gap-3 justify-center">
                <button
                  onMouseEnter={sfx.playHover}
                  onClick={(e) => {
                    e.stopPropagation();
                    sfx.playClick();
                    onRestart();
                  }}
                  className="btn btn-ghost">
                  重新开始
                </button>
                <button
                  onMouseEnter={sfx.playHover}
                  onClick={(e) => {
                    e.stopPropagation();
                    sfx.playClick();
                    onReturnToTitle();
                  }}
                  className="btn btn-primary">
                  返回标题
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部 HUD */}
      <div className="hud-bar justify-between border-t border-border">
        <div className="flex items-center gap-1">
          <button
            onMouseEnter={sfx.playHover}
            onClick={() => {
              sfx.playClick();
              onReturnToTitle();
            }}
            className="hud-btn"
            title="返回标题">
            <ArrowLeftIcon size={16} />
          </button>
          <button
            onMouseEnter={sfx.playHover}
            onClick={() => {
              sfx.playClick();
              onOpenRouteMap();
            }}
            className="hud-btn"
            title="路线图">
            <MapIcon size={16} />
            <span className="hidden sm:inline">路线图</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onMouseEnter={sfx.playHover}
            onClick={() => {
              sfx.playClick();
              onToggleAutoPlay();
            }}
            className={`hud-btn ${isAutoPlaying ? 'hud-btn--active' : ''}`}
            title="自动">
            <PlayIcon size={16} />
            <span className="hidden sm:inline">自动</span>
          </button>
          <button
            onMouseEnter={sfx.playHover}
            onClick={() => {
              sfx.playClick();
              onToggleSkip();
            }}
            className={`hud-btn ${isSkipping ? 'hud-btn--active' : ''}`}
            title="跳过">
            <FastForwardIcon size={16} />
            <span className="hidden sm:inline">跳过</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onMouseEnter={sfx.playHover}
            onClick={() => {
              sfx.playClick();
              onOpenSave();
            }}
            className="hud-btn"
            title="存档">
            <SaveIcon size={16} />
            <span className="hidden sm:inline">存档</span>
          </button>
          <button
            onMouseEnter={sfx.playHover}
            onClick={() => {
              sfx.playClick();
              onOpenLoad();
            }}
            className="hud-btn"
            title="读档">
            <FolderOpenIcon size={16} />
            <span className="hidden sm:inline">读档</span>
          </button>
          <button
            onMouseEnter={sfx.playHover}
            onClick={() => {
              sfx.playClick();
              onOpenSettings();
            }}
            className="hud-btn"
            title="设置">
            <SettingsIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
