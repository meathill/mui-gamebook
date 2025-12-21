import { Node, Edge } from '@xyflow/react';
import { Game, Scene, SceneNode } from '@mui-gamebook/parser/src/types';

// Type definitions for our custom Node data
export interface SceneNodeData extends Record<string, unknown> {
  label: string; // Scene ID
  content: string; // Concatenated text content
  audio_url?: string; // TTS audio URL for the text content
  assets: SceneNode[]; // Non-text, non-choice nodes (images, etc.)
}

export function gameToFlow(game: Game): { nodes: Node<SceneNodeData>[]; edges: Edge[] } {
  const nodes: Node<SceneNodeData>[] = [];
  const edges: Edge[] = [];
  let x = 0;
  let y = 0;

  Object.entries(game.scenes).forEach(([id, scene]) => {
    const textNodes = scene.nodes.filter((n) => n.type === 'text');
    const assetNodes = scene.nodes.filter((n) => n.type !== 'text' && n.type !== 'choice');
    const choiceNodes = scene.nodes.filter((n) => n.type === 'choice');

    const content = textNodes.map((n) => n.content).join('\n\n');
    // 获取第一个文本节点的 audio_url（如果有多个文本节点，只保留第一个的音频）
    const audio_url = textNodes.find((n) => 'audio_url' in n && n.audio_url)?.audio_url as string | undefined;

    nodes.push({
      id: id,
      position: { x, y }, // In a real app, we might want to auto-layout this
      data: {
        label: id,
        content,
        audio_url,
        assets: assetNodes,
      },
      type: 'scene', // We will create a custom node type later
    });

    choiceNodes.forEach((choice, index) => {
      if (choice.type === 'choice') {
        edges.push({
          id: `${id}-${choice.nextSceneId}-${index}`,
          source: id,
          target: choice.nextSceneId,
          label: choice.text,
          data: {
            condition: choice.condition,
            set: choice.set,
            audio_url: choice.audio_url,
          },
        });
      }
    });

    // Simple layout strategy: diagonal
    x += 250;
    y += 150;
  });

  return { nodes, edges };
}

export function flowToGame(nodes: Node<SceneNodeData>[], edges: Edge[], originalGame: Game): Game {
  const newGame: Game = { ...originalGame };
  const scenes: Record<string, Scene> = {};

  nodes.forEach((node) => {
    const sceneId = node.id;
    const sceneNodes: SceneNode[] = [];

    // 1. Add Assets (Images, etc.) - Prepend or Append?
    // Convention: Assets first (like cover image), then text.
    // But wait, Markdown usually has text then options.
    // Let's preserve the order from data.assets if possible, or put images top.
    // For simplicity: Assets -> Text -> Choices
    if (node.data.assets) {
      sceneNodes.push(...node.data.assets);
    }

    // 2. Add Text (with optional audio_url)
    if (node.data.content) {
      const textNode: SceneNode = { type: 'text', content: node.data.content };
      if (node.data.audio_url) {
        textNode.audio_url = node.data.audio_url;
      }
      sceneNodes.push(textNode);
    }

    // 3. Add Choices (Edges)
    // Find all edges starting from this node
    const outgoingEdges = edges.filter((e) => e.source === sceneId);
    outgoingEdges.forEach((edge) => {
      sceneNodes.push({
        type: 'choice',
        text: (edge.label as string) || 'Next',
        nextSceneId: edge.target,
        condition: edge.data?.condition as string | undefined,
        set: edge.data?.set as string | undefined,
        audio_url: edge.data?.audio_url as string | undefined,
      });
    });

    scenes[sceneId] = { id: sceneId, nodes: sceneNodes };
  });

  newGame.scenes = scenes;
  return newGame;
}
