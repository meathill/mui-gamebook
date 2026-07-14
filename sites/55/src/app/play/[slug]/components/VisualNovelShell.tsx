'use client';

import { useState, useCallback, useEffect } from 'react';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import {
  useGamePlayer,
  useSaveSystem,
  useGameControls,
  useGameSettings,
  useRouteMap,
} from '@mui-gamebook/site-common/game-player';
import TitleScreen from './TitleScreen';
import SaveLoadScreen from './SaveLoadScreen';
import RouteMapScreen from './RouteMapScreen';
import SettingsScreen from './SettingsScreen';
import GamePlayScreen from './GamePlayScreen';

/**
 * 游戏界面状态
 */
type GameScreen = 'title' | 'save-load' | 'route-map' | 'settings' | 'playing';

type SaveLoadMode = 'save' | 'load';

interface Props {
  game: PlayableGame;
  gameId: number;
  slug: string;
}

/**
 * 视觉小说游戏壳 — 整合所有画面的状态机
 */
export default function VisualNovelShell({ game, gameId, slug }: Props) {
  const [screen, setScreen] = useState<GameScreen>('title');
  const [saveLoadMode, setSaveLoadMode] = useState<SaveLoadMode>('load');

  // 核心游戏逻辑
  const gamePlayer = useGamePlayer(game, slug, {
    storagePrefix: 'vn_55',
  });

  // 多存档系统
  const saveSystem = useSaveSystem(slug);

  // 游戏控制（自动/跳过）
  const gameControls = useGameControls({
    onAutoAdvance: handleAutoAdvance,
  });

  // 游戏设置
  const gameSettings = useGameSettings(slug);

  // 路线图
  const routeMap = useRouteMap(game, slug);

  // 场景切换时自动存档 + 标记已访问
  useEffect(() => {
    if (gamePlayer.isGameStarted && gamePlayer.currentSceneId) {
      saveSystem.autoSave(gamePlayer.currentSceneId, gamePlayer.runtimeState, {
        sceneLabel: gamePlayer.currentScene?.label,
      });
      routeMap.markVisited(gamePlayer.currentSceneId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamePlayer.currentSceneId, gamePlayer.isGameStarted]);

  // 自动前进：找到第一个有效的 choice 并跳转
  function handleAutoAdvance() {
    if (!gamePlayer.currentScene) return;

    const firstChoice = gamePlayer.currentScene.nodes.find((node) => node.type === 'choice');
    if (firstChoice && firstChoice.type === 'choice') {
      gamePlayer.handleChoice(firstChoice.nextSceneId, firstChoice.set);
    } else {
      // 没有选项时停止自动播放
      gameControls.stopAll();
    }
  }

  // 开始新游戏
  function handleNewGame() {
    gamePlayer.handleStartGame();
    setScreen('playing');
  }

  // 从标题画面继续（进入读档界面）
  function handleContinue() {
    setSaveLoadMode('load');
    setScreen('save-load');
  }

  // 读取存档：恢复场景与变量状态（restoreSave 内部以初始状态为底座合并）
  const handleLoadSave = useCallback(
    (slotId: Parameters<typeof saveSystem.load>[0]) => {
      const data = saveSystem.load(slotId);
      if (!data) return;

      if (gamePlayer.restoreSave(data.sceneId, data.runtimeState)) {
        setScreen('playing');
      }
    },
    [saveSystem, gamePlayer],
  );

  // 手动存档
  function handleSaveGame(slotId: Parameters<typeof saveSystem.save>[0]) {
    saveSystem.save(slotId, gamePlayer.currentSceneId, gamePlayer.runtimeState, {
      sceneLabel: gamePlayer.currentScene?.label,
    });
  }

  // 打开存档界面（从 HUD）
  function handleOpenSaveLoad(mode: SaveLoadMode) {
    setSaveLoadMode(mode);
    gameControls.stopAll();
    setScreen('save-load');
  }

  // 打开路线图
  function handleOpenRouteMap() {
    gameControls.stopAll();
    setScreen('route-map');
  }

  // 打开设置
  function handleOpenSettings() {
    gameControls.stopAll();
    setScreen('settings');
  }

  // 从路线图选择节点进入游戏
  function handleRouteNodeSelect(sceneId: string) {
    gamePlayer.handleStartGame();
    if (sceneId !== (game.startSceneId || 'start')) {
      gamePlayer.handleChoice(sceneId);
    }
    setScreen('playing');
  }

  // 返回标题
  function handleReturnToTitle() {
    gameControls.stopAll();
    setScreen('title');
  }

  // 关闭弹层回到游戏
  function handleCloseOverlay() {
    setScreen('playing');
  }

  // 加载中
  if (!gamePlayer.isLoaded) {
    return (
      <div className="game-shell items-center justify-center">
        <div className="text-primary-light text-lg animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="game-shell relative">
      {/* 根背景画面 */}
      {gamePlayer.isGameStarted && gamePlayer.currentScene ? (
        <GamePlayScreen
          game={game}
          currentScene={gamePlayer.currentScene}
          runtimeState={gamePlayer.runtimeState}
          visibleVariables={gamePlayer.visibleVariables}
          showEndScreen={gamePlayer.showEndScreen}
          isAutoPlaying={gameControls.isAutoPlaying}
          isSkipping={gameControls.isSkipping}
          onChoice={gamePlayer.handleChoice}
          onToggleAutoPlay={gameControls.toggleAutoPlay}
          onToggleSkip={gameControls.toggleSkip}
          onOpenSave={() => handleOpenSaveLoad('save')}
          onOpenLoad={() => handleOpenSaveLoad('load')}
          onOpenRouteMap={handleOpenRouteMap}
          onOpenSettings={handleOpenSettings}
          onReturnToTitle={handleReturnToTitle}
          onRestart={() => {
            gamePlayer.handleRestart(true);
            setScreen('title');
          }}
        />
      ) : (
        <TitleScreen
          game={game}
          hasAutoSave={saveSystem.hasAutoSave}
          onNewGame={handleNewGame}
          onContinue={handleContinue}
        />
      )}

      {/* 浮层界面 */}
      {screen === 'save-load' && (
        <SaveLoadScreen
          mode={saveLoadMode}
          slots={saveSystem.slots}
          onLoad={handleLoadSave}
          onSave={handleSaveGame}
          onDelete={saveSystem.deleteSave}
          onClose={gamePlayer.isGameStarted ? handleCloseOverlay : handleReturnToTitle}
        />
      )}

      {screen === 'route-map' && (
        <RouteMapScreen
          nodes={routeMap.nodes}
          onSelectNode={handleRouteNodeSelect}
          onClose={gamePlayer.isGameStarted ? handleCloseOverlay : handleReturnToTitle}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          settings={gameSettings.settings}
          onUpdateSetting={gameSettings.updateSetting}
          onReset={gameSettings.resetSettings}
          onClose={gamePlayer.isGameStarted ? handleCloseOverlay : handleReturnToTitle}
        />
      )}
    </div>
  );
}
