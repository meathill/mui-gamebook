import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEditorStore, useTemporalStore } from '@/lib/editor/store';
import { act, renderHook } from '@testing-library/react';

describe('useEditorStore', () => {
  beforeEach(() => {
    // 每个测试前重置 store
    useEditorStore.getState().reset();
    // 清理 temporal history
    useEditorStore.temporal.getState().clear();
  });

  describe('基本状态操作', () => {
    it('setGame 应该更新 game 状态', () => {
      const { result } = renderHook(() => useEditorStore());
      const testGame = {
        title: '测试游戏',
        slug: 'test',
        initialState: {},
        scenes: {},
        ai: {},
      };

      act(() => {
        result.current.setGame(testGame);
      });

      expect(result.current.game).toEqual(testGame);
    });

    it('updateGame 应该使用 updater 函数更新 game', () => {
      const { result } = renderHook(() => useEditorStore());
      const initialGame = {
        title: '初始标题',
        slug: 'test',
        initialState: {},
        scenes: {},
        ai: {},
      };

      act(() => {
        result.current.setGame(initialGame);
        result.current.updateGame((game) => ({ ...game, title: '更新后标题' }));
      });

      expect(result.current.game?.title).toBe('更新后标题');
    });

    it('setNodes 应该更新 nodes 数组', () => {
      const { result } = renderHook(() => useEditorStore());
      const testNodes = [{ id: 'start', position: { x: 0, y: 0 }, data: { label: 'start', content: '', assets: [] } }];

      act(() => {
        result.current.setNodes(testNodes);
      });

      expect(result.current.nodes).toHaveLength(1);
      expect(result.current.nodes[0].id).toBe('start');
    });

    it('setNodes 应该支持 updater 函数', () => {
      const { result } = renderHook(() => useEditorStore());
      const initialNodes = [
        { id: 'start', position: { x: 0, y: 0 }, data: { label: 'start', content: '', assets: [] } },
      ];

      act(() => {
        result.current.setNodes(initialNodes);
        result.current.setNodes((prev) => [
          ...prev,
          { id: 'scene_1', position: { x: 100, y: 100 }, data: { label: 'scene_1', content: '', assets: [] } },
        ]);
      });

      expect(result.current.nodes).toHaveLength(2);
    });

    it('setEdges 应该更新 edges 数组', () => {
      const { result } = renderHook(() => useEditorStore());
      const testEdges = [{ id: 'e1', source: 'start', target: 'scene_1' }];

      act(() => {
        result.current.setEdges(testEdges);
      });

      expect(result.current.edges).toHaveLength(1);
    });
  });

  describe('UI 状态操作', () => {
    it('setActiveTab 应该更新 activeTab', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setActiveTab('characters');
      });

      expect(result.current.activeTab).toBe('characters');
    });

    it('setViewMode 应该更新 viewMode', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setViewMode('text');
      });

      expect(result.current.viewMode).toBe('text');
    });

    it('toggleChatOpen 应该切换 chatOpen 状态', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(result.current.chatOpen).toBe(false);

      act(() => {
        result.current.toggleChatOpen();
      });
      expect(result.current.chatOpen).toBe(true);

      act(() => {
        result.current.toggleChatOpen();
      });
      expect(result.current.chatOpen).toBe(false);
    });
  });

  describe('便捷方法', () => {
    it('updateGameState 应该更新 initialState', () => {
      const { result } = renderHook(() => useEditorStore());
      const initialGame = {
        title: '测试',
        slug: 'test',
        initialState: { gold: 100 },
        scenes: {},
        ai: {},
      };

      act(() => {
        result.current.setGame(initialGame);
        result.current.updateGameState({ gold: 200, hp: 50 });
      });

      expect(result.current.game?.initialState).toEqual({ gold: 200, hp: 50 });
    });

    it('updateCharacters 应该更新角色配置', () => {
      const { result } = renderHook(() => useEditorStore());
      const initialGame = {
        title: '测试',
        slug: 'test',
        initialState: {},
        scenes: {},
        ai: { characters: {} },
      };

      act(() => {
        result.current.setGame(initialGame);
        result.current.updateCharacters({ hero: { name: '英雄', description: '主角' } });
      });

      expect(result.current.game?.ai?.characters?.hero?.name).toBe('英雄');
    });

    it('reset 应该重置所有状态', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setGame({ title: '测试', slug: 'test', initialState: {}, scenes: {}, ai: {} });
        result.current.setNodes([
          { id: 'test', position: { x: 0, y: 0 }, data: { label: 'test', content: '', assets: [] } },
        ]);
        result.current.setActiveTab('characters');
        result.current.reset();
      });

      expect(result.current.game).toBeNull();
      expect(result.current.nodes).toHaveLength(0);
      expect(result.current.activeTab).toBe('settings');
    });
  });

  describe('Undo/Redo 功能 (temporal)', () => {
    it('应该能撤销 game 更改', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setGame({ title: '版本1', slug: 'v1', initialState: {}, scenes: {}, ai: {} });
      });

      act(() => {
        result.current.setGame({ title: '版本2', slug: 'v2', initialState: {}, scenes: {}, ai: {} });
      });

      expect(result.current.game?.title).toBe('版本2');

      // Undo
      act(() => {
        useEditorStore.temporal.getState().undo();
      });

      expect(result.current.game?.title).toBe('版本1');
    });

    it('应该能重做 game 更改', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setGame({ title: '版本1', slug: 'v1', initialState: {}, scenes: {}, ai: {} });
      });

      act(() => {
        result.current.setGame({ title: '版本2', slug: 'v2', initialState: {}, scenes: {}, ai: {} });
      });

      // Undo
      act(() => {
        useEditorStore.temporal.getState().undo();
      });

      expect(result.current.game?.title).toBe('版本1');

      // Redo
      act(() => {
        useEditorStore.temporal.getState().redo();
      });

      expect(result.current.game?.title).toBe('版本2');
    });

    it('应该追踪 nodes 和 edges 的更改', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setNodes([
          { id: 'start', position: { x: 0, y: 0 }, data: { label: 'start', content: '', assets: [] } },
        ]);
      });

      act(() => {
        result.current.setNodes([
          { id: 'start', position: { x: 0, y: 0 }, data: { label: 'start', content: '', assets: [] } },
          { id: 'scene_1', position: { x: 100, y: 100 }, data: { label: 'scene_1', content: '', assets: [] } },
        ]);
      });

      expect(result.current.nodes).toHaveLength(2);

      // Undo
      act(() => {
        useEditorStore.temporal.getState().undo();
      });

      expect(result.current.nodes).toHaveLength(1);
    });

    it('UI 状态不应该被 undo 影响', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setActiveTab('characters');
        result.current.setChatOpen(true);
      });

      act(() => {
        result.current.setGame({ title: '测试', slug: 'test', initialState: {}, scenes: {}, ai: {} });
      });

      // Undo game 更改
      act(() => {
        useEditorStore.temporal.getState().undo();
      });

      // UI 状态应该保持不变
      expect(result.current.activeTab).toBe('characters');
      expect(result.current.chatOpen).toBe(true);
    });
  });
});

describe('useTemporalStore', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.temporal.getState().clear();
  });

  it('应该提供 pastStates 状态', () => {
    const { result } = renderHook(() => useTemporalStore((state) => state.pastStates));

    expect(result.current).toEqual([]);
  });

  it('应该在 game 更改后更新 pastStates', () => {
    const { result: storeResult } = renderHook(() => useEditorStore());
    const { result: temporalResult } = renderHook(() => useTemporalStore((state) => state.pastStates));

    act(() => {
      storeResult.current.setGame({ title: '测试', slug: 'test', initialState: {}, scenes: {}, ai: {} });
    });

    expect(temporalResult.current.length).toBeGreaterThan(0);
  });
});
