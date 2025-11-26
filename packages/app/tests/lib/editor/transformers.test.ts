import { describe, it, expect } from 'vitest';
import { gameToFlow, flowToGame } from '@/lib/editor/transformers';
import type { Game } from '@mui-gamebook/parser/src/types';

const mockGame: Game = {
  title: 'Test Game',
  initialState: {},
  ai: {},
  published: false,
  scenes: new Map([
    ['start', {
      id: 'start',
      nodes: [
        { type: 'text', content: 'Hello' },
        { type: 'choice', text: 'Go', nextSceneId: 'end', condition: 'flag == true' }
      ]
    }],
    ['end', {
      id: 'end',
      nodes: [
        { type: 'text', content: 'Bye' }
      ]
    }]
  ])
};

describe('Editor Transformers', () => {
  it('gameToFlow should convert Game to Nodes and Edges', () => {
    const { nodes, edges } = gameToFlow(mockGame);

    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);

    const startNode = nodes.find(n => n.id === 'start');
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

    expect(newGame.scenes.size).toBe(2);
    
    const startScene = newGame.scenes.get('start');
    expect(startScene).toBeDefined();
    // Note: transformer logic puts assets/text/choices in a specific order
    // In this case: text ('Hello') -> choice ('Go')
    expect(startScene?.nodes).toHaveLength(2);
    expect(startScene?.nodes[0].content).toBe('Hello');
    expect((startScene?.nodes[1] as any).nextSceneId).toBe('end');
  });
});
