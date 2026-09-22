import { describe, expect, it } from 'vitest';
import type { Game } from '@mui-gamebook/parser/src/types';
import { cleanupInvalidChoices, dryRunWebMcpBatch, executeWebMcpBatch, parseVariableValue } from '../src/core';
import { getReadonlyTools, getWritableTools, sortWebMcpCalls, WEBMCP_TOOLS } from '../src/tools';

function makeGame(): Game {
  return {
    slug: 'test',
    title: 'test',
    initialState: { hp: 100 },
    ai: { characters: { hero: { name: '主角' } } },
    scenes: {
      start: { id: 'start', nodes: [{ type: 'text', content: '开始' }] },
    },
  };
}

describe('webmcp tools 清单', () => {
  it('写工具与只读工具划分正确', () => {
    expect(WEBMCP_TOOLS.length).toBeGreaterThan(20);
    expect(
      getReadonlyTools()
        .map((t) => t.name)
        .sort(),
    ).toEqual(['getDsl', 'listScenes']);
    expect(getWritableTools().length).toBe(WEBMCP_TOOLS.length - 2);
  });

  it('批量排序：增→删→改', () => {
    const sorted = sortWebMcpCalls([
      { name: 'updateSceneText', args: {} },
      { name: 'addScene', args: {} },
    ]);
    expect(sorted[0].name).toBe('addScene');
  });
});

describe('webmcp 纯核', () => {
  it('场景增删改', () => {
    const game = makeGame();
    const results = executeWebMcpBatch(game, [
      { name: 'addScene', args: { sceneId: 's2', content: '第二幕' } },
      { name: 'updateSceneText', args: { sceneId: 's2', text: '改后' } },
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(game.scenes['s2'].nodes.some((n) => n.type === 'text' && n.content === '改后')).toBe(true);
  });

  it('重命名同步更新选项指向，删除清理悬空', () => {
    const game = makeGame();
    executeWebMcpBatch(game, [
      { name: 'addScene', args: { sceneId: 'b', content: 'B' } },
      { name: 'addChoice', args: { sceneId: 'start', text: '去B', targetSceneId: 'b' } },
      { name: 'renameScene', args: { oldId: 'b', newId: 'c' } },
    ]);
    expect(game.scenes['start'].nodes.some((n) => n.type === 'choice' && n.nextSceneId === 'c')).toBe(true);
    executeWebMcpBatch(game, [{ name: 'deleteScene', args: { sceneId: 'c' } }]);
    expect(game.scenes['start'].nodes.some((n) => n.type === 'choice')).toBe(false);
  });

  it('对话要求角色已注册', () => {
    const game = makeGame();
    const results = executeWebMcpBatch(game, [
      { name: 'addDialogueLine', args: { sceneId: 'start', speaker: 'ghost', content: 'hi' } },
    ]);
    expect(results[0].ok).toBe(false);
  });

  it('setSceneImage 可写 url 与 prompt', () => {
    const game = makeGame();
    const results = executeWebMcpBatch(game, [
      {
        name: 'setSceneImage',
        args: { sceneId: 'start', url: 'https://cdn/x.png', imagePrompt: '雾林', character: 'hero' },
      },
    ]);
    expect(results[0].ok).toBe(true);
    const img = game.scenes['start'].nodes.find((n) => n.type === 'ai_image');
    expect(img).toMatchObject({ url: 'https://cdn/x.png', prompt: '雾林', character: 'hero' });
  });

  it('updateCharacter 可写 image_url', () => {
    const game = makeGame();
    executeWebMcpBatch(game, [{ name: 'updateCharacter', args: { id: 'hero', imageUrl: 'https://cdn/hero.png' } }]);
    expect(game.ai.characters?.['hero'].image_url).toBe('https://cdn/hero.png');
  });

  it('变量值解析', () => {
    expect(parseVariableValue('true')).toBe(true);
    expect(parseVariableValue('42')).toBe(42);
    expect(parseVariableValue('hello')).toBe('hello');
  });

  it('dryRun 不污染原对象', () => {
    const game = makeGame();
    const { results, game: next } = dryRunWebMcpBatch(game, [
      { name: 'addScene', args: { sceneId: 'tmp', content: 'x' } },
    ]);
    expect(results[0].ok).toBe(true);
    expect(game.scenes['tmp']).toBeUndefined();
    expect(next.scenes['tmp']).toBeDefined();
  });

  it('cleanupInvalidChoices 返回清理数', () => {
    const game = makeGame();
    game.scenes['start'].nodes.push({ type: 'choice', text: '坏链', nextSceneId: 'missing' });
    expect(cleanupInvalidChoices(game)).toBe(1);
  });
});
