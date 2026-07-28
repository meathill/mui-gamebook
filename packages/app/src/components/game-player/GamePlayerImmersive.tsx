'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PlayableGame, PlayableScene, TextBoxPosition } from '@mui-gamebook/parser/src/types';
import { useGamePlayer } from '@mui-gamebook/site-common/game-player';
import {
  evaluateCondition,
  formatDialogueLine,
  interpolateVariables,
  resolveSpeakerName,
} from '@mui-gamebook/site-common/utils';
import { useDialog } from '@/components/Dialog';
import Button from '@/components/Button';
import { useGameAnalytics } from '@/hooks/useGameAnalytics';
import TitleScreen from './TitleScreen';
import EndScreen from './EndScreen';
import ImmersiveBackground from './ImmersiveBackground';
import ImmersiveTextBox from './ImmersiveTextBox';
import ImmersiveMenu from './ImmersiveMenu';
import CommentDrawer from './CommentDrawer';
import FloatingVariablePanel from './FloatingVariablePanel';
import { useImmersiveMode } from './hooks/useImmersiveMode';
import { type GamePanel, useGameHashRoute } from './hooks/useGameHashRoute';

const POSITION_STORAGE_KEY = 'immersive_text_pos';
const POSITIONS: TextBoxPosition[] = ['bottom', 'center', 'top'];
const PANELS: readonly GamePanel[] = ['settings', 'comments'];

function isImageNode(
  node: PlayableScene['nodes'][number],
): node is Extract<PlayableScene['nodes'][number], { type: 'static_image' } | { type: 'ai_image' }> {
  return node.type === 'static_image' || node.type === 'ai_image';
}

function isProseNode(
  node: PlayableScene['nodes'][number],
): node is Extract<PlayableScene['nodes'][number], { type: 'text' } | { type: 'dialogue' }> {
  return node.type === 'text' || node.type === 'dialogue';
}

export default function GamePlayerImmersive({ game, slug }: { game: PlayableGame & { id?: number }; slug: string }) {
  const route = useGameHashRoute(PANELS);
  const isPlaying = route.view === 'play';
  // 只有真正进入游戏才锁滚动、藏 header/footer；标题页保持普通页面
  useImmersiveMode(isPlaying);

  const t = useTranslations('game');
  const dialog = useDialog();
  const analytics = useGameAnalytics();

  const [textIndex, setTextIndex] = useState(0);
  const [choicesRevealed, setChoicesRevealed] = useState(false);
  const [textPosition, setTextPosition] = useState<TextBoxPosition>(game.text_box_position || 'bottom');

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
    visibleVariables,
    hasConfiguredChoices,
    redirectTarget,
    handleStartGame,
    handleRestart,
    handleChoice,
    handleContinue,
  } = gamePlayer;

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

  useEffect(() => {
    if (game.id) analytics.trackOpen(game.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当前场景的有序文本节点
  const textNodes = useMemo(() => {
    if (!currentScene) return [];
    return currentScene.nodes.filter(isProseNode);
  }, [currentScene]);

  // 当前文字节点对应的背景图：取当前位置之前出现的最近一张图，找不到则回退到 gamePlayer 追踪的场景基线图
  const activeBgUrl = useMemo(() => {
    if (!currentScene) return currentImageUrl;
    const nodes = currentScene.nodes;
    let lastImg: string | undefined;
    let textCount = 0;
    for (const node of nodes) {
      if (isImageNode(node) && 'url' in node && node.url) {
        lastImg = node.url;
      }
      if (isProseNode(node)) {
        if (textCount === textIndex) {
          return lastImg || currentImageUrl;
        }
        textCount += 1;
      }
    }
    return lastImg || currentImageUrl;
  }, [currentScene, textIndex, currentImageUrl]);

  // 场景切换后：重置 textIndex / choicesRevealed，上报场景访问
  useEffect(() => {
    if (!isPlaying || !currentScene) return;
    setTextIndex(0);
    setChoicesRevealed(false);
    if (game.id) analytics.trackScene(game.id, currentSceneId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneId, isPlaying]);

  // 回到标题画面时（初始挂载或重新开始成功后）重置文本推进进度
  useEffect(() => {
    if (!isPlaying) setTextIndex(0);
  }, [isPlaying]);

  // 进入游戏视图时确保这一局已初始化。三条入口都走这里：点「开始冒险」、点「继续冒险」、
  // 冷启动 #play 深链。handleStartGame 内部自己读 localStorage：有档不重置（=继续），无档从头开始
  useEffect(() => {
    if (!isLoaded || !isPlaying || hasSave) return;
    handleStartGame();
  }, [isLoaded, isPlaying, hasSave, handleStartGame]);

  const showEndScreen =
    !hasConfiguredChoices && !redirectTarget && textNodes.length > 0 && textIndex >= textNodes.length - 1;
  const isLastText = textNodes.length === 0 || textIndex >= textNodes.length - 1;

  /** 清档回标题。noConfirm 用于结局页「再玩一次」和存档失效时的兜底恢复 */
  async function resetToTitle(noConfirm = false) {
    if (await handleRestart(noConfirm)) route.goToView('intro');
  }

  /** 标题页的「重新开始」：确认后清档，直接从头开始新的一局 */
  async function handleRestartFromTitle() {
    if (await handleRestart()) route.goToView('play');
  }

  function handleAdvance() {
    if (textIndex < textNodes.length - 1) {
      setTextIndex(textIndex + 1);
      return;
    }
    // 读完全部文本：有块级重定向时点按直接路由（DSL v2），否则揭示选项
    if (!hasConfiguredChoices && redirectTarget) {
      handleContinue();
      return;
    }
    if (!choicesRevealed) {
      setChoicesRevealed(true);
    }
  }

  useEffect(() => {
    if (showEndScreen && game.id) analytics.trackComplete(game.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEndScreen]);

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
      <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-xl font-bold text-red-400">{t('sceneNotFound')}</h2>
        <p>{t('cannotFindScene', { sceneId: currentSceneId })}</p>
        {/* 存档指向了不存在的场景，必须清档，否则回标题页点「继续」会死循环 */}
        <Button
          variant="soft"
          size="lg"
          onClick={() => resetToTitle(true)}>
          {t('backToTitle')}
        </Button>
      </div>
    );
  }

  const currentText = textNodes[textIndex];
  // 不用 location.href：视图状态在 hash 里，分享出去的链接不该带上 #settings 之类
  const shareUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';

  const choices = currentScene.nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.type === 'choice');

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <ImmersiveBackground url={activeBgUrl} />

      <ImmersiveMenu
        title={game.title}
        shareUrl={shareUrl}
        open={route.panel === 'settings'}
        textPosition={textPosition}
        onToggle={() => (route.panel === 'settings' ? route.closePanel() : route.openPanel('settings'))}
        onChangeTextPosition={changeTextPosition}
        onOpenComments={() => route.openPanel('comments')}
        onBackToTitle={() => route.goToView('intro')}
        onRestart={() => resetToTitle()}
      />

      {route.panel === 'comments' && (
        <CommentDrawer
          postId={slug}
          onClose={route.closePanel}
        />
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
              onRestart={resetToTitle}
            />
          </div>
        </div>
      )}

      {!showEndScreen && currentText && (
        <ImmersiveTextBox
          paragraphs={textNodes
            .slice(0, textIndex + 1)
            .map((n) =>
              n.type === 'dialogue'
                ? formatDialogueLine(
                    resolveSpeakerName(n.speaker, game.characters),
                    interpolateVariables(n.content, runtimeState),
                  )
                : interpolateVariables(n.content, runtimeState),
            )}
          position={textPosition}
          speed={game.typewriter_speed}
          showContinueHint={!isLastText || (choices.length > 0 && !choicesRevealed) || !!redirectTarget}
          onAdvance={handleAdvance}>
          {isLastText && choicesRevealed && choices.length > 0 && (
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
