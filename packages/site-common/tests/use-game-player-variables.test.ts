import { act, renderHook, waitFor } from '@testing-library/react';
import type { PlayableGame } from '@roudanio/parser/src/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGamePlayer } from '../src/game-player/use-game-player';

function makeGame(): PlayableGame {
  return {
    title: '道具显示测试',
    initialState: {
      health: { value: 0, visible: true, display: 'progress', max: 100 },
      gold: { value: 0, visible: true, display: 'value' },
      hasSeed: { value: false, visible: true, display: 'icon' },
      scrolls: { value: 0, visible: true, display: 'icon' },
      hiddenItem: { value: true, visible: false, display: 'icon' },
    },
    startSceneId: 'start',
    scenes: {
      start: { id: 'start', nodes: [{ type: 'choice', text: '获得道具', nextSceneId: 'end' }] },
      end: { id: 'end', nodes: [{ type: 'text', content: '结束' }] },
    },
  };
}

describe('播放器变量栏的道具显示', () => {
  beforeEach(() => localStorage.clear());

  it('图标型道具随获得和消耗显示/隐藏，零值属性仍然显示', async () => {
    const game = makeGame();
    const { result } = renderHook(() => useGamePlayer(game, 'slug-items'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.visibleVariables.map(({ key }) => key)).toEqual(['health', 'gold']);

    act(() => result.current.handleChoice('end', 'hasSeed = true, scrolls = 2'));
    expect(result.current.visibleVariables.map(({ key }) => key)).toEqual(['health', 'gold', 'hasSeed', 'scrolls']);

    act(() => result.current.applyStateUpdate({ hasSeed: false, scrolls: 0 }));
    expect(result.current.visibleVariables.map(({ key }) => key)).toEqual(['health', 'gold']);
  });

  it('道具显示使用读档后的当前状态，重新开始后恢复初始持有状态', async () => {
    const game = makeGame();
    game.initialState.item = { value: '', visible: true, display: 'icon' };
    const { result } = renderHook(() => useGamePlayer(game, 'slug-item-save'));
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.visibleVariables.map(({ key }) => key)).toEqual(['health', 'gold']);

    act(() => result.current.restoreSave('end', { item: '羊皮纸' }));
    expect(result.current.visibleVariables.map(({ key }) => key)).toEqual(['health', 'gold', 'item']);

    act(() => result.current.restoreSave('start', { item: '' }));
    expect(result.current.visibleVariables.map(({ key }) => key)).toEqual(['health', 'gold']);

    act(() => result.current.applyStateUpdate({ item: '羊皮纸' }));
    await act(async () => result.current.handleRestart(true));
    expect(result.current.visibleVariables.map(({ key }) => key)).toEqual(['health', 'gold']);
  });
});
