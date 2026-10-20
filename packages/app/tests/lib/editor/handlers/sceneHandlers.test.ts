import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import type { Game } from '@roudanio/parser/src/types';
import {
  handleAddDialogueLine,
  handleAddRedirect,
  handleAddScene,
  handleDeleteScene,
  handleRenameScene,
  handleSetSceneImage,
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

function makeGame(): Game {
  return {
    slug: 'g',
    title: 'T',
    initialState: {},
    ai: { characters: { hero: { name: '英雄' } } },
    scenes: {},
  };
}

function makeCtx(nodes: Node<SceneNodeData>[], edges: Edge[] = [], game = makeGame()): HandlerContext {
  return { nodes, edges, game };
}

describe('handleUpdateScene', () => {
  it('场景不存在时返回失败，不修改', () => {
    const ctx = makeCtx([makeNode('start')]);
    const result = handleUpdateScene({ sceneId: 'missing', content: 'x' }, ctx);
    expect(result.ok).toBe(false);
    expect(ctx.nodes[0].data.content).toBe('');
  });

  it('更新已存在场景的内容，并提示覆盖语义', () => {
    const ctx = makeCtx([makeNode('start', '旧内容')]);
    const result = handleUpdateScene({ sceneId: 'start', content: '新内容' }, ctx);
    expect(result.ok).toBe(true);
    expect(ctx.nodes[0].data.content).toBe('新内容');
    expect(result.warnings?.[0]).toContain('覆盖');
  });
});

describe('handleAddScene', () => {
  it('添加新场景并支持 afterSceneId 定位', () => {
    const anchor = makeNode('start');
    anchor.position = { x: 100, y: 100 };
    const ctx = makeCtx([anchor]);

    const result = handleAddScene({ sceneId: 'forest', content: '森林场景', afterSceneId: 'start' }, ctx);

    expect(result.ok).toBe(true);
    expect(ctx.nodes).toHaveLength(2);
    expect(ctx.nodes[1]).toMatchObject({ id: 'forest', data: { content: '森林场景' } });
    expect(ctx.nodes[1].position.x).toBeGreaterThan(100);
  });

  it('重复或非法 ID 返回失败', () => {
    const ctx = makeCtx([makeNode('start', '原内容')]);
    expect(handleAddScene({ sceneId: 'start', content: '新内容' }, ctx).ok).toBe(false);
    expect(handleAddScene({ sceneId: 'bad id', content: 'x' }, ctx).ok).toBe(false);
    expect(ctx.nodes).toHaveLength(1);
  });
});

describe('handleDeleteScene', () => {
  it('禁止删除 start 场景', () => {
    const ctx = makeCtx([makeNode('start')]);
    const result = handleDeleteScene({ sceneId: 'start' }, ctx);
    expect(result.ok).toBe(false);
    expect(ctx.nodes).toHaveLength(1);
  });

  it('删除场景节点及所有相关的边', () => {
    const ctx = makeCtx(
      [makeNode('start'), makeNode('forest')],
      [makeEdge('e1', 'start', 'forest'), makeEdge('e2', 'forest', 'start')],
    );

    const result = handleDeleteScene({ sceneId: 'forest' }, ctx);

    expect(result.ok).toBe(true);
    expect(ctx.nodes.map((node) => node.id)).toEqual(['start']);
    expect(ctx.edges).toEqual([]);
  });
});

describe('handleRenameScene', () => {
  it('新旧 ID 相同或新 ID 已存在时失败', () => {
    const ctx = makeCtx([makeNode('start'), makeNode('forest')]);
    expect(handleRenameScene({ oldId: 'start', newId: 'start' }, ctx).ok).toBe(false);
    expect(handleRenameScene({ oldId: 'start', newId: 'forest' }, ctx).ok).toBe(false);
    expect(ctx.nodes.map((node) => node.id)).toEqual(['start', 'forest']);
  });

  it('重命名场景并同步更新引用它的边的 source/target', () => {
    const ctx = makeCtx(
      [makeNode('start'), makeNode('forest')],
      [makeEdge('e1', 'start', 'forest'), makeEdge('e2', 'forest', 'start')],
    );

    const result = handleRenameScene({ oldId: 'start', newId: 'intro' }, ctx);

    expect(result.ok).toBe(true);
    expect(ctx.nodes.map((node) => node.id)).toEqual(['intro', 'forest']);
    expect(ctx.edges).toEqual([
      { id: 'e1', source: 'intro', target: 'forest' },
      { id: 'e2', source: 'forest', target: 'intro' },
    ]);
  });
});

describe('handleUpdateSceneText', () => {
  it('场景不存在时失败，存在时只改文案', () => {
    const ctx = makeCtx([makeNode('start', '旧')]);
    expect(handleUpdateSceneText({ sceneId: 'missing', text: 'x' }, ctx).ok).toBe(false);
    expect(handleUpdateSceneText({ sceneId: 'start', text: '新' }, ctx).ok).toBe(true);
    expect(ctx.nodes[0].data.content).toBe('新');
  });
});

describe('场景配图', () => {
  it('updateSceneImagePrompt 无 ai_image 时新增', () => {
    const ctx = makeCtx([makeNode('start')]);
    handleUpdateSceneImagePrompt({ sceneId: 'start', imagePrompt: '森林里的小屋' }, ctx);
    expect(ctx.nodes[0].data.assets[0].asset).toEqual({ type: 'ai_image', prompt: '森林里的小屋' });
  });

  it('updateSceneImagePrompt 已有 ai_image 时只更新 prompt', () => {
    const node = makeNode('start');
    node.data.assets = [
      { editorId: 'x', asset: { type: 'ai_image', prompt: '旧 prompt', url: 'https://x.com/a.png' } },
    ];
    const ctx = makeCtx([node]);

    handleUpdateSceneImagePrompt({ sceneId: 'start', imagePrompt: '新 prompt' }, ctx);

    expect(ctx.nodes[0].data.assets).toHaveLength(1);
    expect(ctx.nodes[0].data.assets[0].asset).toEqual({
      type: 'ai_image',
      prompt: '新 prompt',
      url: 'https://x.com/a.png',
    });
  });

  it('setSceneImage 同时写 url/prompt/character', () => {
    const ctx = makeCtx([makeNode('start')]);
    const result = handleSetSceneImage(
      { sceneId: 'start', url: 'https://x/a.png', imagePrompt: '雾林', character: 'hero' },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(ctx.nodes[0].data.assets[0].asset).toMatchObject({
      type: 'ai_image',
      url: 'https://x/a.png',
      prompt: '雾林',
      character: 'hero',
    });
  });
});

describe('对话与重定向', () => {
  it('addDialogueLine 拒绝未注册角色', () => {
    const ctx = makeCtx([makeNode('start')]);
    const result = handleAddDialogueLine({ sceneId: 'start', speaker: 'ghost', content: '……' }, ctx);
    expect(result.ok).toBe(false);
    expect(ctx.nodes[0].data.content).toBe('');
  });

  it('addDialogueLine 追加已注册角色的对话', () => {
    const ctx = makeCtx([makeNode('start', '开场')]);
    const result = handleAddDialogueLine({ sceneId: 'start', speaker: 'hero', content: '出发', emotion: '坚定' }, ctx);
    expect(result.ok).toBe(true);
    expect(ctx.nodes[0].data.content).toBe('开场\n\n@hero (坚定): 出发');
  });

  it('addRedirect 要求目标场景存在', () => {
    const ctx = makeCtx([makeNode('start'), makeNode('forest')]);
    expect(handleAddRedirect({ sceneId: 'start', targetSceneId: 'ghost' }, ctx).ok).toBe(false);
    expect(handleAddRedirect({ sceneId: 'start', targetSceneId: 'forest' }, ctx).ok).toBe(true);
    expect(ctx.nodes[0].data.content).toBe('-> forest');
  });
});
