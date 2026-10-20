import { describe, expect, it } from 'vitest';
import type { Game } from '@roudanio/parser/src/types';
import { handleAddVariable, handleDeleteVariable, handleUpdateVariable } from '@/lib/editor/handlers/variableHandlers';
import type { HandlerContext } from '@/lib/editor/handlers/types';
import type { SceneNodeData } from '@/lib/editor/transformers';
import type { Node } from '@xyflow/react';

function makeGame(initialState: Game['initialState'] = {}): Game {
  return {
    slug: 'g',
    title: 'T',
    tags: [],
    published: false,
    initialState,
    ai: { style: {}, characters: {} },
    scenes: {},
  };
}

function makeCtx(game: Game, nodes: Node<SceneNodeData>[] = []): HandlerContext {
  return { nodes, edges: [], game };
}

describe('handleAddVariable', () => {
  it('添加简单变量，value 按 parseValue 规则解析类型', () => {
    const ctx = makeCtx(makeGame());
    expect(handleAddVariable({ name: 'gold', value: '100' }, ctx).ok).toBe(true);
    expect(handleAddVariable({ name: 'has_key', value: 'true' }, ctx).ok).toBe(true);
    expect(handleAddVariable({ name: 'name', value: 'hero' }, ctx).ok).toBe(true);
    expect(ctx.game.initialState).toEqual({ gold: 100, has_key: true, name: 'hero' });
  });

  it('带 visible/label 时使用带元数据的包装形式', () => {
    const ctx = makeCtx(makeGame());
    handleAddVariable({ name: 'gold', value: '100', visible: true, label: '金币' }, ctx);
    expect(ctx.game.initialState.gold).toEqual({ value: 100, visible: true, label: '金币' });
  });

  it('变量已存在时返回失败，不覆盖原值', () => {
    const ctx = makeCtx(makeGame({ gold: 50 }));
    const result = handleAddVariable({ name: 'gold', value: '100' }, ctx);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('已存在');
    expect(ctx.game.initialState.gold).toBe(50);
  });
});

describe('handleUpdateVariable', () => {
  it('变量不存在时返回失败', () => {
    const ctx = makeCtx(makeGame());
    const result = handleUpdateVariable({ name: 'gold', value: '100' }, ctx);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('不存在');
  });

  it('更新简单变量的值', () => {
    const ctx = makeCtx(makeGame({ gold: 50 }));
    handleUpdateVariable({ name: 'gold', value: '80' }, ctx);
    expect(ctx.game.initialState.gold).toBe(80);
  });

  it('更新带元数据变量时保留未传的字段', () => {
    const ctx = makeCtx(makeGame({ gold: { value: 50, visible: true, label: '金币' } }));
    handleUpdateVariable({ name: 'gold', value: '80' }, ctx);
    expect(ctx.game.initialState.gold).toEqual({ value: 80, visible: true, label: '金币' });
  });

  it('给简单变量补上 visible/label 时转换为带元数据的包装形式', () => {
    const ctx = makeCtx(makeGame({ gold: 50 }));
    handleUpdateVariable({ name: 'gold', visible: true }, ctx);
    expect(ctx.game.initialState.gold).toEqual({ value: 50, visible: true, label: 'gold' });
  });
});

describe('handleDeleteVariable', () => {
  it('删除已存在的变量', () => {
    const ctx = makeCtx(makeGame({ gold: 50, has_key: true }));
    const result = handleDeleteVariable({ name: 'gold' }, ctx);
    expect(result.ok).toBe(true);
    expect(ctx.game.initialState).toEqual({ has_key: true });
  });

  it('变量不存在时返回失败', () => {
    const ctx = makeCtx(makeGame());
    expect(handleDeleteVariable({ name: 'gold' }, ctx).ok).toBe(false);
  });

  it('剧本仍引用变量时给出 warning', () => {
    const node: Node<SceneNodeData> = {
      id: 'start',
      position: { x: 0, y: 0 },
      type: 'scene',
      data: { label: 'start', content: '你有 {{gold}} 金币', assets: [] },
    };
    const ctx = makeCtx(makeGame({ gold: 50 }), [node]);
    const result = handleDeleteVariable({ name: 'gold' }, ctx);
    expect(result.ok).toBe(true);
    expect(result.warnings?.[0]).toContain('gold');
  });
});
