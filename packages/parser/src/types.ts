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
  voice_name?: string;
}

/**
 * 场景内容的原子节点。
 */
export type SceneContentNode = {
  type: 'text';
  content: string;
  audio_url?: string; // TTS 生成的语音 URL
};
/**
 * 对话行（DSL v2）：`@角色ID: 台词` / `@角色ID (表情): 台词`。
 * speaker 必须是 ai.characters 中已注册的角色 ID；emotion 是括号内的舞台指示自由文本，
 * 由站点模板自行解释（立绘表情、语气标注等）。
 */
export type SceneDialogueNode = {
  type: 'dialogue';
  speaker: string;
  emotion?: string;
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
  aspectRatio?: string;
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
  /** 未知 (key: value) 子句原文透传（如未来的 timer），stringify 原样写回 */
  clauses?: Record<string, string>;
};
export type SceneNode =
  | SceneContentNode
  | SceneDialogueNode
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
  /** 场景元数据块中的未知顶层键，原样透传（stringify 写回），新功能不需要动 parser */
  extra?: Record<string, unknown>;
}

/**
 * 游戏展示模式
 */
export type DisplayMode = 'classic' | 'immersive';

/**
 * 沉浸模式下文字框位置
 */
export type TextBoxPosition = 'bottom' | 'center' | 'top';

/**
 * 站点模版类型
 * - default: 默认模版（当前 jianjian 样式）
 * - visual-novel: 视觉小说模版（带路线图、多存档、设置等）
 */
export type SiteTemplate = 'default' | 'visual-novel';

/**
 * 代表整个游戏的数据结构。
 */
export interface Game {
  // DSL 版本号：缺省视为 1。仅用于兼容性判断与 lint 严格度，
  // 解析行为不分叉——v2 语法是 v1 的严格超集（DSL_V2_DESIGN 设计原则 P5）
  dsl_version?: number;

  // 元数据
  slug: string;
  title: string;
  description?: string;
  backgroundStory?: string;
  cover_image?: string;
  cover_prompt?: string;
  cover_aspect_ratio?: string;
  tags?: string[];
  published?: boolean;
  created_at?: string;
  updated_at?: string;

  // 播放模式
  display_mode?: DisplayMode;
  text_box_position?: TextBoxPosition;
  typewriter_speed?: number; // 毫秒/字，默认 40

  // 站点模版
  site_template?: SiteTemplate;
  subdomain?: string; // 绑定的二级域名前缀，如 '55'

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

  /** 全局 front matter 中的未知顶层键，原样透传（stringify 写回，消灭白名单抹除） */
  extra?: Record<string, unknown>;

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
  | SceneDialogueNode
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
  label?: string;
  description?: string;
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
  display_mode?: DisplayMode;
  text_box_position?: TextBoxPosition;
  typewriter_speed?: number;
  site_template?: SiteTemplate;
  subdomain?: string;

  initialState: GameState;
  characters?: Record<string, PlayableCharacter>;
  scenes: Record<string, PlayableScene>;
  startSceneId?: 'start';
}

/**
 * 结构化诊断（DSL_V2_DESIGN P1：宁可报错，不可静默丢弃）。
 * error 表示内容会丢失或行为已损坏（如废弃围栏语法），warning 表示可疑但可继续。
 */
export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  /** 稳定的诊断码，如 legacy-fence / duplicate-scene-id / ignored-block / orphan-audio / stray-content / invalid-yaml */
  code: string;
  message: string;
  sceneId?: string;
  /** 源文件行号（1 起，来自 mdast position） */
  line?: number;
}

export type DiagnosticReporter = (diagnostic: Diagnostic) => void;

/**
 * 解析器的返回结果。
 * warnings 为兼容保留（诊断的 message 文本）；结构化信息用 diagnostics。
 */
export type ParseResult =
  | { success: true; data: Game; warnings: string[]; diagnostics: Diagnostic[] }
  | { success: false; error: string };
