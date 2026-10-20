import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import type { Game } from '@roudanio/parser/src/types';

vi.mock('@/lib/editor/layout', () => ({
  getLayoutedElements: vi.fn(),
}));

vi.mock('@/lib/editor/chatFunctionHandlers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/editor/chatFunctionHandlers')>();
  return { ...actual, executeEditorToolBatch: vi.fn() };
});

import { getLayoutedElements } from '@/lib/editor/layout';
import { executeEditorToolBatch, type EditorToolBatchResult } from '@/lib/editor/chatFunctionHandlers';
import { useFlowNodeHandlers } from '@/lib/editor/useFlowNodeHandlers';
import type { SceneNodeData } from '@/lib/editor/transformers';

const sceneNode = (id: string, content = ''): Node<SceneNodeData> => ({
  id,
  position: { x: 0, y: 0 },
  data: { label: id, content, assets: [] },
  type: 'scene',
});

const originalGame: Game = {
  title: '测试游戏',
  slug: 'test-game',
  initialState: { gold: 1 },
  ai: { characters: { hero: { name: '英雄' } } },
  scenes: {},
};

const validDsl = `---
title: 测试游戏
state:
  gold: 1
ai:
  characters:
    hero:
      name: 英雄
---

# start

开始

# scene_1

场景 1

* [继续] -> scene_1
`;

function makeParams(overrides: Record<string, unknown> = {}) {
  return {
    nodes: [sceneNode('start', '开始')],
    edges: [] as Edge[],
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    selectedNode: null,
    setSelectedNode: vi.fn(),
    selectedEdge: null,
    setSelectedEdge: vi.fn(),
    originalGame,
    setOriginalGame: vi.fn(),
    activeTab: 'flowchart' as const,
    textContent: validDsl,
    setTextContent: vi.fn(),
    screenToFlowPosition: vi.fn((pos) => pos),
    fitView: vi.fn(),
    dialog: { alert: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn() },
    ...overrides,
  };
}

function resultWith(overrides: Partial<EditorToolBatchResult> = {}): EditorToolBatchResult {
  return {
    ok: true,
    changed: true,
    results: [],
    dsl: 'next-dsl',
    ...overrides,
  };
}

describe('useFlowNodeHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('onConnect 通过 setEdges 添加新连线，type=default label=Choice', () => {
    const params = makeParams();
    const { result } = renderHook(() => useFlowNodeHandlers(params as never));

    act(() => {
      result.current.onConnect({ source: 'start', target: 'forest', sourceHandle: null, targetHandle: null });
    });

    expect(params.setEdges).toHaveBeenCalledTimes(1);
    const updater = params.setEdges.mock.calls[0][0];
    const newEdges = updater([]);
    expect(newEdges).toHaveLength(1);
    expect(newEdges[0]).toMatchObject({ source: 'start', target: 'forest', type: 'default', label: 'Choice' });
  });

  it('handleNodeChange 更新匹配节点的 data，并同步更新 selectedNode（如果是同一个节点）', () => {
    const selectedNode = sceneNode('start', 'old');
    const params = makeParams({ nodes: [selectedNode], selectedNode });
    const { result } = renderHook(() => useFlowNodeHandlers(params as never));

    act(() => {
      result.current.handleNodeChange('start', { content: 'new' });
    });

    const updater = params.setNodes.mock.calls[0][0];
    const newNodes = updater([selectedNode]);
    expect(newNodes[0].data.content).toBe('new');
    expect(params.setSelectedNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'start', data: expect.objectContaining({ content: 'new' }) }),
    );
  });

  describe('handleNodeIdChange', () => {
    it('newId 为空或与 oldId 相同时不做任何操作', async () => {
      const params = makeParams();
      const { result } = renderHook(() => useFlowNodeHandlers(params as never));

      await act(async () => {
        await result.current.handleNodeIdChange('start', '');
        await result.current.handleNodeIdChange('start', 'start');
      });

      expect(params.setNodes).not.toHaveBeenCalled();
      expect(params.dialog.alert).not.toHaveBeenCalled();
    });

    it('newId 已存在时弹出提示，不修改状态', async () => {
      const params = makeParams({ nodes: [sceneNode('start'), sceneNode('forest')] });
      const { result } = renderHook(() => useFlowNodeHandlers(params as never));

      await act(async () => {
        await result.current.handleNodeIdChange('start', 'forest');
      });

      expect(params.dialog.alert).toHaveBeenCalledWith(expect.stringContaining('forest'));
      expect(params.setNodes).not.toHaveBeenCalled();
    });

    it('成功重命名节点 ID 并同步更新边的 source/target', async () => {
      const params = makeParams({
        nodes: [sceneNode('start')],
        edges: [{ id: 'e1', source: 'start', target: 'forest' }],
      });
      const { result } = renderHook(() => useFlowNodeHandlers(params as never));

      await act(async () => {
        await result.current.handleNodeIdChange('start', 'intro');
      });

      const nodesUpdater = params.setNodes.mock.calls[0][0];
      const newNodes = nodesUpdater(params.nodes);
      expect(newNodes[0]).toMatchObject({ id: 'intro', data: { label: 'intro' } });

      const edgesUpdater = params.setEdges.mock.calls[0][0];
      const newEdges = edgesUpdater(params.edges);
      expect(newEdges[0]).toMatchObject({ source: 'intro', target: 'forest' });
    });
  });

  it('handleEdgeChange 只更新传入的字段，并同步 selectedEdge', () => {
    const edge = { id: 'e1', source: 'a', target: 'b', label: '旧文本', data: { condition: 'has_key' } };
    const params = makeParams({ edges: [edge], selectedEdge: edge });
    const { result } = renderHook(() => useFlowNodeHandlers(params as never));

    act(() => {
      result.current.handleEdgeChange('e1', { label: '新文本' });
    });

    const updater = params.setEdges.mock.calls[0][0];
    const newEdges = updater([edge]);
    expect(newEdges[0].label).toBe('新文本');
    expect(newEdges[0].data).toEqual({ condition: 'has_key' });
    expect(params.setSelectedEdge).toHaveBeenCalledWith(expect.objectContaining({ label: '新文本' }));
  });

  it('handleAddScene 用 screenToFlowPosition 计算的坐标新增场景节点', () => {
    const params = makeParams();
    const { result } = renderHook(() => useFlowNodeHandlers(params as never));

    act(() => {
      result.current.handleAddScene();
    });

    expect(params.screenToFlowPosition).toHaveBeenCalled();
    const updater = params.setNodes.mock.calls[0][0];
    const newNodes = updater(params.nodes);
    expect(newNodes).toHaveLength(2);
    expect(newNodes[1]).toMatchObject({ type: 'scene', data: { content: 'New scene content' } });
  });

  it('handleLayout 用自动排版结果替换 nodes/edges', () => {
    const layoutedNodes = [{ id: 'start', position: { x: 100, y: 200 }, data: {} }];
    const layoutedEdges = [{ id: 'e1', source: 'start', target: 'forest' }];
    (getLayoutedElements as ReturnType<typeof vi.fn>).mockReturnValue({ nodes: layoutedNodes, edges: layoutedEdges });
    const params = makeParams();
    const { result } = renderHook(() => useFlowNodeHandlers(params as never));

    act(() => {
      result.current.handleLayout();
    });

    expect(params.setNodes).toHaveBeenCalledWith(layoutedNodes);
    expect(params.setEdges).toHaveBeenCalledWith(layoutedEdges);
  });

  describe('handleFunctionCall', () => {
    it('flowchart 模式以 nodes/edges 为源，成功后一次性提交', () => {
      const nextDocument = {
        nodes: [sceneNode('start', '改后')],
        edges: [] as Edge[],
        game: originalGame,
      };
      (executeEditorToolBatch as ReturnType<typeof vi.fn>).mockReturnValue(resultWith({ document: nextDocument }));
      const params = makeParams();
      const { result } = renderHook(() => useFlowNodeHandlers(params as never));

      const calls = [{ name: 'updateSceneText', args: { sceneId: 'start', text: '改后' } }];
      act(() => {
        result.current.handleFunctionCall(calls);
      });

      expect(executeEditorToolBatch).toHaveBeenCalledWith(
        calls,
        expect.objectContaining({
          nodes: params.nodes,
          edges: params.edges,
          game: expect.objectContaining({ title: '测试游戏' }),
        }),
      );
      expect(params.setNodes).toHaveBeenCalled();
      expect(params.setEdges).toHaveBeenCalled();
      expect(params.setOriginalGame).toHaveBeenCalled();
      expect(params.setTextContent).toHaveBeenCalledWith('next-dsl');
    });

    it('story 模式先解析 textContent，避免覆盖未保存文本', () => {
      (executeEditorToolBatch as ReturnType<typeof vi.fn>).mockReturnValue(resultWith({ changed: false, ok: true }));
      const params = makeParams({ activeTab: 'story', textContent: validDsl });
      const { result } = renderHook(() => useFlowNodeHandlers(params as never));

      act(() => {
        result.current.handleFunctionCall([{ name: 'getDsl', args: {} }]);
      });

      const base = (executeEditorToolBatch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(base.nodes.map((node: Node) => node.id)).toEqual(['start', 'scene_1']);
      expect(base.game.scenes.start).toBeDefined();
      // 只读批次不提交
      expect(params.setNodes).not.toHaveBeenCalled();
      expect(params.setTextContent).not.toHaveBeenCalled();
    });

    it('story 模式无法解析时直接返回失败，不执行工具', () => {
      const params = makeParams({ activeTab: 'story', textContent: 'not a valid dsl' });
      const { result } = renderHook(() => useFlowNodeHandlers(params as never));

      let batchResult: EditorToolBatchResult | undefined;
      act(() => {
        batchResult = result.current.handleFunctionCall([{ name: 'updateSceneText', args: {} }]);
      });

      expect(batchResult?.ok).toBe(false);
      expect(batchResult?.error).toContain('无法解析');
      expect(executeEditorToolBatch).not.toHaveBeenCalled();
      expect(params.setNodes).not.toHaveBeenCalled();
    });

    it('没有游戏数据时返回失败结果', () => {
      const params = makeParams({ originalGame: null });
      const { result } = renderHook(() => useFlowNodeHandlers(params as never));

      let batchResult: EditorToolBatchResult | undefined;
      act(() => {
        batchResult = result.current.handleFunctionCall([{ name: 'updateSceneText', args: {} }]);
      });

      expect(batchResult?.ok).toBe(false);
      expect(batchResult?.results[0].ok).toBe(false);
      expect(executeEditorToolBatch).not.toHaveBeenCalled();
    });
  });
});
