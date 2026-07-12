import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import type { UseGamePlayerOptions } from '@mui-gamebook/site-common/game-player';
import { useGameState } from './useGameState';

let capturedOptions: UseGamePlayerOptions = {};
const mockHandleChoice = vi.fn();

vi.mock('@mui-gamebook/site-common/game-player', () => ({
  useGamePlayer: vi.fn((_game, _slug, options: UseGamePlayerOptions) => {
    capturedOptions = options;
    return {
      game: _game,
      currentSceneId: 'scene1',
      runtimeState: {},
      isLoaded: true,
      isGameStarted: false,
      visibleVariables: [],
      currentScene: undefined,
      hasConfiguredChoices: false,
      showEndScreen: false,
      currentImageUrl: undefined,
      imageLoading: false,
      gameStartTime: null,
      handleStartGame: vi.fn(),
      handleRestart: vi.fn(),
      handleChoice: mockHandleChoice,
      applyStateUpdate: vi.fn(),
      setImageLoading: vi.fn(),
      getSceneImage: vi.fn(),
      getSceneAudioUrl: vi.fn(),
    };
  }),
}));

const fetchMock = vi.fn<typeof fetch>();
const game = { slug: 'story-1', title: '故事一' } as PlayableGame;

describe('useGameState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true } as Response);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('storagePrefix 固定为 jianjian_game，保持既有存档 key 兼容', () => {
    renderHook(() => useGameState({ game, gameId: 1, slug: 'story-1' }));

    expect(capturedOptions.storagePrefix).toBe('jianjian_game');
  });

  it('未同意 GDPR 时，onGameStart/onSceneVisit/onChoice 都不发起请求', async () => {
    renderHook(() => useGameState({ game, gameId: 1, slug: 'story-1' }));

    await capturedOptions.onGameStart?.();
    await capturedOptions.onSceneVisit?.('scene1');
    await capturedOptions.onChoice?.('scene1', 0);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('同意 GDPR 后，onGameStart 上报 open 事件', async () => {
    localStorage.setItem('analytics_consent', 'accepted');
    renderHook(() => useGameState({ game, gameId: 42, slug: 'story-1' }));

    await capturedOptions.onGameStart?.();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/open',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ gameId: 42 }),
      }),
    );
  });

  it('同意 GDPR 后，onSceneVisit 上报 scene 事件', async () => {
    localStorage.setItem('analytics_consent', 'accepted');
    renderHook(() => useGameState({ game, gameId: 42, slug: 'story-1' }));

    await capturedOptions.onSceneVisit?.('scene2');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/scene',
      expect.objectContaining({ body: JSON.stringify({ gameId: 42, sceneId: 'scene2' }) }),
    );
  });

  it('同意 GDPR 后，onChoice 上报 choice 事件', async () => {
    localStorage.setItem('analytics_consent', 'accepted');
    renderHook(() => useGameState({ game, gameId: 42, slug: 'story-1' }));

    await capturedOptions.onChoice?.('scene2', 1);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/choice',
      expect.objectContaining({ body: JSON.stringify({ gameId: 42, sceneId: 'scene2', choiceIndex: 1 }) }),
    );
  });

  it('上报请求失败时不抛出异常', async () => {
    localStorage.setItem('analytics_consent', 'accepted');
    fetchMock.mockRejectedValue(new Error('network down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHook(() => useGameState({ game, gameId: 1, slug: 'story-1' }));

    await expect(capturedOptions.onGameStart?.()).resolves.toBeUndefined();
  });

  it('confirmRestart 调用原生 confirm 并透传其返回值', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderHook(() => useGameState({ game, gameId: 1, slug: 'story-1' }));

    const result = capturedOptions.confirmRestart?.();

    expect(confirmSpy).toHaveBeenCalledWith('确定要重新开始这个故事吗？🤔');
    expect(result).toBe(true);
  });

  it('handleChoice 按 (nextSceneId, choiceIndex, setInstruction) 接收，转调用 gamePlayer.handleChoice(nextSceneId, setInstruction, choiceIndex)', () => {
    const { result } = renderHook(() => useGameState({ game, gameId: 1, slug: 'story-1' }));

    result.current.handleChoice('scene3', 2, 'gold = gold + 1');

    expect(mockHandleChoice).toHaveBeenCalledWith('scene3', 'gold = gold + 1', 2);
  });
});
