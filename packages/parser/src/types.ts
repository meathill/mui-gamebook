/**
 * 本文件定义了 DSL 解析器成功解析后输出的结构化数据类型。
 */

/**
 * 变量触发器配置
 */
export interface VariableTrigger {
  condition: string; // e.g., "<= 0", "== true"
  scene: string; // 目标场景 ID
}

/**
 * 变量展示方式
 */
export type VariableDisplay = 'value' | 'progress' | 'icon';

/**
 * 变量元数据定义
 */
export interface VariableMeta {
  value: number | string | boolean;
  visible?: boolean;
  display?: VariableDisplay;
  max?: number;
  label?: string;
  icon?: string; // 图标展示时使用的 emoji
  trigger?: VariableTrigger;
}

/**
 * 游戏状态变量的记录
 * 值可以是简单值或带元数据的对象
 */
export type GameStateValue = number | string | boolean | VariableMeta;
export type GameState = Record<string, GameStateValue>;

/**
 * 运行时状态（仅存储实际值）
 */
export type RuntimeState = Record<string, number | string | boolean>;

/**
 * AI 角色定义。
 */
export interface AICharacter {
  name: string;
  description?: string;
  image_prompt?: string;
  image_url?: string;
  voice_sample_url?: string;
}

/**
 * 场景内容的原子节点。
 */
export type SceneContentNode = { type: 'text'; content: string };
export type SceneStaticImageNode = { type: 'static_image'; alt?: string; url: string };
export type SceneStaticAudioNode = { type: 'static_audio'; url: string };
export type SceneStaticVideoNode = { type: 'static_video'; url: string };
export type SceneAiImageNode = {
  type: 'ai_image';
  prompt: string;
  character?: string;
  characters?: string[];
  url?: string;
};
export type SceneAiAudioNode = {
  type: 'ai_audio';
  audioType: 'sfx' | 'background_music';
  prompt: string;
  url?: string;
};
export type SceneAiVideoNode = {
  type: 'ai_video';
  prompt: string;
  url?: string;
};
export type SceneMiniGameNode = {
  type: 'minigame';
  prompt: string;
  variables?: Record<string, string>; // 变量名 -> 用途说明
  url?: string; // 生成后的 JS 链接，或 pending:operationId
};
export type SceneChoiceNode = {
  type: 'choice';
  text: string;
  nextSceneId: string;
  condition?: string; // e.g., "has_key == true"
  set?: string; // e.g., "gold = gold + 5, has_key = false"
};
export type SceneNode =
  | SceneContentNode
  | SceneStaticImageNode
  | SceneStaticAudioNode
  | SceneStaticVideoNode
  | SceneAiImageNode
  | SceneAiAudioNode
  | SceneAiVideoNode
  | SceneMiniGameNode
  | SceneChoiceNode;

/**
 * 代表一个独立的场景。
 */
export interface Scene {
  id: string;
  nodes: SceneNode[];
}

/**
 * 代表整个游戏的数据结构。
 */
export interface Game {
  // 元数据
  slug: string;
  title: string;
  description?: string;
  backgroundStory?: string;
  cover_image?: string;
  tags?: string[];
  published?: boolean;

  // 初始状态（带元数据）
  initialState: GameState;
  state?: GameState;

  // AI 配置
  ai: {
    style?: Record<string, string>;
    characters?: Record<string, AICharacter>;
  };

  // 场景集合
  scenes: Map<string, Scene>;

  // 未来可能会用到
  startSceneId?: 'start';
}

/**
 * 玩家可见的角色信息（过滤敏感数据）
 */
export interface PlayableCharacter {
  name: string;
  image_url?: string;
}

/**
 * 玩家可见的场景节点（过滤 AI prompt）
 */
export type PlayableSceneNode =
  | SceneContentNode
  | SceneStaticImageNode
  | SceneStaticAudioNode
  | SceneStaticVideoNode
  | { type: 'ai_image'; url?: string; alt?: string }
  | { type: 'ai_audio'; audioType: 'sfx' | 'background_music'; url?: string }
  | { type: 'ai_video'; url?: string }
  | { type: 'minigame'; url?: string; variables?: string[] } // 只保留 url 和变量名列表
  | SceneChoiceNode;

/**
 * 玩家可见的场景（过滤敏感数据）
 */
export interface PlayableScene {
  id: string;
  nodes: PlayableSceneNode[];
}

/**
 * 玩家可见的游戏数据（过滤敏感信息）
 * 不包含：AI prompt、角色描述、style 配置等创作者私有数据
 */
export interface PlayableGame {
  slug: string;
  title: string;
  description?: string;
  backgroundStory?: string;
  cover_image?: string;
  tags?: string[];

  initialState: GameState;
  characters?: Record<string, PlayableCharacter>;
  scenes: Map<string, PlayableScene>;
  startSceneId?: 'start';
}

/**
 * 可序列化的 PlayableGame（用于服务端到客户端传输）
 * Map 无法被 JSON 序列化，所以转换为 Record
 */
export interface SerializablePlayableGame {
  slug: string;
  title: string;
  description?: string;
  backgroundStory?: string;
  cover_image?: string;
  tags?: string[];

  initialState: GameState;
  characters?: Record<string, PlayableCharacter>;
  scenes: Record<string, PlayableScene>;
  startSceneId?: 'start';
}

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
  const scenes = new Map<string, PlayableScene>();
  for (const [sceneId, scene] of game.scenes) {
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
    scenes.set(sceneId, { id: scene.id, nodes: filteredNodes });
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

/**
 * 将 PlayableGame 转换为可序列化格式（用于服务端到客户端传输）
 */
export function toSerializablePlayableGame(game: PlayableGame): SerializablePlayableGame {
  const scenes: Record<string, PlayableScene> = {};
  for (const [sceneId, scene] of game.scenes) {
    scenes[sceneId] = scene;
  }
  return {
    ...game,
    scenes,
  };
}

/**
 * 从可序列化格式恢复 PlayableGame（在客户端使用）
 */
export function fromSerializablePlayableGame(game: SerializablePlayableGame): PlayableGame {
  const scenes = new Map<string, PlayableScene>();
  for (const [sceneId, scene] of Object.entries(game.scenes)) {
    scenes.set(sceneId, scene);
  }
  return {
    ...game,
    scenes,
  };
}

/**
 * 解析器的返回结果。
 */
export type ParseResult = { success: true; data: Game } | { success: false; error: string };
