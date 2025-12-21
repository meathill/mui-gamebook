import { describe, it, expect } from 'vitest';
import { gameToFlow, flowToGame } from '@/lib/editor/transformers';
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
    expect(startScene?.nodes[0].content).toBe('Hello');
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
});
