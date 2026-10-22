import { Node, Edge } from '@xyflow/react';
import { parseProseBlock } from '@roudanio/parser/src/parse-scene';
import { Game, Scene, SceneNode } from '@roudanio/parser/src/types';
import { proseNodesToContent } from './prose-audio';

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
  /**
   * prose 流的可编辑文本：旁白原文与对话行（`@角色ID (表情): 台词`）按段落拼接，
   * 每个带语音的节点后内联 `<!-- audio: URL -->` 注释（与 DSL 落盘形态一致，issue #9）
   */
  content: string;
  assets: EditorSceneAsset[]; // 编辑器内部素材，editorId 不进入 DSL
  extra?: Record<string, unknown>;
  contentOrder?: Array<{ type: 'prose' } | { type: 'asset' | 'choice'; id: string }>;
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

    const content = proseNodesToContent(proseNodes);
    const assets = assetNodes.map(createEditorSceneAsset);
    let assetIndex = 0;
    let choiceIndex = 0;
    const contentOrder: NonNullable<SceneNodeData['contentOrder']> = scene.nodes.map((entry) => {
      if (entry.type === 'text' || entry.type === 'dialogue') return { type: 'prose' };
      if (entry.type === 'choice') return { type: 'choice', id: `${id}-${entry.nextSceneId}-${choiceIndex++}` };
      return { type: 'asset', id: assets[assetIndex++].editorId };
    });

    nodes.push({
      id: id,
      position: { x, y }, // In a real app, we might want to auto-layout this
      data: {
        label: id,
        content,
        assets,
        contentOrder,
        ...(scene.extra ? { extra: scene.extra } : {}),
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
            clauses: choice.clauses,
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

    // prose 流：整段交给 parseProseBlock 还原（空行分段与语音注释归属都由 parser 处理）
    if (node.data.content) {
      sceneNodes.push(...parseProseBlock(node.data.content, characterIds));
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
        clauses: edge.data?.clauses as Record<string, string> | undefined,
      });
    });

    let orderedNodes = sceneNodes;
    if (node.data.contentOrder) {
      const prose = sceneNodes.filter(
        (entry) => entry.type === 'text' || entry.type === 'dialogue' || entry.type === 'redirect',
      );
      // 原有 redirect 在 assets 中，不能再作为正文重复放入。
      const originalAssets = new Set(node.data.assets.map((entry) => entry.asset));
      const proseQueue = prose.filter((entry) => !originalAssets.has(entry));
      const assetMap = new Map(node.data.assets.map((entry) => [entry.editorId, entry.asset]));
      const choiceMap = new Map(
        outgoingEdges.map((edge, index) => [edge.id, sceneNodes.slice(-outgoingEdges.length)[index]]),
      );
      const ordered: SceneNode[] = [];
      for (const slot of node.data.contentOrder) {
        if (slot.type === 'prose') {
          const next = proseQueue.shift();
          if (next) ordered.push(next);
        } else {
          const map = slot.type === 'asset' ? assetMap : choiceMap;
          const next = map.get(slot.id);
          if (next) {
            ordered.push(next);
            map.delete(slot.id);
          }
        }
      }
      orderedNodes = [...ordered, ...assetMap.values(), ...proseQueue, ...choiceMap.values()];
    }
    scenes[sceneId] = { id: sceneId, nodes: orderedNodes, ...(node.data.extra ? { extra: node.data.extra } : {}) };
  });

  newGame.scenes = scenes;
  return newGame;
}
