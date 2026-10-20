import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import type { Game } from '@roudanio/parser/src/types';
import {
  handleAddChoice,
  handleDeleteChoice,
  handleUpdateChoice,
  handleUpdateChoiceCondition,
  handleUpdateChoiceTarget,
  handleUpdateChoiceText,
} from '@/lib/editor/handlers/choiceHandlers';
import type { HandlerContext } from '@/lib/editor/handlers/types';
import type { SceneNodeData } from '@/lib/editor/transformers';

function makeNode(id: string): Node<SceneNodeData> {
  return { id, position: { x: 0, y: 0 }, type: 'scene', data: { label: id, content: '', assets: [] } };
}

function makeEdge(id: string, source: string, target: string, label: string, data: Record<string, unknown> = {}): Edge {
  return { id, source, target, label, data };
}

function makeGame(): Game {
  return { slug: 'g', title: 'T', initialState: {}, ai: { characters: {} }, scenes: {} };
}

function makeCtx(edges: Edge[]): HandlerContext {
  return {
    nodes: ['start', 'forest', 'cave', 'other-scene', 'x'].map(makeNode),
    edges,
    game: makeGame(),
  };
}

describe('handleAddChoice', () => {
  it('添加新选项', () => {
    const ctx = makeCtx([]);
    const result = handleAddChoice({ sceneId: 'start', text: '进入森林', targetSceneId: 'forest' }, ctx);

    expect(result.ok).toBe(true);
    expect(ctx.edges).toHaveLength(1);
    expect(ctx.edges[0]).toMatchObject({ source: 'start', target: 'forest', label: '进入森林' });
  });

  it('来源/目标/文本/条件/状态变更完全相同时视为重复，跳过', () => {
    const ctx = makeCtx([makeEdge('e1', 'start', 'forest', '进入森林', { condition: undefined, set: undefined })]);
    const result = handleAddChoice({ sceneId: 'start', text: '进入森林', targetSceneId: 'forest' }, ctx);

    expect(result.message).toContain('相同选项');
    expect(ctx.edges).toHaveLength(1);
  });

  it('文本不同则不算重复，允许添加', () => {
    const ctx = makeCtx([makeEdge('e1', 'start', 'forest', '进入森林')]);
    handleAddChoice({ sceneId: 'start', text: '返回', targetSceneId: 'forest' }, ctx);
    expect(ctx.edges).toHaveLength(2);
  });

  it('源场景或目标场景不存在时失败', () => {
    const ctx = makeCtx([]);
    expect(handleAddChoice({ sceneId: 'ghost', text: 'x', targetSceneId: 'forest' }, ctx).ok).toBe(false);
    expect(handleAddChoice({ sceneId: 'start', text: 'x', targetSceneId: 'ghost' }, ctx).ok).toBe(false);
  });
});

describe('handleUpdateChoice', () => {
  it('choiceIndex 超出该场景的选项范围时失败', () => {
    const ctx = makeCtx([makeEdge('e1', 'start', 'forest', '进入森林')]);
    const result = handleUpdateChoice({ sceneId: 'start', choiceIndex: 5, text: '新文本' }, ctx);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('choiceIndex 5');
    expect(ctx.edges[0].label).toBe('进入森林');
  });

  it('choiceIndex 是相对该场景出发的边而不是全局索引', () => {
    const ctx = makeCtx([
      makeEdge('e1', 'other-scene', 'x', '别的场景的选项'),
      makeEdge('e2', 'start', 'forest', '进入森林'),
    ]);

    handleUpdateChoice({ sceneId: 'start', choiceIndex: 0, text: '新文本' }, ctx);

    expect(ctx.edges.find((edge) => edge.id === 'e2')?.label).toBe('新文本');
    expect(ctx.edges.find((edge) => edge.id === 'e1')?.label).toBe('别的场景的选项');
  });

  it('只更新传入的字段', () => {
    const ctx = makeCtx([makeEdge('e1', 'start', 'forest', '进入森林', { condition: 'has_key' })]);
    handleUpdateChoice({ sceneId: 'start', choiceIndex: 0, targetSceneId: 'cave' }, ctx);

    const edge = ctx.edges[0];
    expect(edge.target).toBe('cave');
    expect(edge.label).toBe('进入森林');
    expect(edge.data?.condition).toBe('has_key');
  });
});

describe('handleDeleteChoice', () => {
  it('choiceIndex 超出范围时失败', () => {
    const ctx = makeCtx([makeEdge('e1', 'start', 'forest', '进入森林')]);
    expect(handleDeleteChoice({ sceneId: 'start', choiceIndex: 5 }, ctx).ok).toBe(false);
    expect(ctx.edges).toHaveLength(1);
  });

  it('删除指定选项', () => {
    const ctx = makeCtx([makeEdge('e1', 'start', 'forest', '进入森林'), makeEdge('e2', 'start', 'cave', '进入山洞')]);
    handleDeleteChoice({ sceneId: 'start', choiceIndex: 0 }, ctx);
    expect(ctx.edges).toEqual([expect.objectContaining({ id: 'e2' })]);
  });
});

describe('细粒度选项更新', () => {
  it('handleUpdateChoiceText 只改文本', () => {
    const ctx = makeCtx([makeEdge('e1', 'start', 'forest', '旧文本')]);
    handleUpdateChoiceText({ sceneId: 'start', choiceIndex: 0, text: '新文本' }, ctx);
    expect(ctx.edges[0].label).toBe('新文本');
    expect(ctx.edges[0].target).toBe('forest');
  });

  it('handleUpdateChoiceTarget 只改目标场景', () => {
    const ctx = makeCtx([makeEdge('e1', 'start', 'forest', '选项')]);
    handleUpdateChoiceTarget({ sceneId: 'start', choiceIndex: 0, targetSceneId: 'cave' }, ctx);
    expect(ctx.edges[0].target).toBe('cave');
    expect(ctx.edges[0].label).toBe('选项');
  });

  it('handleUpdateChoiceCondition 只改条件，保留其余 data 字段', () => {
    const ctx = makeCtx([makeEdge('e1', 'start', 'forest', '选项', { set: 'gold=100' })]);
    handleUpdateChoiceCondition({ sceneId: 'start', choiceIndex: 0, condition: 'has_key' }, ctx);
    expect(ctx.edges[0].data).toEqual({ set: 'gold=100', condition: 'has_key' });
  });
});
