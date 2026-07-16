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
import { replaceCharacterMentions } from './replace-character-mentions';

/**
 * 场景 ID 的可引用字符集（选项/重定向目标的统一口径）。
 * 与对话行角色 ID（`[\p{L}\p{N}_]`）对齐，额外保留 `-` 兼容存量 kebab-case 场景 ID。
 * 该集合刻意排除空格与 `#?%/:` 等 URL 保留字符——场景 ID 会进 R2 key 与素材 URL，
 * percent-encode 后即路径段安全，无需 slugify。
 */
export const SCENE_ID_CHAR_CLASS = String.raw`[\p{L}\p{N}_-]`;

const REFERENCEABLE_SCENE_ID_REGEX = new RegExp(`^${SCENE_ID_CHAR_CLASS}+$`, 'u');

/** 场景标题（即场景 ID）能否被选项/重定向的目标正则完整匹配 */
export function isReferenceableSceneId(id: string): boolean {
  return REFERENCEABLE_SCENE_ID_REGEX.test(id);
}

/**
 * 判断值是否为变量元数据对象
 */
export function isVariableMeta(value: GameStateValue): value is VariableMeta {
  return typeof value === 'object' && value !== null && 'value' in value;
}

/**
 * 还原 {{ ... }} 模板段内被 Markdown 序列化转义的标点（如 `\_` → `_`）。
 * remark-stringify 会转义文本节点中的词内下划线，落在模板表达式内会污染变量名。
 * CommonMark 解析时会自动还原，运行时求值不受影响；但原始 Markdown 的直接消费方
 * （文本编辑模式、AI 提示词上下文）会看到污染内容，AI 可能把 `ron\_friendship`
 * 抄进选项子句——选项行以 html 节点原样存储、不经反转义，届时才会真正破坏求值。
 * 已知局限：表达式字符串字面量中含 `}` 时无法正确定位模板段边界。
 */
export function unescapeTemplateSpans(text: string): string {
  // \\ 后跟 CommonMark 可转义标点（ASCII 标点全集）时去掉反斜杠
  return text.replace(/\{\{[^}]*\}\}/g, (span) => span.replace(/\\([!-\/:-@\[-`{-~])/g, '$1'));
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
        case 'text':
          // 将 @角色ID 替换为角色名称
          return {
            type: 'text' as const,
            content: replaceCharacterMentions(node.content, characters),
            audio_url: node.audio_url,
          };
        case 'dialogue':
          // speaker 保留原始角色 ID（前端据此查角色名/立绘），台词内容照常替换 @mention
          return {
            type: 'dialogue' as const,
            speaker: node.speaker,
            emotion: node.emotion,
            content: replaceCharacterMentions(node.content, characters),
            audio_url: node.audio_url,
          };
        case 'choice':
          // 将 @角色ID 替换为角色名称
          return {
            type: 'choice' as const,
            text: replaceCharacterMentions(node.text, characters),
            nextSceneId: node.nextSceneId,
            condition: node.condition,
            set: node.set,
            audio_url: node.audio_url,
          };
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
        case 'redirect':
          // 重定向是运行时路由指令，原样透传给播放器
          return node;
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
    display_mode: game.display_mode,
    text_box_position: game.text_box_position,
    typewriter_speed: game.typewriter_speed,
    site_template: game.site_template,
    subdomain: game.subdomain,
    initialState: game.initialState,
    characters,
    scenes,
    startSceneId: game.startSceneId,
  };
}
