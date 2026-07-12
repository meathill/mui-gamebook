import { describe, expect, it, vi } from 'vitest';
import {
  handleAddCharacter,
  handleDeleteCharacter,
  handleUpdateCharacter,
} from '@/lib/editor/handlers/characterHandlers';
import type { HandlerContext } from '@/lib/editor/handlers/types';
import type { Game } from '@mui-gamebook/parser/src/types';

function makeGame(characters: Game['ai']['characters'] = {}): Game {
  return {
    slug: 'g',
    title: 'T',
    tags: [],
    published: false,
    initialState: {},
    ai: { style: {}, characters },
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

describe('handleAddCharacter', () => {
  it('游戏数据未加载时直接返回提示', () => {
    const ctx = makeCtx(null);

    const result = handleAddCharacter({ id: 'hero', name: '英雄' }, ctx);

    expect(result).toBe('游戏数据未加载');
    expect(ctx.setOriginalGame).not.toHaveBeenCalled();
  });

  it('添加新角色', () => {
    const ctx = makeCtx(makeGame());

    handleAddCharacter({ id: 'hero', name: '英雄', description: '勇敢', imagePrompt: 'brave hero' }, ctx);

    expect(ctx.getGame()?.ai.characters?.hero).toEqual({
      name: '英雄',
      description: '勇敢',
      image_prompt: 'brave hero',
    });
  });

  it('角色 ID 已存在时跳过添加', () => {
    const ctx = makeCtx(makeGame({ hero: { name: '旧英雄' } }));

    const result = handleAddCharacter({ id: 'hero', name: '新英雄' }, ctx);

    expect(result).toContain('跳过重复角色');
    expect(ctx.getGame()?.ai.characters?.hero.name).toBe('旧英雄');
  });
});

describe('handleUpdateCharacter', () => {
  it('角色不存在时返回提示', () => {
    const ctx = makeCtx(makeGame());

    const result = handleUpdateCharacter({ id: 'hero', name: '英雄' }, ctx);

    expect(result).toContain('不存在');
    expect(ctx.setOriginalGame).not.toHaveBeenCalled();
  });

  it('只更新传入的字段，保留其余字段', () => {
    const ctx = makeCtx(makeGame({ hero: { name: '英雄', description: '旧描述', image_prompt: '旧 prompt' } }));

    handleUpdateCharacter({ id: 'hero', description: '新描述' }, ctx);

    expect(ctx.getGame()?.ai.characters?.hero).toEqual({
      name: '英雄',
      description: '新描述',
      image_prompt: '旧 prompt',
    });
  });
});

describe('handleDeleteCharacter', () => {
  it('角色不存在时返回提示', () => {
    const ctx = makeCtx(makeGame());

    const result = handleDeleteCharacter({ id: 'hero' }, ctx);

    expect(result).toContain('不存在');
  });

  it('删除已存在的角色', () => {
    const ctx = makeCtx(makeGame({ hero: { name: '英雄' }, villain: { name: '反派' } }));

    const result = handleDeleteCharacter({ id: 'hero' }, ctx);

    expect(result).toContain('已删除角色');
    expect(ctx.getGame()?.ai.characters).toEqual({ villain: { name: '反派' } });
  });
});
