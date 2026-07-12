import { describe, expect, it, vi } from 'vitest';
import { handleAddVariable, handleDeleteVariable, handleUpdateVariable } from '@/lib/editor/handlers/variableHandlers';
import type { HandlerContext } from '@/lib/editor/handlers/types';
import type { Game } from '@mui-gamebook/parser/src/types';

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

function makeCtx(game: Game | null): HandlerContext & { getGame: () => Game | null } {
  let current = game;
  return {
    nodes: [],
    edges: [],
    get originalGame() {
      return current;
    },
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    setOriginalGame: vi.fn((next) => {
      current = typeof next === 'function' ? next(current) : next;
    }),
    getGame: () => current,
  };
}

describe('handleAddVariable', () => {
  it('游戏数据未加载时直接返回提示，不调用 setOriginalGame', () => {
    const ctx = makeCtx(null);

    const result = handleAddVariable({ name: 'gold', value: '100' }, ctx);

    expect(result).toBe('游戏数据未加载');
    expect(ctx.setOriginalGame).not.toHaveBeenCalled();
  });

  it('添加简单变量，value 按 parseValue 规则解析类型', () => {
    const ctx = makeCtx(makeGame());

    handleAddVariable({ name: 'gold', value: '100' }, ctx);
    handleAddVariable({ name: 'has_key', value: 'true' }, ctx);
    handleAddVariable({ name: 'name', value: 'hero' }, ctx);

    expect(ctx.getGame()?.initialState).toEqual({ gold: 100, has_key: true, name: 'hero' });
  });

  it('带 visible/label 时使用带元数据的包装形式', () => {
    const ctx = makeCtx(makeGame());

    handleAddVariable({ name: 'gold', value: '100', visible: true, label: '金币' }, ctx);

    expect(ctx.getGame()?.initialState.gold).toEqual({ value: 100, visible: true, label: '金币' });
  });

  it('变量已存在时跳过添加，不覆盖原值', () => {
    const ctx = makeCtx(makeGame({ gold: 50 }));

    const result = handleAddVariable({ name: 'gold', value: '100' }, ctx);

    expect(result).toContain('跳过重复变量');
    expect(ctx.getGame()?.initialState.gold).toBe(50);
  });
});

describe('handleUpdateVariable', () => {
  it('变量不存在时返回提示，不调用 setOriginalGame', () => {
    const ctx = makeCtx(makeGame());

    const result = handleUpdateVariable({ name: 'gold', value: '100' }, ctx);

    expect(result).toContain('不存在');
    expect(ctx.setOriginalGame).not.toHaveBeenCalled();
  });

  it('更新简单变量的值', () => {
    const ctx = makeCtx(makeGame({ gold: 50 }));

    handleUpdateVariable({ name: 'gold', value: '80' }, ctx);

    expect(ctx.getGame()?.initialState.gold).toBe(80);
  });

  it('更新带元数据变量时保留未传的字段', () => {
    const ctx = makeCtx(makeGame({ gold: { value: 50, visible: true, label: '金币' } }));

    handleUpdateVariable({ name: 'gold', value: '80' }, ctx);

    expect(ctx.getGame()?.initialState.gold).toEqual({ value: 80, visible: true, label: '金币' });
  });

  it('给简单变量补上 visible/label 时转换为带元数据的包装形式', () => {
    const ctx = makeCtx(makeGame({ gold: 50 }));

    handleUpdateVariable({ name: 'gold', visible: true }, ctx);

    expect(ctx.getGame()?.initialState.gold).toEqual({ value: 50, visible: true, label: 'gold' });
  });
});

describe('handleDeleteVariable', () => {
  it('游戏数据未加载时直接返回提示', () => {
    const ctx = makeCtx(null);

    const result = handleDeleteVariable({ name: 'gold' }, ctx);

    expect(result).toBe('游戏数据未加载');
  });

  it('删除已存在的变量', () => {
    const ctx = makeCtx(makeGame({ gold: 50, has_key: true }));

    const result = handleDeleteVariable({ name: 'gold' }, ctx);

    expect(result).toContain('已删除变量');
    expect(ctx.getGame()?.initialState).toEqual({ has_key: true });
  });
});
