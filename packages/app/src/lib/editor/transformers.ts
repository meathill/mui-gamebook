import { Node, Edge } from '@xyflow/react';
import { parseProseBlock } from '@mui-gamebook/parser/src/parse-scene';
import { proseNodeToLine } from '@mui-gamebook/parser/src/serialize';
import { Game, Scene, SceneNode } from '@mui-gamebook/parser/src/types';

export interface EditorSceneAsset {
  editorId: string;
  asset: SceneNode;
}

export function createEditorSceneAsset(asset: SceneNode): EditorSceneAsset {
  return {
    editorId: crypto.randomUUID(),
    asset,
  };
}

export function replaceEditorSceneAssetUrl(
  assets: EditorSceneAsset[],
  currentUrl: string,
  nextUrl: string | undefined,
): EditorSceneAsset[] {
  return assets.map((entry) => {
    if ('prompt' in entry.asset && entry.asset.url === currentUrl) {
      return {
        ...entry,
        asset: { ...entry.asset, url: nextUrl },
      };
    }
    return entry;
  });
}

// Type definitions for our custom Node data
export interface SceneNodeData extends Record<string, unknown> {
  label: string; // Scene ID
  /** prose 流的可编辑文本：旁白原文与对话行（`@角色ID (表情): 台词`）按段落拼接 */
  content: string;
  audio_url?: string; // TTS audio URL for the text content
  assets: EditorSceneAsset[]; // 编辑器内部素材，editorId 不进入 DSL
}

export function gameToFlow(game: Game): { nodes: Node<SceneNodeData>[]; edges: Edge[] } {
  const nodes: Node<SceneNodeData>[] = [];
  const edges: Edge[] = [];
  let x = 0;
  let y = 0;

  Object.entries(game.scenes).forEach(([id, scene]) => {
    // prose 流 = 旁白 + 对话，保序转为可编辑文本；对话行绝不能落进 assets（会被当素材卡渲染并在保存时错位）
    const proseNodes = scene.nodes.filter((n) => n.type === 'text' || n.type === 'dialogue');
    const assetNodes = scene.nodes.filter((n) => n.type !== 'text' && n.type !== 'dialogue' && n.type !== 'choice');
    const choiceNodes = scene.nodes.filter((n) => n.type === 'choice');

    const content = proseNodes
      .map((n) => proseNodeToLine(n as { type: 'text' | 'dialogue'; content: string }))
      .join('\n\n');
    // 获取第一个带语音的 prose 节点的 audio_url（多节点时只保留第一个的音频，既有限制）
    const audio_url = proseNodes.find((n) => 'audio_url' in n && n.audio_url)?.audio_url as string | undefined;

    nodes.push({
      id: id,
      position: { x, y }, // In a real app, we might want to auto-layout this
      data: {
        label: id,
        content,
        audio_url,
        assets: assetNodes.map(createEditorSceneAsset),
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

  // 对话行识别与 parser 同源：只有已注册角色的 @id: 行才是对话
  const characterIds: ReadonlySet<string> = new Set(Object.keys(originalGame.ai?.characters ?? {}));

  nodes.forEach((node) => {
    const sceneId = node.id;
    const sceneNodes: SceneNode[] = [];

    // 顺序约定：Assets（素材，序列化时进场景头元数据块）→ prose 流 → Choices
    if (node.data.assets) {
      sceneNodes.push(...node.data.assets.map((entry) => entry.asset));
    }

    // prose 流：按空行拆段，每段经 parseProseBlock 还原为 text/dialogue 节点
    if (node.data.content) {
      const proseNodes = node.data.content.split(/\n{2,}/).flatMap((block) => parseProseBlock(block, characterIds));
      if (node.data.audio_url && proseNodes.length > 0) {
        const first = proseNodes[0];
        if (first.type === 'text' || first.type === 'dialogue') {
          first.audio_url = node.data.audio_url;
        }
      }
      sceneNodes.push(...proseNodes);
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
