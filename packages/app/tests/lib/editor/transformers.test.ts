import { describe, it, expect } from 'vitest';
import { createEditorSceneAsset, gameToFlow, flowToGame, replaceEditorSceneAssetUrl } from '@/lib/editor/transformers';
import type { Game } from '@mui-gamebook/parser/src/types';

const mockGame: Game = {
  slug: 'test-game',
  title: 'Test Game',
  initialState: {},
  ai: {},
  published: false,
  scenes: {
    start: {
      id: 'start',
      nodes: [
        { type: 'text', content: 'Hello' },
        { type: 'choice', text: 'Go', nextSceneId: 'end', condition: 'flag == true' },
      ],
    },
    end: {
      id: 'end',
      nodes: [{ type: 'text', content: 'Bye' }],
    },
  },
};

const mockGameWithAudio: Game = {
  slug: 'test-game-audio',
  title: 'Test Game With Audio',
  initialState: {},
  ai: {},
  published: false,
  scenes: {
    start: {
      id: 'start',
      nodes: [
        { type: 'text', content: '欢迎来到故事', audio_url: 'https://example.com/welcome.wav' },
        { type: 'choice', text: '开始', nextSceneId: 'end' },
      ],
    },
    end: {
      id: 'end',
      nodes: [{ type: 'text', content: '故事结束', audio_url: 'https://example.com/end.wav' }],
    },
  },
};

const mockGameWithAssets: Game = {
  slug: 'test-game-assets',
  title: 'Test Game With Assets',
  initialState: {},
  ai: {},
  published: false,
  scenes: {
    start: {
      id: 'start',
      nodes: [
        { type: 'ai_image', prompt: '森林' },
        { type: 'ai_audio', audioType: 'sfx', prompt: '鸟鸣' },
        { type: 'text', content: '进入森林' },
      ],
    },
  },
};

describe('Editor Transformers', () => {
  it('gameToFlow should convert Game to Nodes and Edges', () => {
    const { nodes, edges } = gameToFlow(mockGame);

    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);

    const startNode = nodes.find((n) => n.id === 'start');
    expect(startNode).toBeDefined();
    expect(startNode?.data.content).toBe('Hello');

    const edge = edges[0];
    expect(edge.source).toBe('start');
    expect(edge.target).toBe('end');
    expect(edge.label).toBe('Go');
    expect(edge.data?.condition).toBe('flag == true');
  });

  it('flowToGame should convert Nodes and Edges back to Game', () => {
    const { nodes, edges } = gameToFlow(mockGame);
    const newGame = flowToGame(nodes, edges, mockGame);

    expect(Object.keys(newGame.scenes).length).toBe(2);

    const startScene = newGame.scenes['start'];
    expect(startScene).toBeDefined();
    // Note: transformer logic puts assets/text/choices in a specific order
    // In this case: text ('Hello') -> choice ('Go')
    expect(startScene?.nodes).toHaveLength(2);
    expect((startScene?.nodes[0] as any).content).toBe('Hello');
    expect((startScene?.nodes[1] as { nextSceneId: string }).nextSceneId).toBe('end');
  });

  it('gameToFlow should preserve audio_url from text nodes', () => {
    const { nodes } = gameToFlow(mockGameWithAudio);

    const startNode = nodes.find((n) => n.id === 'start');
    expect(startNode).toBeDefined();
    expect(startNode?.data.audio_url).toBe('https://example.com/welcome.wav');

    const endNode = nodes.find((n) => n.id === 'end');
    expect(endNode).toBeDefined();
    expect(endNode?.data.audio_url).toBe('https://example.com/end.wav');
  });

  it('flowToGame should preserve audio_url in text nodes', () => {
    const { nodes, edges } = gameToFlow(mockGameWithAudio);
    const newGame = flowToGame(nodes, edges, mockGameWithAudio);

    const startScene = newGame.scenes['start'];
    expect(startScene).toBeDefined();
    const textNode = startScene?.nodes.find((n) => n.type === 'text');
    expect(textNode).toBeDefined();
    expect(textNode?.audio_url).toBe('https://example.com/welcome.wav');

    const endScene = newGame.scenes['end'];
    expect(endScene).toBeDefined();
    const endTextNode = endScene?.nodes.find((n) => n.type === 'text');
    expect(endTextNode).toBeDefined();
    expect(endTextNode?.audio_url).toBe('https://example.com/end.wav');
  });

  it('audio_url should survive round-trip conversion (Game -> Flow -> Game)', () => {
    // 这个测试确保 audio_url 在完整的转换往返中保持完整
    const { nodes, edges } = gameToFlow(mockGameWithAudio);
    const newGame = flowToGame(nodes, edges, mockGameWithAudio);

    // 再次转换回 Flow
    const { nodes: nodes2 } = gameToFlow(newGame);

    // 验证 audio_url 仍然存在
    const startNode = nodes2.find((n) => n.id === 'start');
    expect(startNode?.data.audio_url).toBe('https://example.com/welcome.wav');
  });

  it('应该为编辑器素材生成唯一 UI ID，并在保存时完全剥离', () => {
    const { nodes, edges } = gameToFlow(mockGameWithAssets);
    const assets = nodes[0].data.assets;

    expect(assets).toHaveLength(2);
    expect(assets[0].editorId).toEqual(expect.any(String));
    expect(assets[1].editorId).toEqual(expect.any(String));
    expect(assets[0].editorId).not.toBe(assets[1].editorId);
    expect(assets.map((entry) => entry.asset)).toEqual([
      { type: 'ai_image', prompt: '森林' },
      { type: 'ai_audio', audioType: 'sfx', prompt: '鸟鸣' },
    ]);

    const roundTripped = flowToGame(nodes, edges, mockGameWithAssets);
    expect(roundTripped.scenes.start.nodes).toEqual(mockGameWithAssets.scenes.start.nodes);
    expect(JSON.stringify(roundTripped)).not.toContain('editorId');
  });

  it('dialogue 节点不落 assets，编辑文本与节点互逆（DSL v2 Phase 2 保序）', () => {
    const gameWithDialogue: Game = {
      slug: 'test-dialogue',
      title: 'Test Dialogue',
      initialState: {},
      ai: { characters: { zhang: { name: '张大侠' } } },
      published: false,
      scenes: {
        start: {
          id: 'start',
          nodes: [
            { type: 'text', content: '森林深处传来脚步声。' },
            { type: 'dialogue', speaker: 'zhang', emotion: 'angry', content: '谁在那里？' },
            { type: 'text', content: '没有人回答。' },
          ],
        },
      },
    };

    const { nodes, edges } = gameToFlow(gameWithDialogue);

    // 对话在可编辑文本里以 DSL 原文行呈现，而不是素材卡
    expect(nodes[0].data.assets).toHaveLength(0);
    expect(nodes[0].data.content).toBe('森林深处传来脚步声。\n\n@zhang (angry): 谁在那里？\n\n没有人回答。');

    // 往返还原：多段落不再被合并成单个 text 节点，对话结构完整
    const roundTripped = flowToGame(nodes, edges, gameWithDialogue);
    expect(roundTripped.scenes.start.nodes).toEqual(gameWithDialogue.scenes.start.nodes);
  });

  it('未注册角色的 @xx: 行保存后仍是普通文本', () => {
    const game: Game = {
      slug: 't',
      title: 'T',
      initialState: {},
      ai: {},
      published: false,
      scenes: { start: { id: 'start', nodes: [{ type: 'text', content: '@stranger: 你好' }] } },
    };
    const { nodes, edges } = gameToFlow(game);
    const roundTripped = flowToGame(nodes, edges, game);
    expect(roundTripped.scenes.start.nodes).toEqual([{ type: 'text', content: '@stranger: 你好' }]);
  });

  it('异步 URL 回填应该保留素材 UI ID', () => {
    const pending = createEditorSceneAsset({
      type: 'ai_video',
      prompt: '海浪',
      url: 'pending://42',
    });
    const untouched = createEditorSceneAsset({ type: 'ai_image', prompt: '沙滩' });

    const updated = replaceEditorSceneAssetUrl([pending, untouched], 'pending://42', 'https://example.com/wave.mp4');

    expect(updated[0]).toEqual({
      editorId: pending.editorId,
      asset: {
        type: 'ai_video',
        prompt: '海浪',
        url: 'https://example.com/wave.mp4',
      },
    });
    expect(updated[1]).toBe(untouched);
  });
});
