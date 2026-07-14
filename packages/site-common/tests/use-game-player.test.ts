import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import { useGamePlayer } from '../src/game-player/use-game-player';

function makeGame(): PlayableGame {
  return {
    slug: 'demo',
    title: 'Demo',
    initialState: {
      gold: 0,
      danger: { value: 0, trigger: { condition: '>= 3', scene: 'gameover' } },
    },
    scenes: {
      start: {
        id: 'start',
        nodes: [
          { type: 'static_image', url: 'https://example.com/start.png' },
          { type: 'text', content: '开始', audio_url: 'https://example.com/start.mp3' },
          { type: 'choice', text: '前进', nextSceneId: 'forest', set: 'gold = gold + 5' },
          { type: 'choice', text: '躲避', nextSceneId: 'forest', set: 'danger = danger + 3' },
        ],
      },
      forest: {
        id: 'forest',
        nodes: [
          { type: 'static_image', url: 'https://example.com/forest.png' },
          { type: 'text', content: '森林' },
          { type: 'choice', text: '继续', nextSceneId: 'end' },
        ],
      },
      end: {
        id: 'end',
        nodes: [{ type: 'text', content: '结束' }],
      },
      gameover: {
        id: 'gameover',
        nodes: [{ type: 'text', content: '游戏结束' }],
      },
    },
    startSceneId: 'start',
  };
}

// 注意：game 必须在 renderHook 回调之外构造一次，作为稳定引用传入。
// use-game-player 的加载 effect 依赖 game.scenes 的引用，若每次渲染都重新构造 game，
// 会导致 effect 每次渲染都重新执行，叠加 setRuntimeState 接收的新对象引用，形成无限渲染循环。

describe('useGamePlayer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('挂载后从初始场景开始，isLoaded 变为 true', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-a'));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.currentSceneId).toBe('start');
    expect(result.current.isGameStarted).toBe(false);
  });

  it('handleStartGame 开始游戏，没有存档时重置到初始状态', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-b'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.handleStartGame());

    expect(result.current.isGameStarted).toBe(true);
    expect(result.current.currentSceneId).toBe('start');
    expect(result.current.runtimeState).toEqual({ gold: 0, danger: 0 });
  });

  it('handleChoice 在没有 set 指令时直接切换场景', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-c'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());

    act(() => result.current.handleChoice('forest'));

    expect(result.current.currentSceneId).toBe('forest');
  });

  it('handleChoice 执行 set 指令后更新 runtimeState', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-d'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());

    act(() => result.current.handleChoice('forest', 'gold = gold + 5'));

    expect(result.current.runtimeState.gold).toBe(5);
    expect(result.current.currentSceneId).toBe('forest');
  });

  it('变量触发器满足条件时跳转到触发场景，而不是 choice 指定的场景', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-e'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());

    act(() => result.current.handleChoice('forest', 'danger = danger + 3'));

    expect(result.current.runtimeState.danger).toBe(3);
    expect(result.current.currentSceneId).toBe('gameover');
  });

  it('没有 choice 节点的场景 showEndScreen 为 true', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-f'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());
    act(() => result.current.handleChoice('forest'));
    act(() => result.current.handleChoice('end'));

    expect(result.current.hasConfiguredChoices).toBe(false);
    expect(result.current.showEndScreen).toBe(true);
  });

  it('handleRestart 在用户拒绝确认时不重置状态', async () => {
    const game = makeGame();
    const confirmRestart = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useGamePlayer(game, 'slug-g', { confirmRestart }));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());
    act(() => result.current.handleChoice('forest', 'gold = gold + 5'));

    await act(async () => result.current.handleRestart());

    expect(confirmRestart).toHaveBeenCalled();
    expect(result.current.currentSceneId).toBe('forest');
  });

  it('handleRestart(noConfirm=true) 跳过确认直接重置', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-h'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());
    act(() => result.current.handleChoice('forest', 'gold = gold + 5'));

    await act(async () => result.current.handleRestart(true));

    expect(result.current.currentSceneId).toBe('start');
    expect(result.current.isGameStarted).toBe(false);
    expect(result.current.runtimeState).toEqual({ gold: 0, danger: 0 });
  });

  it('进度会持久化到 localStorage，重新挂载时能恢复', async () => {
    const game = makeGame();
    const { result, unmount } = renderHook(() => useGamePlayer(game, 'slug-i', { storagePrefix: 'test' }));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());
    act(() => result.current.handleChoice('forest', 'gold = gold + 5'));
    unmount();

    const { result: result2 } = renderHook(() => useGamePlayer(game, 'slug-i', { storagePrefix: 'test' }));
    await waitFor(() => expect(result2.current.isLoaded).toBe(true));

    expect(result2.current.currentSceneId).toBe('forest');
    expect(result2.current.isGameStarted).toBe(true);
    expect(result2.current.runtimeState.gold).toBe(5);
  });

  it('不同 storagePrefix 的进度互不干扰（迁移兼容性关键路径）', async () => {
    const game = makeGame();
    const { result: a } = renderHook(() => useGamePlayer(game, 'shared-slug', { storagePrefix: 'site-a' }));
    await waitFor(() => expect(a.current.isLoaded).toBe(true));
    act(() => a.current.handleStartGame());
    act(() => a.current.handleChoice('forest'));

    const { result: b } = renderHook(() => useGamePlayer(game, 'shared-slug', { storagePrefix: 'site-b' }));
    await waitFor(() => expect(b.current.isLoaded).toBe(true));

    expect(b.current.currentSceneId).toBe('start');
    expect(b.current.isGameStarted).toBe(false);
  });

  it('挂载时（游戏未开始）currentImageUrl 取自起始场景', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-img-a'));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.currentImageUrl).toBe('https://example.com/start.png');
  });

  it('切换到图片不同的场景时更新 currentImageUrl 并置 imageLoading 为 true', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-img-b'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());

    act(() => result.current.handleChoice('forest'));

    expect(result.current.currentImageUrl).toBe('https://example.com/forest.png');
    expect(result.current.imageLoading).toBe(true);
  });

  it('getSceneImage / getSceneAudioUrl 从场景节点中提取媒体 URL', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-img-c'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.getSceneImage(game.scenes.start.nodes)).toBe('https://example.com/start.png');
    expect(result.current.getSceneAudioUrl(game.scenes.start.nodes)).toBe('https://example.com/start.mp3');
    expect(result.current.getSceneAudioUrl(game.scenes.forest.nodes)).toBeUndefined();
  });

  it('handleStartGame 设置 gameStartTime，handleRestart 清空它', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-time-a'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.gameStartTime).toBeNull();

    act(() => result.current.handleStartGame());
    expect(result.current.gameStartTime).toEqual(expect.any(Number));

    await act(async () => result.current.handleRestart(true));
    expect(result.current.gameStartTime).toBeNull();
  });

  it('onGameStart 在 handleStartGame 时触发', async () => {
    const game = makeGame();
    const onGameStart = vi.fn();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-cb-a', { onGameStart }));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.handleStartGame());

    expect(onGameStart).toHaveBeenCalledTimes(1);
  });

  it('onSceneVisit 对每个场景本局内只触发一次', async () => {
    const game = makeGame();
    const onSceneVisit = vi.fn();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-cb-b', { onSceneVisit }));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => result.current.handleStartGame());
    expect(onSceneVisit).toHaveBeenCalledWith('start');
    onSceneVisit.mockClear();

    act(() => result.current.handleChoice('forest'));
    expect(onSceneVisit).toHaveBeenCalledWith('forest');
    onSceneVisit.mockClear();

    act(() => result.current.handleChoice('start'));
    expect(onSceneVisit).not.toHaveBeenCalled();
  });

  it('onChoice 在做出选择时携带当时所在场景与 choiceIndex', async () => {
    const game = makeGame();
    const onChoice = vi.fn();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-cb-c', { onChoice }));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());

    act(() => result.current.handleChoice('forest', undefined, 1));

    expect(onChoice).toHaveBeenCalledWith('start', 1);
  });

  it('持久化数据包含图片、开始时间与已访问场景记录，可在重新挂载后恢复', async () => {
    const game = makeGame();
    const { result, unmount } = renderHook(() => useGamePlayer(game, 'slug-persist-extra', { storagePrefix: 'test2' }));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());
    act(() => result.current.handleChoice('forest'));
    const startTime = result.current.gameStartTime;
    unmount();

    const onSceneVisit2 = vi.fn();
    const { result: result2 } = renderHook(() =>
      useGamePlayer(game, 'slug-persist-extra', { storagePrefix: 'test2', onSceneVisit: onSceneVisit2 }),
    );
    await waitFor(() => expect(result2.current.isLoaded).toBe(true));

    expect(result2.current.currentImageUrl).toBe('https://example.com/forest.png');
    expect(result2.current.gameStartTime).toBe(startTime);

    // 去重记录随存档恢复：再次"到达"已访问过的场景不应重复触发 onSceneVisit
    act(() => result2.current.handleChoice('start'));
    expect(onSceneVisit2).not.toHaveBeenCalled();
  });

  it('applyStateUpdate 合并部分状态更新，未触发条件时返回 null 且不切换场景', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-apply-a'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());

    let returned: string | null = null;
    act(() => {
      returned = result.current.applyStateUpdate({ gold: 3 });
    });

    expect(returned).toBeNull();
    expect(result.current.runtimeState.gold).toBe(3);
    expect(result.current.runtimeState.danger).toBe(0);
    expect(result.current.currentSceneId).toBe('start');
  });

  it('applyStateUpdate 触发变量条件时切换场景并返回目标场景 id', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-apply-b'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());

    let returned: string | null = null;
    act(() => {
      returned = result.current.applyStateUpdate({ danger: 5 });
    });

    expect(returned).toBe('gameover');
    expect(result.current.currentSceneId).toBe('gameover');
    expect(result.current.runtimeState.danger).toBe(5);
  });

  it('字符串变量的 trigger 能正确触发（DSL v2 Phase 1 修复：旧实现拼字符串+空 state 恒为假）', async () => {
    const game = makeGame();
    game.initialState.partner = { value: '', trigger: { condition: '== "Alice"', scene: 'gameover' } };
    const { result } = renderHook(() => useGamePlayer(game, 'slug-trigger-str'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.handleStartGame());

    act(() => result.current.handleChoice('forest', 'partner = "Alice"'));

    expect(result.current.currentSceneId).toBe('gameover');
  });

  it('加载存档时以初始状态为底座合并：游戏更新新增的变量不缺失', async () => {
    const game = makeGame();
    // 模拟旧版本游戏产生的存档：当时还没有 danger 变量
    localStorage.setItem(
      'test-merge_slug-merge',
      JSON.stringify({ sceneId: 'forest', state: { gold: 7 }, startTime: 123, scenes: ['start', 'forest'] }),
    );

    const { result } = renderHook(() => useGamePlayer(game, 'slug-merge', { storagePrefix: 'test-merge' }));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.runtimeState.gold).toBe(7);
    expect(result.current.runtimeState.danger).toBe(0); // 底座补齐，而非 undefined
  });

  it('restoreSave 恢复场景与变量状态（多存档读档路径），场景不存在时返回 false', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-restore'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    let ok = false;
    act(() => {
      ok = result.current.restoreSave('forest', { gold: 42 });
    });

    expect(ok).toBe(true);
    expect(result.current.currentSceneId).toBe('forest');
    expect(result.current.isGameStarted).toBe(true);
    expect(result.current.runtimeState.gold).toBe(42);
    expect(result.current.runtimeState.danger).toBe(0); // 底座合并

    let missing = true;
    act(() => {
      missing = result.current.restoreSave('no_such_scene', {});
    });
    expect(missing).toBe(false);
  });
});
