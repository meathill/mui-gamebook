import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { PlayableGame } from '@mui-gamebook/parser/src/types';
import { useRouteMap } from '../src/game-player/use-route-map';

function makeGame(): PlayableGame {
  return {
    slug: 'demo',
    title: 'Demo',
    initialState: {},
    scenes: {
      start: {
        id: 'start',
        label: '起点',
        nodes: [{ type: 'choice', text: '前进', nextSceneId: 'forest' }],
      },
      forest: {
        id: 'forest',
        nodes: [{ type: 'choice', text: '继续', nextSceneId: 'cave' }],
      },
      cave: {
        id: 'cave',
        nodes: [],
      },
      secret_room: {
        id: 'secret_room',
        nodes: [],
      },
    },
    startSceneId: 'start',
  };
}

describe('useRouteMap', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('起始场景始终解锁，其余未访问场景默认锁定', async () => {
    const { result } = renderHook(() => useRouteMap(makeGame(), 'route-a'));

    await waitFor(() => expect(result.current.visitedScenes.size).toBe(0));
    expect(result.current.isNodeUnlocked('start')).toBe(true);
    expect(result.current.isNodeUnlocked('cave')).toBe(false);
  });

  it('sceneId 在没有 label 时转换为默认可读标签', async () => {
    const { result } = renderHook(() => useRouteMap(makeGame(), 'route-b'));
    await waitFor(() => expect(result.current.nodes.length).toBeGreaterThan(0));

    const secretNode = result.current.nodes.find((n) => n.sceneId === 'secret_room');
    expect(secretNode?.label).toBe('Secret Room');

    const startNode = result.current.nodes.find((n) => n.sceneId === 'start');
    expect(startNode?.label).toBe('起点');
  });

  it('markVisited 后该场景与其可达的下一场景都解锁', async () => {
    const { result } = renderHook(() => useRouteMap(makeGame(), 'route-c'));
    await waitFor(() => expect(result.current.visitedScenes.size).toBe(0));

    act(() => result.current.markVisited('forest'));

    expect(result.current.visitedScenes.has('forest')).toBe(true);
    expect(result.current.isNodeUnlocked('forest')).toBe(true);
    expect(result.current.isNodeUnlocked('cave')).toBe(true);
    expect(result.current.isNodeUnlocked('secret_room')).toBe(false);
  });

  it('访问记录持久化到 localStorage，重新挂载后恢复', async () => {
    const { result, unmount } = renderHook(() => useRouteMap(makeGame(), 'route-d'));
    await waitFor(() => expect(result.current.visitedScenes.size).toBe(0));
    act(() => result.current.markVisited('forest'));
    unmount();

    const { result: result2 } = renderHook(() => useRouteMap(makeGame(), 'route-d'));
    await waitFor(() => expect(result2.current.visitedScenes.has('forest')).toBe(true));
  });

  it('resetProgress 清空已访问记录', async () => {
    const { result } = renderHook(() => useRouteMap(makeGame(), 'route-e'));
    await waitFor(() => expect(result.current.visitedScenes.size).toBe(0));
    act(() => result.current.markVisited('forest'));
    expect(result.current.visitedScenes.size).toBe(1);

    act(() => result.current.resetProgress());

    expect(result.current.visitedScenes.size).toBe(0);
    expect(result.current.isNodeUnlocked('forest')).toBe(false);
  });
});
