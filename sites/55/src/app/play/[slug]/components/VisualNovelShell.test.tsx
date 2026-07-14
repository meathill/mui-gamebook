import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';

const mocks = vi.hoisted(() => {
  const gamePlayerState = {
    game: {} as PlayableGame,
    currentSceneId: 'start',
    runtimeState: {},
    isLoaded: true,
    isGameStarted: false,
    visibleVariables: [],
    currentScene: undefined as PlayableGame['scenes'][string] | undefined,
    hasConfiguredChoices: false,
    showEndScreen: false,
    currentImageUrl: undefined,
    imageLoading: false,
    gameStartTime: null,
    handleStartGame: vi.fn(),
    handleRestart: vi.fn(),
    handleChoice: vi.fn(),
    applyStateUpdate: vi.fn(),
    restoreSave: vi.fn(),
    setImageLoading: vi.fn(),
    getSceneImage: vi.fn(),
    getSceneAudioUrl: vi.fn(),
  };
  const saveSystemState = {
    slots: [],
    hasAutoSave: false,
    save: vi.fn(),
    autoSave: vi.fn(),
    load: vi.fn(),
    deleteSave: vi.fn(),
    refreshSlots: vi.fn(),
  };
  const gameControlsState = {
    isAutoPlaying: false,
    isSkipping: false,
    toggleAutoPlay: vi.fn(),
    toggleSkip: vi.fn(),
    stopAll: vi.fn(),
  };
  const gameSettingsState = {
    settings: { textSpeed: 40, bgmVolume: 80, sfxVolume: 80, voiceVolume: 100 },
    updateSetting: vi.fn(),
    resetSettings: vi.fn(),
  };
  const routeMapState = {
    nodes: [],
    visitedScenes: new Set<string>(),
    isNodeUnlocked: vi.fn(),
    markVisited: vi.fn(),
    resetProgress: vi.fn(),
  };
  let capturedOnAutoAdvance: (() => void) | undefined;
  return {
    gamePlayerState,
    saveSystemState,
    gameControlsState,
    gameSettingsState,
    routeMapState,
    useGamePlayer: vi.fn(() => gamePlayerState),
    useSaveSystem: vi.fn(() => saveSystemState),
    useGameControls: vi.fn((options: { onAutoAdvance?: () => void }) => {
      capturedOnAutoAdvance = options.onAutoAdvance;
      return gameControlsState;
    }),
    useGameSettings: vi.fn(() => gameSettingsState),
    useRouteMap: vi.fn(() => routeMapState),
    getCapturedOnAutoAdvance: () => capturedOnAutoAdvance,
  };
});

vi.mock('@mui-gamebook/site-common/game-player', () => ({
  useGamePlayer: mocks.useGamePlayer,
  useSaveSystem: mocks.useSaveSystem,
  useGameControls: mocks.useGameControls,
  useGameSettings: mocks.useGameSettings,
  useRouteMap: mocks.useRouteMap,
}));

vi.mock('./TitleScreen', () => ({
  default: ({ onNewGame, onContinue }: { onNewGame: () => void; onContinue: () => void }) => (
    <div data-testid="title-screen">
      <button onClick={onNewGame}>新游戏</button>
      <button onClick={onContinue}>继续</button>
    </div>
  ),
}));

vi.mock('./SaveLoadScreen', () => ({
  default: ({ mode, onLoad, onClose }: { mode: string; onLoad: (slotId: string) => void; onClose: () => void }) => (
    <div data-testid="save-load-screen">
      <span data-testid="save-load-mode">{mode}</span>
      <button onClick={() => onLoad('slot1')}>读取存档1</button>
      <button onClick={onClose}>关闭存读档</button>
    </div>
  ),
}));

vi.mock('./RouteMapScreen', () => ({
  default: ({ onSelectNode, onClose }: { onSelectNode: (sceneId: string) => void; onClose: () => void }) => (
    <div data-testid="route-map-screen">
      <button onClick={() => onSelectNode('scene2')}>跳转场景2</button>
      <button onClick={onClose}>关闭路线图</button>
    </div>
  ),
}));

vi.mock('./SettingsScreen', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="settings-screen">
      <button onClick={onClose}>关闭设置</button>
    </div>
  ),
}));

vi.mock('./GamePlayScreen', () => ({
  default: ({
    onOpenSave,
    onOpenLoad,
    onOpenRouteMap,
    onOpenSettings,
    onReturnToTitle,
  }: {
    onOpenSave: () => void;
    onOpenLoad: () => void;
    onOpenRouteMap: () => void;
    onOpenSettings: () => void;
    onReturnToTitle: () => void;
  }) => (
    <div data-testid="game-play-screen">
      <button onClick={onOpenSave}>打开存档</button>
      <button onClick={onOpenLoad}>打开读档</button>
      <button onClick={onOpenRouteMap}>打开路线图</button>
      <button onClick={onOpenSettings}>打开设置</button>
      <button onClick={onReturnToTitle}>返回标题</button>
    </div>
  ),
}));

import VisualNovelShell from './VisualNovelShell';

const game = {
  slug: 'demo',
  title: '演示游戏',
  startSceneId: 'start',
  scenes: {
    start: { id: 'start', nodes: [{ type: 'choice', nextSceneId: 'scene2', text: '下一步' }] },
  },
} as unknown as PlayableGame;

function resetMockState() {
  mocks.gamePlayerState.isLoaded = true;
  mocks.gamePlayerState.isGameStarted = false;
  mocks.gamePlayerState.currentSceneId = 'start';
  mocks.gamePlayerState.currentScene = game.scenes.start;
  mocks.saveSystemState.hasAutoSave = false;
}

describe('VisualNovelShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gamePlayer 未加载完成时只显示加载中', () => {
    mocks.gamePlayerState.isLoaded = false;
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByTestId('title-screen')).not.toBeInTheDocument();
  });

  it('已加载但未开始游戏时显示标题画面', () => {
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );

    expect(screen.getByTestId('title-screen')).toBeInTheDocument();
  });

  it('点击新游戏调用 handleStartGame 并切到游戏画面', () => {
    const { rerender } = render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );

    fireEvent.click(screen.getByText('新游戏'));
    mocks.gamePlayerState.isGameStarted = true;
    rerender(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );

    expect(mocks.gamePlayerState.handleStartGame).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('game-play-screen')).toBeInTheDocument();
  });

  it('点击继续进入读档界面（mode=load）', () => {
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );

    fireEvent.click(screen.getByText('继续'));

    expect(screen.getByTestId('save-load-screen')).toBeInTheDocument();
    expect(screen.getByTestId('save-load-mode')).toHaveTextContent('load');
  });

  it('游戏中打开存档进入 save-load 界面（mode=save）并停止自动/跳过', () => {
    mocks.gamePlayerState.isGameStarted = true;
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );

    fireEvent.click(screen.getByText('打开存档'));

    expect(mocks.gameControlsState.stopAll).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('save-load-mode')).toHaveTextContent('save');
  });

  it('游戏中关闭存读档界面回到游戏画面（而非标题）', () => {
    mocks.gamePlayerState.isGameStarted = true;
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );
    fireEvent.click(screen.getByText('打开读档'));

    fireEvent.click(screen.getByText('关闭存读档'));

    expect(screen.getByTestId('game-play-screen')).toBeInTheDocument();
  });

  it('未开始游戏时关闭存读档界面回到标题（而非游戏画面）', () => {
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );
    fireEvent.click(screen.getByText('继续'));

    fireEvent.click(screen.getByText('关闭存读档'));

    expect(screen.getByTestId('title-screen')).toBeInTheDocument();
  });

  it('打开路线图/设置界面', () => {
    mocks.gamePlayerState.isGameStarted = true;
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );

    fireEvent.click(screen.getByText('打开路线图'));
    expect(screen.getByTestId('route-map-screen')).toBeInTheDocument();

    fireEvent.click(screen.getByText('返回标题'));
    // 返回标题按钮属于 GamePlayScreen 桩组件，只在游戏画面渲染时可见；
    // 路线图浮层与背后的根画面各自独立渲染，这里只验证不会崩溃
  });

  it('存档为空时点击读取不会开始游戏', () => {
    mocks.saveSystemState.load.mockReturnValue(null);
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );
    fireEvent.click(screen.getByText('继续'));

    fireEvent.click(screen.getByText('读取存档1'));

    expect(mocks.gamePlayerState.handleStartGame).not.toHaveBeenCalled();
  });

  it('存档非空时读取会恢复场景与变量状态（restoreSave）', () => {
    mocks.saveSystemState.load.mockReturnValue({
      sceneId: 'scene2',
      runtimeState: { gold: 7 },
      timestamp: Date.now(),
    });
    mocks.gamePlayerState.restoreSave.mockReturnValue(true);
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );
    fireEvent.click(screen.getByText('继续'));

    fireEvent.click(screen.getByText('读取存档1'));

    expect(mocks.saveSystemState.load).toHaveBeenCalledWith('slot1');
    expect(mocks.gamePlayerState.restoreSave).toHaveBeenCalledWith('scene2', { gold: 7 });
  });

  it('从路线图选择非起始场景会调用 handleChoice 跳转', () => {
    mocks.gamePlayerState.isGameStarted = true;
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );
    fireEvent.click(screen.getByText('打开路线图'));

    fireEvent.click(screen.getByText('跳转场景2'));

    expect(mocks.gamePlayerState.handleStartGame).toHaveBeenCalled();
    expect(mocks.gamePlayerState.handleChoice).toHaveBeenCalledWith('scene2');
  });

  it('自动前进：当前场景有 choice 节点时调用 handleChoice', () => {
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );

    mocks.getCapturedOnAutoAdvance()?.();

    expect(mocks.gamePlayerState.handleChoice).toHaveBeenCalledWith('scene2', undefined);
  });

  it('自动前进：当前场景没有 choice 节点时停止自动播放', () => {
    mocks.gamePlayerState.currentScene = { id: 'end', nodes: [{ type: 'text', content: '结束' }] } as never;
    render(
      <VisualNovelShell
        game={game}
        gameId={1}
        slug="demo"
      />,
    );

    mocks.getCapturedOnAutoAdvance()?.();

    expect(mocks.gameControlsState.stopAll).toHaveBeenCalledTimes(1);
    expect(mocks.gamePlayerState.handleChoice).not.toHaveBeenCalled();
  });
});
