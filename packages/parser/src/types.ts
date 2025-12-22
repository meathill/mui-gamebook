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
export type SceneContentNode = {
  type: 'text';
  content: string;
  audio_url?: string; // TTS 生成的语音 URL
};
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
  audio_url?: string; // TTS 生成的语音 URL
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
  created_at?: string;
  updated_at?: string;

  // 初始状态（带元数据）
  initialState: GameState;
  state?: GameState;

  // AI 配置
  ai: {
    style?: Record<string, string>;
    characters?: Record<string, AICharacter>;
  };

  // 场景集合
  scenes: Record<string, Scene>;

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
  scenes: Record<string, PlayableScene>;
  startSceneId?: 'start';
}

/**
 * 解析器的返回结果。
 */
export type ParseResult = { success: true; data: Game } | { success: false; error: string };
