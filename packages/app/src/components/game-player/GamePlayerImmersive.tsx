'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PlayableGame, PlayableScene, RuntimeState, TextBoxPosition } from '@mui-gamebook/parser/src/types';
import { isVariableMeta, extractRuntimeState, getVisibleVariables } from '@mui-gamebook/parser/src/utils';
import { evaluateCondition, executeSet, interpolateVariables } from '@mui-gamebook/site-common/utils';
import Link from 'next/link';
import { useDialog } from '@/components/Dialog';
import ShareButton from '@/components/ShareButton';
import Comment from '@/components/Comment';
import { Button } from '@radix-ui/themes';
import { ChevronDown, MessageSquare, X } from 'lucide-react';
import { useGameAnalytics } from '@/hooks/useGameAnalytics';
import TitleScreen from './TitleScreen';
import EndScreen from './EndScreen';
import ImmersiveBackground from './ImmersiveBackground';
import ImmersiveTextBox from './ImmersiveTextBox';
import FloatingVariablePanel from './FloatingVariablePanel';
import { useImmersiveMode } from './hooks/useImmersiveMode';

const POSITION_STORAGE_KEY = 'immersive_text_pos';
const POSITIONS: TextBoxPosition[] = ['bottom', 'center', 'top'];
const POSITION_LABEL: Record<TextBoxPosition, string> = {
  bottom: '底部',
  center: '居中',
  top: '顶部',
};

function isImageNode(
  node: PlayableScene['nodes'][number],
): node is Extract<PlayableScene['nodes'][number], { type: 'static_image' } | { type: 'ai_image' }> {
  return node.type === 'static_image' || node.type === 'ai_image';
}

function isTextNode(
  node: PlayableScene['nodes'][number],
): node is Extract<PlayableScene['nodes'][number], { type: 'text' }> {
  return node.type === 'text';
}

export default function GamePlayerImmersive({ game, slug }: { game: PlayableGame & { id?: number }; slug: string }) {
  useImmersiveMode();

  const t = useTranslations('game');
  const dialog = useDialog();
  const analytics = useGameAnalytics();

  const [currentSceneId, setCurrentSceneId] = useState<string>(game.startSceneId || 'start');
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => extractRuntimeState(game.initialState));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [textIndex, setTextIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);

  const [textPosition, setTextPosition] = useState<TextBoxPosition>(game.text_box_position || 'bottom');

  const visibleVariables = getVisibleVariables(game.initialState);

  // 加载保存的阅读器位置偏好
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (saved && POSITIONS.includes(saved as TextBoxPosition)) {
      setTextPosition(saved as TextBoxPosition);
    }
  }, []);

  function changeTextPosition(pos: TextBoxPosition) {
    setTextPosition(pos);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(POSITION_STORAGE_KEY, pos);
    }
  }

  // 变量触发器
  const checkTriggers = useCallback(
    (state: RuntimeState): string | null => {
      for (const [key, val] of Object.entries(game.initialState)) {
        if (isVariableMeta(val) && val.trigger) {
          const condition = `${state[key]} ${val.trigger.condition}`;
          if (evaluateCondition(condition, {})) {
            return val.trigger.scene;
          }
        }
      }
      return null;
    },
    [game.initialState],
  );

  // 恢复进度
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`game_progress_${slug}`) : null;
    if (saved) {
      try {
        const { sceneId, state, imageUrl } = JSON.parse(saved);
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
      const firstImage = startScene?.nodes.find(isImageNode);
      if (firstImage && 'url' in firstImage && firstImage.url) {
        setCurrentImageUrl(firstImage.url);
      }
    }
    setIsLoaded(true);
  }, [slug, game.scenes, game.startSceneId]);

  useEffect(() => {
    if (game.id) analytics.trackOpen(game.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentScene = game.scenes[currentSceneId];

  // 当前场景的有序文本节点
  const textNodes = useMemo(() => {
    if (!currentScene) return [];
    return currentScene.nodes.filter(isTextNode);
  }, [currentScene]);

  // 当前文字节点对应的背景图：取当前位置之前出现的最近一张图
  const activeBgUrl = useMemo(() => {
    if (!currentScene) return currentImageUrl;
    const nodes = currentScene.nodes;
    let lastImg: string | undefined;
    let textCount = 0;
    for (const node of nodes) {
      if (isImageNode(node) && 'url' in node && node.url) {
        lastImg = node.url;
      }
      if (isTextNode(node)) {
        if (textCount === textIndex) {
          return lastImg || currentImageUrl;
        }
        textCount += 1;
      }
    }
    return lastImg || currentImageUrl;
  }, [currentScene, textIndex, currentImageUrl]);

  // 场景切换后：重置 textIndex，更新背景图基线
  useEffect(() => {
    if (!isGameStarted || !currentScene) return;
    setTextIndex(0);
    const firstImg = currentScene.nodes.find(isImageNode);
    if (firstImg && 'url' in firstImg && firstImg.url) {
      setCurrentImageUrl(firstImg.url);
    }
    if (game.id) analytics.trackScene(game.id, currentSceneId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, isGameStarted]);

  // 保存进度
  useEffect(() => {
    if (isLoaded && isGameStarted) {
      localStorage.setItem(
        `game_progress_${slug}`,
        JSON.stringify({ sceneId: currentSceneId, state: runtimeState, imageUrl: activeBgUrl }),
      );
    }
  }, [currentSceneId, runtimeState, slug, isLoaded, isGameStarted, activeBgUrl]);

  const hasConfiguredChoices = currentScene ? currentScene.nodes.some((n) => n.type === 'choice') : false;
  const showEndScreen = !hasConfiguredChoices && textNodes.length > 0 && textIndex >= textNodes.length - 1;
  const isLastText = textNodes.length === 0 || textIndex >= textNodes.length - 1;

  function handleStart() {
    setIsGameStarted(true);
    if (!localStorage.getItem(`game_progress_${slug}`)) {
      setCurrentSceneId(game.startSceneId || 'start');
      setRuntimeState(extractRuntimeState(game.initialState));
      setTextIndex(0);
    }
  }

  async function handleRestart(noConfirm = false) {
    const confirmed = noConfirm || (await dialog.confirm(t('restartConfirm')));
    if (!confirmed) return;
    localStorage.removeItem(`game_progress_${slug}`);
    setCurrentSceneId(game.startSceneId || 'start');
    setRuntimeState(extractRuntimeState(game.initialState));
    setCurrentImageUrl(undefined);
    setTextIndex(0);
    setIsGameStarted(false);
  }

  function handleAdvance() {
    if (textIndex < textNodes.length - 1) {
      setTextIndex(textIndex + 1);
    }
  }

  function handleChoice(nextSceneId: string, setInstruction?: string, choiceIndex?: number) {
    if (game.id && typeof choiceIndex === 'number') {
      analytics.trackChoice(game.id, currentSceneId, choiceIndex);
    }
    let newState = runtimeState;
    if (setInstruction) {
      newState = executeSet(setInstruction, runtimeState);
      setRuntimeState(newState);
    }
    const triggerScene = checkTriggers(newState);
    setCurrentSceneId(triggerScene && game.scenes[triggerScene] ? triggerScene : nextSceneId);
  }

  useEffect(() => {
    if (showEndScreen && game.id) analytics.trackComplete(game.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEndScreen]);

  if (!isLoaded) {
    return <div className="min-h-dvh flex items-center justify-center text-white bg-black">{t('loading')}</div>;
  }

  if (!isGameStarted) {
    return (
      <TitleScreen
        game={game}
        onStart={handleStart}
      />
    );
  }

  if (!currentScene) {
    return (
      <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-xl font-bold text-red-400">{t('sceneNotFound')}</h2>
        <p>{t('cannotFindScene', { sceneId: currentSceneId })}</p>
        <Button
          variant="soft"
          onClick={() => handleRestart()}>
          {t('backToTitle')}
        </Button>
      </div>
    );
  }

  const currentText = textNodes[textIndex];
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const choices = currentScene.nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.type === 'choice');

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <ImmersiveBackground url={activeBgUrl} />

      {/* 左上角面包屑：MuiStory › [Title ▾] */}
      <div className="absolute top-4 left-4 z-40">
        <div className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-md ring-1 ring-white/10 rounded-full pl-3 pr-1 py-1 text-sm text-white">
          <Link
            href="/"
            className="text-white/70 hover:text-white transition">
            MuiStory
          </Link>
          <span className="text-white/30">›</span>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/10 transition font-medium"
            aria-haspopup="menu"
            aria-expanded={menuOpen}>
            <span className="max-w-[200px] truncate">{game.title}</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
        {menuOpen && (
          <div className="absolute left-0 mt-2 w-64 bg-black/75 backdrop-blur-md rounded-xl ring-1 ring-white/10 p-3 shadow-2xl text-sm">
            <div className="text-xs uppercase tracking-wider text-white/50 mb-2">文字框位置</div>
            <div className="flex gap-1 mb-3">
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => changeTextPosition(p)}
                  className={`flex-1 px-2 py-1 rounded text-xs transition ${
                    textPosition === p ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}>
                  {POSITION_LABEL[p]}
                </button>
              ))}
            </div>
            <div className="border-t border-white/10 pt-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setCommentOpen(true);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition">
                <MessageSquare size={14} />
                评论
              </button>
              <div className="flex items-center justify-between gap-2 px-1">
                <ShareButton
                  title={game.title}
                  url={shareUrl}
                />
                <Button
                  variant="ghost"
                  color="red"
                  size="1"
                  onClick={() => handleRestart()}>
                  {t('exit')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 评论抽屉 */}
      {commentOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => setCommentOpen(false)}>
          <div
            className="absolute top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white text-gray-900 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between">
              <h3 className="font-semibold">评论</h3>
              <button
                type="button"
                onClick={() => setCommentOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <Comment postId={slug} />
            </div>
          </div>
        </div>
      )}

      <FloatingVariablePanel
        variables={visibleVariables}
        runtimeState={runtimeState}
      />

      {showEndScreen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[min(92vw,640px)]">
            <EndScreen
              title={game.title}
              shareUrl={shareUrl}
              onRestart={handleRestart}
            />
          </div>
        </div>
      )}

      {!showEndScreen && currentText && (
        <ImmersiveTextBox
          paragraphs={textNodes.slice(0, textIndex + 1).map((n) => interpolateVariables(n.content, runtimeState))}
          position={textPosition}
          speed={game.typewriter_speed}
          showContinueHint={!isLastText}
          onAdvance={handleAdvance}>
          {isLastText && choices.length > 0 && (
            <div className="mt-5 space-y-2">
              {choices.map(({ node, index }, choiceOrderIndex) => {
                if (node.type !== 'choice') return null;
                if (!evaluateCondition(node.condition, runtimeState)) return null;
                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChoice(node.nextSceneId, node.set, index);
                    }}
                    className="animate-fade-in block w-full text-left px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 ring-1 ring-white/15 hover:ring-orange-300 text-white transition-all opacity-0"
                    style={{ animationDelay: `${choiceOrderIndex * 120}ms`, animationFillMode: 'forwards' }}>
                    <span className="font-medium text-base">{interpolateVariables(node.text, runtimeState)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </ImmersiveTextBox>
      )}
    </div>
  );
}
