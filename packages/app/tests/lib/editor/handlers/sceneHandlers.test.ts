import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';
import {
  handleAddScene,
  handleDeleteScene,
  handleRenameScene,
  handleUpdateScene,
  handleUpdateSceneImagePrompt,
  handleUpdateSceneText,
} from '@/lib/editor/handlers/sceneHandlers';
import type { HandlerContext } from '@/lib/editor/handlers/types';
import type { SceneNodeData } from '@/lib/editor/transformers';

function makeNode(id: string, content = ''): Node<SceneNodeData> {
  return { id, position: { x: 0, y: 0 }, type: 'scene', data: { label: id, content, assets: [] } };
}

function makeEdge(id: string, source: string, target: string): Edge {
  return { id, source, target };
}

function makeCtx(
  nodes: Node<SceneNodeData>[],
  edges: Edge[] = [],
): HandlerContext & { getNodes: () => Node<SceneNodeData>[]; getEdges: () => Edge[] } {
  let currentNodes = nodes;
  let currentEdges = edges;
  return {
    get nodes() {
      return currentNodes;
    },
    get edges() {
      return currentEdges;
    },
    originalGame: null,
    // HandlerContext.setNodes 的回调类型是通用的 Node[] => Node[]（不带 SceneNodeData 泛型参数），
    // 生产代码里实际传入的 setState 函数保留了更具体的类型，这里的测试 mock 只需要在边界处转回来。
    setNodes: vi.fn((fn) => {
      currentNodes = fn(currentNodes) as Node<SceneNodeData>[];
    }),
    setEdges: vi.fn((fn) => {
      currentEdges = fn(currentEdges);
    }),
    setOriginalGame: vi.fn(),
    getNodes: () => currentNodes,
    getEdges: () => currentEdges,
  };
}

describe('handleUpdateScene', () => {
  it('场景不存在时跳过更新（返回值仅用于日志展示，不反映是否真的执行了，只能靠状态判断）', () => {
    const ctx = makeCtx([makeNode('start')]);

    handleUpdateScene({ sceneId: 'missing', content: 'x' }, ctx);

    expect(ctx.getNodes()).toHaveLength(1);
    expect(ctx.getNodes()[0].data.content).toBe('');
  });

  it('更新已存在场景的内容', () => {
    const ctx = makeCtx([makeNode('start', '旧内容')]);

    handleUpdateScene({ sceneId: 'start', content: '新内容' }, ctx);

    expect(ctx.getNodes()[0].data.content).toBe('新内容');
  });
});

describe('handleAddScene', () => {
  it('添加新场景', () => {
    const ctx = makeCtx([makeNode('start')]);

    handleAddScene({ sceneId: 'forest', content: '森林场景' }, ctx);

    expect(ctx.getNodes()).toHaveLength(2);
    expect(ctx.getNodes()[1]).toMatchObject({ id: 'forest', data: { content: '森林场景' } });
  });

  it('场景 ID 已存在时跳过添加（返回值仅用于日志展示，只能靠状态判断是否真的添加了）', () => {
    const ctx = makeCtx([makeNode('start', '原内容')]);

    handleAddScene({ sceneId: 'start', content: '新内容' }, ctx);

    expect(ctx.getNodes()).toHaveLength(1);
    expect(ctx.getNodes()[0].data.content).toBe('原内容');
  });
});

describe('handleDeleteScene', () => {
  it('禁止删除 start 场景', () => {
    const ctx = makeCtx([makeNode('start')]);

    const result = handleDeleteScene({ sceneId: 'start' }, ctx);

    expect(result).toBe('不能删除 start 场景');
    expect(ctx.getNodes()).toHaveLength(1);
  });

  it('删除场景节点及所有相关的边', () => {
    const ctx = makeCtx(
      [makeNode('start'), makeNode('forest')],
      [makeEdge('e1', 'start', 'forest'), makeEdge('e2', 'forest', 'start')],
    );

    handleDeleteScene({ sceneId: 'forest' }, ctx);

    expect(ctx.getNodes().map((n) => n.id)).toEqual(['start']);
    expect(ctx.getEdges()).toEqual([]);
  });
});

describe('handleRenameScene', () => {
  it('新旧 ID 相同时跳过', () => {
    const ctx = makeCtx([makeNode('start')]);

    const result = handleRenameScene({ oldId: 'start', newId: 'start' }, ctx);

    expect(result).toContain('相同');
  });

  it('新 ID 已存在时跳过重命名', () => {
    const ctx = makeCtx([makeNode('start'), makeNode('forest')]);

    handleRenameScene({ oldId: 'start', newId: 'forest' }, ctx);

    expect(ctx.getNodes().map((n) => n.id)).toEqual(['start', 'forest']);
  });

  it('重命名场景并同步更新引用它的边的 source/target', () => {
    const ctx = makeCtx(
      [makeNode('start'), makeNode('forest')],
      [makeEdge('e1', 'start', 'forest'), makeEdge('e2', 'forest', 'start')],
    );

    handleRenameScene({ oldId: 'start', newId: 'intro' }, ctx);

    expect(ctx.getNodes().map((n) => n.id)).toEqual(['intro', 'forest']);
    expect(ctx.getEdges()).toEqual([
      { id: 'e1', source: 'intro', target: 'forest' },
      { id: 'e2', source: 'forest', target: 'intro' },
    ]);
  });
});

describe('handleUpdateSceneText', () => {
  it('场景不存在时跳过（返回值仅用于日志展示，只能靠状态判断是否真的执行了）', () => {
    const ctx = makeCtx([makeNode('start', '原内容')]);

    handleUpdateSceneText({ sceneId: 'missing', text: 'x' }, ctx);

    expect(ctx.getNodes()).toHaveLength(1);
    expect(ctx.getNodes()[0].data.content).toBe('原内容');
  });

  it('更新场景文案', () => {
    const ctx = makeCtx([makeNode('start', '旧')]);

    handleUpdateSceneText({ sceneId: 'start', text: '新' }, ctx);

    expect(ctx.getNodes()[0].data.content).toBe('新');
  });
});

describe('handleUpdateSceneImagePrompt', () => {
  it('场景没有 ai_image 资源时新增一条', () => {
    const ctx = makeCtx([makeNode('start')]);

    handleUpdateSceneImagePrompt({ sceneId: 'start', imagePrompt: '森林里的小屋' }, ctx);

    const assets = ctx.getNodes()[0].data.assets;
    expect(assets).toHaveLength(1);
    expect(assets[0].asset).toEqual({ type: 'ai_image', prompt: '森林里的小屋' });
  });

  it('场景已有 ai_image 资源时更新 prompt，不新增', () => {
    const node = makeNode('start');
    node.data.assets = [
      { editorId: 'x', asset: { type: 'ai_image', prompt: '旧 prompt', url: 'https://x.com/a.png' } },
    ];
    const ctx = makeCtx([node]);

    handleUpdateSceneImagePrompt({ sceneId: 'start', imagePrompt: '新 prompt' }, ctx);

    const assets = ctx.getNodes()[0].data.assets;
    expect(assets).toHaveLength(1);
    expect(assets[0].asset).toEqual({ type: 'ai_image', prompt: '新 prompt', url: 'https://x.com/a.png' });
  });
});
