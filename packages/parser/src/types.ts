/**
 * 本文件定义了 DSL 解析器成功解析后输出的结构化数据类型。
 */

/**
 * 游戏状态变量的记录，键为变量名，值为任意类型。
 */
export type GameState = Record<string, any>;

/**
 * AI 角色定义。
 */
export interface AICharacter {
  name: string;
  description?: string;
  image_prompt?: string;
  voice_sample_url?: string;
}

/**
 * 场景内容的原子节点。
 */
export type SceneNode =
  | { type: 'text'; content: string }
  | { type: 'static_image'; alt?: string; url: string }
  | {
      type: 'ai_image';
      prompt: string;
      character?: string;
      url?: string;
    }
  | {
      type: 'ai_audio';
      audioType: 'sfx' | 'background_music';
      prompt: string;
      url?: string;
    }
  | {
      type: 'ai_video';
      prompt: string;
      url?: string;
    }
  | {
      type: 'choice';
      text: string;
      nextSceneId: string;
      condition?: string; // e.g., "has_key == true"
      set?: string; // e.g., "gold = gold + 5, has_key = false"
    };

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
  title: string;
  description?: string;
  cover_image?: string;
  tags?: string[];
  published?: boolean;

  // 初始状态
  initialState: GameState;

  // AI 配置
  ai: {
    style?: Record<string, string>;
    characters?: Record<string, AICharacter>;
  };

  // 场景集合
  scenes: Map<string, Scene>;
}

/**
 * 解析器的返回结果。
 */
export type ParseResult =
  | { success: true; data: Game }
  | { success: false; error: string };
