/**
 * 本文件定义了 DSL 解析器成功解析后输出的结构化数据类型。
 */

/**
 * 变量触发器配置
 */
export interface VariableTrigger {
  condition: string; // e.g., "<= 0", "== true"
  scene: string;     // 目标场景 ID
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
  | SceneAiImageNode
  | SceneAiAudioNode
  | SceneAiVideoNode
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
 * 解析器的返回结果。
 */
export type ParseResult =
  | { success: true; data: Game }
  | { success: false; error: string };
