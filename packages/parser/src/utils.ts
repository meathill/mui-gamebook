/**
 * 本文件包含与 Game/PlayableGame 相关的工具函数。
 */
import type {
  Game,
  GameState,
  GameStateValue,
  PlayableCharacter,
  PlayableGame,
  PlayableSceneNode,
  RuntimeState,
  VariableMeta,
} from './types';

/**
 * 判断值是否为变量元数据对象
 */
export function isVariableMeta(value: GameStateValue): value is VariableMeta {
  return typeof value === 'object' && value !== null && 'value' in value;
}

/**
 * 从 GameState 提取运行时值
 */
export function extractRuntimeState(state: GameState): RuntimeState {
  const runtime: RuntimeState = {};
  for (const [key, val] of Object.entries(state)) {
    runtime[key] = isVariableMeta(val) ? val.value : val;
  }
  return runtime;
}

/**
 * 获取变量的元数据（如果有）
 */
export function getVariableMeta(state: GameState, key: string): VariableMeta | null {
  const val = state[key];
  if (isVariableMeta(val)) {
    return val;
  }
  return null;
}

/**
 * 获取所有可见变量
 */
export function getVisibleVariables(state: GameState): Array<{ key: string; meta: VariableMeta }> {
  const result: Array<{ key: string; meta: VariableMeta }> = [];
  for (const [key, val] of Object.entries(state)) {
    if (isVariableMeta(val) && val.visible) {
      result.push({ key, meta: val });
    }
  }
  return result;
}

/**
 * 将完整游戏数据转换为玩家可见的版本（过滤敏感信息）
 */
export function toPlayableGame(game: Game): PlayableGame {
  // 过滤角色信息
  const characters: Record<string, PlayableCharacter> | undefined = game.ai.characters
    ? Object.fromEntries(
        Object.entries(game.ai.characters).map(([key, char]) => [key, { name: char.name, image_url: char.image_url }]),
      )
    : undefined;

  // 过滤场景节点
  const scenes: Record<string, { id: string; nodes: PlayableSceneNode[] }> = {};
  for (const [sceneId, scene] of Object.entries(game.scenes)) {
    const filteredNodes: PlayableSceneNode[] = scene.nodes.map((node) => {
      switch (node.type) {
        case 'ai_image':
          return { type: 'ai_image' as const, url: node.url, alt: node.character };
        case 'ai_audio':
          return { type: 'ai_audio' as const, audioType: node.audioType, url: node.url };
        case 'ai_video':
          return { type: 'ai_video' as const, url: node.url };
        case 'minigame':
          return {
            type: 'minigame' as const,
            url: node.url,
            variables: node.variables ? Object.keys(node.variables) : undefined,
          };
        default:
          return node;
      }
    });
    scenes[sceneId] = { id: scene.id, nodes: filteredNodes };
  }

  return {
    slug: game.slug,
    title: game.title,
    description: game.description,
    backgroundStory: game.backgroundStory,
    cover_image: game.cover_image,
    tags: game.tags,
    initialState: game.initialState,
    characters,
    scenes,
    startSceneId: game.startSceneId,
  };
}
