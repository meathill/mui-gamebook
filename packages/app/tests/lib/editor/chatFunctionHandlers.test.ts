import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import type { Game } from '@roudanio/parser/src/types';
import {
  cleanupInvalidEdges,
  executeEditorToolBatch,
  handleChatFunctionCall,
  type EditorDocument,
} from '@/lib/editor/chatFunctionHandlers';
import { flowToGame, type SceneNodeData } from '@/lib/editor/transformers';

function makeDocument(): EditorDocument {
  const nodes: Node<SceneNodeData>[] = [
    {
      id: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'start', content: '这是开始场景', assets: [] },
      type: 'scene',
    },
    {
      id: 'scene_1',
      position: { x: 100, y: 100 },
      data: { label: 'scene_1', content: '这是场景1', assets: [] },
      type: 'scene',
    },
  ];
  const edges: Edge[] = [
    {
      id: 'start-scene_1-0',
      source: 'start',
      target: 'scene_1',
      label: '继续',
      data: { condition: undefined, set: undefined },
    },
  ];
  const game: Game = {
    title: '测试游戏',
    slug: 'test-game',
    initialState: { gold: 100, hasKey: false },
    ai: { characters: { hero: { name: '英雄', description: '主角' } } },
    scenes: {},
  };
  return { nodes, edges, game: flowToGame(nodes, edges, game) };
}

function batch(doc: EditorDocument, calls: Array<{ name: string; args: Record<string, unknown> }>) {
  return executeEditorToolBatch(calls, doc);
}

function sceneNode(doc: EditorDocument, sceneId: string): Node<SceneNodeData> {
  const node = doc.nodes.find((item) => item.id === sceneId);
  if (!node) throw new Error(`missing scene ${sceneId}`);
  return node;
}

describe('编辑器工具执行引擎：场景', () => {
  it('updateScene 更新文案并返回真实结果', () => {
    const doc = makeDocument();
    const result = batch(doc, [{ name: 'updateScene', args: { sceneId: 'start', content: '新的开始' } }]);
    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.results[0]).toMatchObject({ name: 'updateScene', ok: true });
    expect(sceneNode(result.document!, 'start').data.content).toBe('新的开始');
  });

  it('updateScene 对不存在的场景返回 ok=false', () => {
    const result = batch(makeDocument(), [{ name: 'updateScene', args: { sceneId: 'not_exist', content: '内容' } }]);
    expect(result.changed).toBe(false);
    expect(result.results[0].ok).toBe(false);
    expect(result.results[0].message).toContain('不存在');
  });

  it('addScene 校验 ID 并支持 afterSceneId', () => {
    const doc = makeDocument();
    const result = batch(doc, [
      { name: 'addScene', args: { sceneId: 'forest', content: '森林', afterSceneId: 'scene_1' } },
    ]);
    expect(result.ok).toBe(true);
    const added = sceneNode(result.document!, 'forest');
    expect(added.position.x).toBeGreaterThan(sceneNode(result.document!, 'scene_1').position.x);

    const duplicate = batch(result.document!, [{ name: 'addScene', args: { sceneId: 'forest', content: 'x' } }]);
    expect(duplicate.results[0].ok).toBe(false);

    const invalid = batch(result.document!, [{ name: 'addScene', args: { sceneId: 'bad id', content: 'x' } }]);
    expect(invalid.results[0].ok).toBe(false);
  });

  it('deleteScene 删除相关边，start 不可删除', () => {
    const doc = makeDocument();
    const deleted = batch(doc, [{ name: 'deleteScene', args: { sceneId: 'scene_1' } }]);
    expect(deleted.ok).toBe(true);
    expect(deleted.document!.nodes.some((node) => node.id === 'scene_1')).toBe(false);
    expect(deleted.document!.edges).toHaveLength(0);

    const start = batch(doc, [{ name: 'deleteScene', args: { sceneId: 'start' } }]);
    expect(start.results[0].ok).toBe(false);
  });

  it('renameScene 同步更新 option 指向', () => {
    const result = batch(makeDocument(), [{ name: 'renameScene', args: { oldId: 'scene_1', newId: 'renamed' } }]);
    expect(result.ok).toBe(true);
    expect(result.document!.nodes.some((node) => node.id === 'renamed')).toBe(true);
    expect(result.document!.edges[0].target).toBe('renamed');
  });

  it('setSceneImage 创建并更新 ai_image', () => {
    const created = batch(makeDocument(), [
      { name: 'setSceneImage', args: { sceneId: 'start', url: 'https://cdn/x.png', imagePrompt: '雾林' } },
    ]);
    expect(created.ok).toBe(true);
    expect(sceneNode(created.document!, 'start').data.assets[0].asset).toMatchObject({
      type: 'ai_image',
      url: 'https://cdn/x.png',
      prompt: '雾林',
    });

    const updated = batch(created.document!, [
      { name: 'setSceneImage', args: { sceneId: 'start', imagePrompt: '新 prompt', character: 'hero' } },
    ]);
    expect(sceneNode(updated.document!, 'start').data.assets).toHaveLength(1);
    expect(sceneNode(updated.document!, 'start').data.assets[0].asset).toMatchObject({
      prompt: '新 prompt',
      character: 'hero',
    });

    const invalid = batch(created.document!, [{ name: 'setSceneImage', args: { sceneId: 'start' } }]);
    expect(invalid.results[0].ok).toBe(false);
  });

  it('addDialogueLine 要求角色已注册', () => {
    const ok = batch(makeDocument(), [
      { name: 'addDialogueLine', args: { sceneId: 'start', speaker: 'hero', content: '出发！', emotion: '坚定' } },
    ]);
    expect(ok.ok).toBe(true);
    expect(sceneNode(ok.document!, 'start').data.content).toContain('@hero (坚定): 出发！');

    const failed = batch(makeDocument(), [
      { name: 'addDialogueLine', args: { sceneId: 'start', speaker: 'ghost', content: '……' } },
    ]);
    expect(failed.results[0].ok).toBe(false);
  });

  it('addRedirect 要求目标场景存在', () => {
    const ok = batch(makeDocument(), [
      { name: 'addRedirect', args: { sceneId: 'start', targetSceneId: 'scene_1', condition: 'gold > 0' } },
    ]);
    expect(ok.ok).toBe(true);
    expect(sceneNode(ok.document!, 'start').data.content).toContain('-> scene_1 (if: gold > 0)');

    const failed = batch(makeDocument(), [{ name: 'addRedirect', args: { sceneId: 'start', targetSceneId: 'ghost' } }]);
    expect(failed.results[0].ok).toBe(false);
  });
});

describe('编辑器工具执行引擎：选项', () => {
  it('addChoice 可指向同一批新增的场景（工作副本可见）', () => {
    const result = batch(makeDocument(), [
      { name: 'addScene', args: { sceneId: 'forest', content: '森林' } },
      { name: 'addChoice', args: { sceneId: 'start', text: '去森林', targetSceneId: 'forest' } },
    ]);
    expect(result.ok).toBe(true);
    expect(result.results.every((item) => item.ok)).toBe(true);
    expect(result.document!.edges.some((edge) => edge.target === 'forest')).toBe(true);
  });

  it('addChoice 目标不存在时失败，但不影响同批其他调用', () => {
    const result = batch(makeDocument(), [
      { name: 'addChoice', args: { sceneId: 'start', text: '坏链', targetSceneId: 'ghost' } },
      { name: 'updateSceneText', args: { sceneId: 'start', text: '改文案' } },
    ]);
    expect(result.ok).toBe(true);
    expect(result.results.find((item) => item.name === 'addChoice')?.ok).toBe(false);
    expect(result.results.find((item) => item.name === 'updateSceneText')?.ok).toBe(true);
  });

  it('updateChoice/deleteChoice 校验 choiceIndex', () => {
    const doc = makeDocument();
    const updated = batch(doc, [
      { name: 'updateChoiceText', args: { sceneId: 'start', choiceIndex: 0, text: '新选项' } },
    ]);
    expect(updated.ok).toBe(true);
    expect(updated.document!.edges[0].label).toBe('新选项');

    const outOfRange = batch(doc, [
      { name: 'updateChoiceCondition', args: { sceneId: 'start', choiceIndex: 9, condition: 'gold > 0' } },
    ]);
    expect(outOfRange.results[0].ok).toBe(false);

    const deleted = batch(doc, [{ name: 'deleteChoice', args: { sceneId: 'start', choiceIndex: 0 } }]);
    expect(deleted.ok).toBe(true);
    expect(deleted.document!.edges).toHaveLength(0);
  });

  it('updateChoiceTarget 拒绝不存在的目标', () => {
    const result = batch(makeDocument(), [
      { name: 'updateChoiceTarget', args: { sceneId: 'start', choiceIndex: 0, targetSceneId: 'ghost' } },
    ]);
    expect(result.results[0].ok).toBe(false);
  });
});

describe('编辑器工具执行引擎：变量与角色', () => {
  it('变量增改删与重复保护', () => {
    const added = batch(makeDocument(), [{ name: 'addVariable', args: { name: 'hp', value: '10' } }]);
    expect(added.ok).toBe(true);
    expect(added.document!.game.initialState.hp).toBe(10);

    const duplicate = batch(added.document!, [{ name: 'addVariable', args: { name: 'hp', value: '20' } }]);
    expect(duplicate.results[0].ok).toBe(false);

    const updated = batch(added.document!, [{ name: 'updateVariable', args: { name: 'hp', value: '20' } }]);
    expect(updated.document!.game.initialState.hp).toBe(20);

    const deleted = batch(added.document!, [{ name: 'deleteVariable', args: { name: 'hp' } }]);
    expect(deleted.document!.game.initialState.hp).toBeUndefined();
  });

  it('deleteVariable 对剧本引用给出 warning', () => {
    const doc = makeDocument();
    sceneNode(doc, 'start').data.content = '你有 {{gold}} 金币';
    const result = batch(doc, [{ name: 'deleteVariable', args: { name: 'gold' } }]);
    expect(result.ok).toBe(true);
    expect(result.results[0].warnings?.join('\n')).toContain('gold');
  });

  it('角色增改删与 imageUrl', () => {
    const added = batch(makeDocument(), [
      { name: 'addCharacter', args: { id: 'villain', name: '反派', description: '坏人' } },
    ]);
    expect(added.ok).toBe(true);

    const updated = batch(added.document!, [
      { name: 'updateCharacter', args: { id: 'villain', imageUrl: 'https://cdn/v.png' } },
    ]);
    expect(updated.document!.game.ai.characters?.villain.image_url).toBe('https://cdn/v.png');

    const deleted = batch(updated.document!, [{ name: 'deleteCharacter', args: { id: 'hero' } }]);
    expect(deleted.document!.game.ai.characters?.hero).toBeUndefined();
  });
});

describe('编辑器工具执行引擎：只读与校验', () => {
  it('getScene/listScenes/validateScript 通过同一 WebMCP 内核', () => {
    const result = batch(makeDocument(), [
      { name: 'getScene', args: { sceneId: 'start' } },
      { name: 'listScenes', args: {} },
      { name: 'validateScript', args: {} },
    ]);
    expect(result.changed).toBe(false);
    expect(result.results.every((item) => item.ok)).toBe(true);

    const detail = JSON.parse(result.results[0].message);
    expect(detail.choices).toEqual([{ choiceIndex: 0, text: '继续', targetSceneId: 'scene_1' }]);
    expect(result.results[1].message).toContain('start');
    expect(JSON.parse(result.results[2].message).ok).toBe(true);
  });

  it('整批校验失败时回滚，不提交任何修改', () => {
    const doc = makeDocument();
    const result = batch(doc, [
      { name: 'renameScene', args: { oldId: 'start', newId: 'intro' } },
      { name: 'updateSceneText', args: { sceneId: 'start', text: '不会被提交' } },
    ]);
    expect(result.ok).toBe(false);
    expect(result.changed).toBe(false);
    expect(result.document).toBe(doc);
    expect(result.error).toContain('回滚');
    expect(result.results.find((item) => item.name === 'renameScene')?.message).toContain('未提交');
    expect(result.results.every((item) => !item.ok)).toBe(true);
  });

  it('重复调用被跳过，未知工具返回错误', () => {
    const result = batch(makeDocument(), [
      { name: 'updateSceneText', args: { sceneId: 'start', text: 'A' } },
      { name: 'updateSceneText', args: { sceneId: 'start', text: 'A' } },
      { name: 'unknownTool', args: {} },
    ]);
    expect(result.results.filter((item) => item.name === 'updateSceneText')).toHaveLength(2);
    expect(result.results[1].message).toContain('重复调用');
    expect(result.results[2].ok).toBe(false);
  });

  it('批量按优先级重排后，每条结果仍通过 call id 对齐', () => {
    const result = executeEditorToolBatch(
      [
        { id: 'update', name: 'updateSceneText', args: { sceneId: 'start', text: '改后' } },
        { id: 'add', name: 'addScene', args: { sceneId: 'forest', content: '森林' } },
      ],
      makeDocument(),
    );

    expect(result.results.find((item) => item.id === 'add')).toMatchObject({ name: 'addScene', ok: true });
    expect(result.results.find((item) => item.id === 'update')).toMatchObject({
      name: 'updateSceneText',
      ok: true,
    });
  });
});

describe('cleanupInvalidEdges', () => {
  it('删除来源或目标不存在的边', () => {
    const doc = makeDocument();
    doc.edges.push({ id: 'bad-target', source: 'start', target: 'ghost', label: '坏链' });
    doc.edges.push({ id: 'bad-source', source: 'ghost', target: 'start', label: '坏源' });
    expect(cleanupInvalidEdges(doc)).toBe(2);
    expect(doc.edges).toHaveLength(1);
  });
});

describe('handleChatFunctionCall 单条执行', () => {
  it('就地修改并返回结构化结果', () => {
    const doc = makeDocument();
    const result = handleChatFunctionCall('updateSceneText', { sceneId: 'start', text: '单条修改' }, doc);
    expect(result.ok).toBe(true);
    expect(sceneNode(doc, 'start').data.content).toBe('单条修改');
  });
});
