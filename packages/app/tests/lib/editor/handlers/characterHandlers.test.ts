import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import type { Game } from '@roudanio/parser/src/types';
import {
  handleAddCharacter,
  handleDeleteCharacter,
  handleUpdateCharacter,
} from '@/lib/editor/handlers/characterHandlers';
import type { HandlerContext } from '@/lib/editor/handlers/types';
import type { SceneNodeData } from '@/lib/editor/transformers';

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

function makeCtx(game: Game, nodes: Node<SceneNodeData>[] = []): HandlerContext {
  return { nodes, edges: [], game };
}

describe('handleAddCharacter', () => {
  it('添加新角色', () => {
    const ctx = makeCtx(makeGame());
    const result = handleAddCharacter(
      { id: 'hero', name: '英雄', description: '勇敢', imagePrompt: 'brave hero' },
      ctx,
    );
    expect(result.ok).toBe(true);
    expect(ctx.game.ai.characters?.hero).toEqual({
      name: '英雄',
      description: '勇敢',
      image_prompt: 'brave hero',
    });
  });

  it('角色 ID 已存在时返回失败，不覆盖原值', () => {
    const ctx = makeCtx(makeGame({ hero: { name: '旧英雄' } }));
    const result = handleAddCharacter({ id: 'hero', name: '新英雄' }, ctx);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('已存在');
    expect(ctx.game.ai.characters?.hero.name).toBe('旧英雄');
  });
});

describe('handleUpdateCharacter', () => {
  it('角色不存在时返回失败', () => {
    const ctx = makeCtx(makeGame());
    const result = handleUpdateCharacter({ id: 'hero', name: '英雄' }, ctx);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('不存在');
  });

  it('只更新传入的字段，保留其余字段', () => {
    const ctx = makeCtx(makeGame({ hero: { name: '英雄', description: '旧描述', image_prompt: '旧 prompt' } }));
    handleUpdateCharacter({ id: 'hero', description: '新描述' }, ctx);
    expect(ctx.game.ai.characters?.hero).toEqual({
      name: '英雄',
      description: '新描述',
      image_prompt: '旧 prompt',
    });
  });

  it('支持更新 imageUrl', () => {
    const ctx = makeCtx(makeGame({ hero: { name: '英雄' } }));
    handleUpdateCharacter({ id: 'hero', imageUrl: 'https://cdn/hero.png' }, ctx);
    expect(ctx.game.ai.characters?.hero.image_url).toBe('https://cdn/hero.png');
  });
});

describe('handleDeleteCharacter', () => {
  it('角色不存在时返回失败', () => {
    const ctx = makeCtx(makeGame());
    expect(handleDeleteCharacter({ id: 'hero' }, ctx).ok).toBe(false);
  });

  it('删除已存在的角色', () => {
    const ctx = makeCtx(makeGame({ hero: { name: '英雄' }, villain: { name: '反派' } }));
    const result = handleDeleteCharacter({ id: 'hero' }, ctx);
    expect(result.ok).toBe(true);
    expect(ctx.game.ai.characters).toEqual({ villain: { name: '反派' } });
  });

  it('删除仍被对话行引用的角色时给出 warning', () => {
    const node: Node<SceneNodeData> = {
      id: 'start',
      position: { x: 0, y: 0 },
      type: 'scene',
      data: { label: 'start', content: '@hero: 你好', assets: [] },
    };
    const ctx = makeCtx(makeGame({ hero: { name: '英雄' } }), [node]);
    const result = handleDeleteCharacter({ id: 'hero' }, ctx);
    expect(result.ok).toBe(true);
    expect(result.warnings?.[0]).toContain('@hero');
  });
});
