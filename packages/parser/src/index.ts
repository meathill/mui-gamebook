import * as yaml from 'js-yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import type { Root, RootContent } from 'mdast';
import type { Diagnostic, Game, ParseResult, Scene, SceneNode } from './types';
import { buildAssetNodes, parseSceneNodes } from './parse-scene';
import slugify from 'slugify';

export type { Game, SceneNode };
export * from './types';
export * from './utils';
export { stringify } from './stringify';
export { scanClauses } from './parse-choice';
export { normalizeMiniGameVariables } from './parse-scene';

/** 场景元数据块中的已知顶层键（出节点），其余键进 scene.extra 透传 */
const KNOWN_SCENE_META_KEYS = new Set(['image', 'audio', 'video', 'minigame']);

export function parse(source: string): ParseResult {
  if (typeof source !== 'string') {
    return { success: false, error: 'Source input must be a string.' };
  }

  const processor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkGfm);

  const tree = processor.parse(source) as Root;

  let globalConfig: any = {};

  const firstNode = tree.children[0];
  if (firstNode && firstNode.type === 'yaml') {
    try {
      globalConfig = yaml.load(firstNode.value);
    } catch (e) {
      return { success: false, error: 'Invalid Global YAML Front Matter' };
    }
  } else {
    return { success: false, error: 'YAML front matter is missing.' };
  }

  if (!globalConfig || !globalConfig.title) {
    return { success: false, error: 'Title is required in YAML front matter.' };
  }

  const scenes: Record<string, Scene> = {};
  const warnings: string[] = [];
  const diagnostics: Diagnostic[] = [];

  // 已注册角色 ID：对话行 `@角色ID: 台词` 的消歧门槛（未注册按普通文本处理）
  const characterIds: ReadonlySet<string> = new Set(Object.keys(globalConfig?.ai?.characters ?? {}));

  // 诊断同时落两处：结构化 diagnostics（新）与字符串 warnings（兼容既有消费方）
  const report = (diagnostic: Diagnostic) => {
    diagnostics.push(diagnostic);
    warnings.push(diagnostic.message);
  };

  let currentSceneId: string | null = null;
  let currentSceneNodes: RootContent[] = [];

  const commitScene = () => {
    if (!currentSceneId) return;

    if (scenes[currentSceneId]) {
      report({
        severity: 'warning',
        code: 'duplicate-scene-id',
        message: `Duplicate scene ID found: "${currentSceneId}". The latter one will overwrite the previous.`,
        sceneId: currentSceneId,
      });
    }

    let contentNodes = currentSceneNodes;
    const assetNodes: SceneNode[] = [];
    let extra: Record<string, unknown> | undefined;

    // 场景元数据：紧跟标题的第一个 ```yaml 代码块一律视为元数据——
    // 已知键（image/audio/video/minigame）出素材节点，未知键进 scene.extra 原样透传
    const firstBlock = currentSceneNodes[0];
    if (firstBlock && firstBlock.type === 'code' && firstBlock.lang === 'yaml') {
      try {
        const parsed = yaml.load(firstBlock.value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          contentNodes = currentSceneNodes.slice(1);

          const assets = buildAssetNodes(parsed as Record<string, unknown>);
          // 保持既有的场景头部顺序：image → audio → video → minigame
          if (assets.image) assetNodes.push(assets.image);
          if (assets.audio) assetNodes.push(assets.audio);
          if (assets.video) assetNodes.push(assets.video);
          if (assets.minigame) assetNodes.push(assets.minigame);

          for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
            if (!KNOWN_SCENE_META_KEYS.has(key)) {
              extra = extra ?? {};
              extra[key] = value;
            }
          }
        }
      } catch (e) {
        report({
          severity: 'warning',
          code: 'invalid-yaml',
          message: `Failed to parse YAML code block in scene "${currentSceneId}": ${e}`,
          sceneId: currentSceneId,
          line: firstBlock.position?.start.line,
        });
      }
    }

    const nodes = [...assetNodes, ...parseSceneNodes(contentNodes, report, currentSceneId, characterIds)];

    const scene: Scene = { id: currentSceneId, nodes };
    if (extra) scene.extra = extra;
    scenes[currentSceneId] = scene;
  };

  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i];
    if (i === 0 && node.type === 'yaml') continue;

    if (node.type === 'heading' && node.depth === 1) {
      commitScene();
      currentSceneId = toString(node).trim();
      currentSceneNodes = [];
    } else if (currentSceneId) {
      currentSceneNodes.push(node);
    } else if (node.type !== 'thematicBreak') {
      // front matter 与第一个场景标题之间的游离内容会被丢弃，必须可见（P1）
      report({
        severity: 'warning',
        code: 'stray-content',
        message: `Content before the first scene heading will be dropped: "${toString(node).slice(0, 40)}"`,
        line: node.position?.start.line,
      });
    }
  }
  commitScene();

  const {
    dsl_version,
    title,
    description,
    cover_image,
    cover_prompt,
    cover_aspect_ratio,
    tags,
    published,
    backgroundStory,
    background_story,
    display_mode,
    text_box_position,
    typewriter_speed,
    site_template,
    subdomain,
    state = {},
    ai = {},
    ...extraGlobals
  } = globalConfig;

  if (!scenes['start']) {
    return { success: false, error: "Game must contain a 'start' scene." };
  }

  if (dsl_version !== undefined && typeof dsl_version !== 'number') {
    report({
      severity: 'warning',
      code: 'invalid-dsl-version',
      message: `dsl_version must be a number, got: ${JSON.stringify(dsl_version)}. Field ignored.`,
    });
  }

  const game: Game = {
    dsl_version: typeof dsl_version === 'number' ? dsl_version : undefined,
    slug: slugify(title),
    title,
    description,
    backgroundStory: backgroundStory || background_story,
    cover_image,
    cover_prompt,
    cover_aspect_ratio,
    tags: tags || [],
    published: !!published,
    display_mode,
    text_box_position,
    typewriter_speed,
    site_template,
    subdomain,
    initialState: state,
    ai: {
      style: ai.style || {},
      characters: ai.characters || {},
    },
    scenes,
  };

  // 全局 front matter 未知键原样透传（stringify 写回，消灭白名单抹除）
  if (Object.keys(extraGlobals).length > 0) {
    game.extra = extraGlobals;
  }

  return { success: true, data: game, warnings, diagnostics };
}
