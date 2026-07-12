import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/editor/layout', () => ({
  getLayoutedElements: vi.fn(),
}));

vi.mock('@/lib/editor/chatFunctionHandlers', () => ({
  handleBatchFunctionCalls: vi.fn(),
}));

import { getLayoutedElements } from '@/lib/editor/layout';
import { handleBatchFunctionCalls } from '@/lib/editor/chatFunctionHandlers';
import { useFlowNodeHandlers } from '@/lib/editor/useFlowNodeHandlers';

function makeParams(overrides: Record<string, unknown> = {}) {
  return {
    nodes: [{ id: 'start', position: { x: 0, y: 0 }, data: { label: 'start' } }],
    edges: [],
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    selectedNode: null,
    setSelectedNode: vi.fn(),
    selectedEdge: null,
    setSelectedEdge: vi.fn(),
    originalGame: null,
    setOriginalGame: vi.fn(),
    screenToFlowPosition: vi.fn((pos) => pos),
    fitView: vi.fn(),
    dialog: { alert: vi.fn(), confirm: vi.fn(), success: vi.fn(), error: vi.fn() },
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
    const selectedNode = { id: 'start', position: { x: 0, y: 0 }, data: { label: 'start', content: 'old' } };
    const params = makeParams({
      nodes: [selectedNode],
      selectedNode,
    });
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
      const params = makeParams({
        nodes: [
          { id: 'start', position: { x: 0, y: 0 }, data: {} },
          { id: 'forest', position: { x: 0, y: 0 }, data: {} },
        ],
      });
      const { result } = renderHook(() => useFlowNodeHandlers(params as never));

      await act(async () => {
        await result.current.handleNodeIdChange('start', 'forest');
      });

      expect(params.dialog.alert).toHaveBeenCalledWith(expect.stringContaining('forest'));
      expect(params.setNodes).not.toHaveBeenCalled();
    });

    it('成功重命名节点 ID 并同步更新边的 source/target', async () => {
      const params = makeParams({
        nodes: [{ id: 'start', position: { x: 0, y: 0 }, data: { label: 'start' } }],
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

  it('handleFunctionCall 把当前上下文透传给 handleBatchFunctionCalls', () => {
    const params = makeParams();
    const { result } = renderHook(() => useFlowNodeHandlers(params as never));
    const calls = [{ name: 'addScene', args: { sceneId: 'forest', content: 'x' } }];

    act(() => {
      result.current.handleFunctionCall(calls);
    });

    expect(handleBatchFunctionCalls).toHaveBeenCalledWith(
      calls,
      expect.objectContaining({
        nodes: params.nodes,
        edges: params.edges,
        originalGame: params.originalGame,
        setNodes: params.setNodes,
        setEdges: params.setEdges,
        setOriginalGame: params.setOriginalGame,
      }),
    );
  });
});
