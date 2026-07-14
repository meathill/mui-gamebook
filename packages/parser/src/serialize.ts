/**
 * 手写确定性序列化器（DSL_V2_DESIGN §C'，DSL v2 Phase 2 替换 remark-stringify）。
 *
 * 输出文法极小：front matter / `# 场景标题` / ```yaml 元数据块 / 正文段落 /
 * `<!-- audio -->` 注释 / 选项列表 / `---` 场景分隔。
 * 我们自有的结构化行（标题、选项、注释）直接写原文——不再需要 remark 时代的
 * 三处 html-node hack；正文只做最小转义（仅防 CommonMark 误解析），
 * `{{...}}` 模板段内部零转义，从根上消灭 `ron\_friendship` 一类的转义污染。
 *
 * 已知边界：模板段内**未加空格**的 `*`（如 `{{ if a*2 }}...{{ if b*3 }}` 成对时）
 * 可能被 CommonMark 识别为强调——表达式请使用空格（`a * 2`），引擎两种写法都支持。
 */
import * as yaml from 'js-yaml';
import { omitBy } from 'lodash-es';
import type { AICharacter, Game, GameState, Scene, VariableMeta } from './types';
import { isVariableMeta } from './utils';

function dumpYaml(obj: unknown): string {
  return yaml.dump(obj, { indent: 2, lineWidth: -1 }).trim();
}

function buildFrontMatter(game: Game): Record<string, unknown> {
  const frontMatter: Partial<Game> = {};
  // 版本号放最前，一眼可见
  if (game.dsl_version !== undefined) frontMatter.dsl_version = game.dsl_version;
  frontMatter.title = game.title;
  if (game.description) frontMatter.description = game.description;
  if (game.backgroundStory) frontMatter.backgroundStory = game.backgroundStory;
  if (game.cover_image) frontMatter.cover_image = game.cover_image;
  if (game.cover_prompt) frontMatter.cover_prompt = game.cover_prompt;
  if (game.cover_aspect_ratio) frontMatter.cover_aspect_ratio = game.cover_aspect_ratio;
  if (game.tags && game.tags.length > 0) frontMatter.tags = game.tags;
  if (game.published) frontMatter.published = true;
  if (game.display_mode) frontMatter.display_mode = game.display_mode;
  if (game.text_box_position) frontMatter.text_box_position = game.text_box_position;
  if (game.typewriter_speed) frontMatter.typewriter_speed = game.typewriter_speed;
  if (game.site_template) frontMatter.site_template = game.site_template;
  if (game.subdomain) frontMatter.subdomain = game.subdomain;

  if (Object.keys(game.initialState).length > 0) {
    const cleanedState: GameState = {};
    for (const [key, val] of Object.entries(game.initialState)) {
      if (isVariableMeta(val)) {
        cleanedState[key] = omitBy(val, (v) => v === undefined) as VariableMeta;
      } else {
        cleanedState[key] = val;
      }
    }
    frontMatter.state = cleanedState;
  }

  if (Object.keys(game.ai.style || {}).length > 0 || Object.keys(game.ai.characters || {}).length > 0) {
    frontMatter.ai = {};
    if (Object.keys(game.ai.style || {}).length > 0) frontMatter.ai.style = game.ai.style;
    if (Object.keys(game.ai.characters || {}).length > 0) {
      frontMatter.ai.characters = {};
      for (const [id, char] of Object.entries(game.ai.characters || {})) {
        frontMatter.ai.characters[id] = omitBy(
          {
            name: char.name,
            description: char.description,
            image_prompt: char.image_prompt,
            image_url: char.image_url,
            voice_name: char.voice_name,
          },
          (v) => v === undefined,
        ) as unknown as AICharacter;
      }
    }
  }

  // 未知全局键原样写回（与 parse 的 extra 透传配对，消灭白名单抹除）
  if (game.extra) {
    Object.assign(frontMatter as Record<string, unknown>, game.extra);
  }

  return frontMatter as Record<string, unknown>;
}

function buildSceneMetadata(scene: Scene): Record<string, unknown> {
  const imageNode = scene.nodes.find((n) => n.type === 'ai_image');
  const audioNode = scene.nodes.find((n) => n.type === 'ai_audio');
  const videoNode = scene.nodes.find((n) => n.type === 'ai_video');
  const minigameNode = scene.nodes.find((n) => n.type === 'minigame');

  // 元数据块每类素材只有一个键位：同类多节点无法承载，只保留第一个——
  // 至少不再静默丢（P1）；多素材支持是独立的语法设计问题
  for (const assetType of ['ai_image', 'ai_audio', 'ai_video', 'minigame'] as const) {
    const count = scene.nodes.filter((n) => n.type === assetType).length;
    if (count > 1) {
      console.warn(
        `Scene "${scene.id}" has ${count} nodes of type ${assetType}; only the first survives serialization.`,
      );
    }
  }

  const metadata: Record<string, unknown> = {};
  if (imageNode && imageNode.type === 'ai_image') {
    metadata.image = omitBy(
      {
        prompt: imageNode.prompt,
        character: imageNode.character,
        characters: imageNode.characters,
        url: imageNode.url,
        aspectRatio: imageNode.aspectRatio,
      },
      (v) => v === undefined,
    );
  }
  if (audioNode && audioNode.type === 'ai_audio') {
    metadata.audio = omitBy(
      { type: audioNode.audioType, prompt: audioNode.prompt, url: audioNode.url },
      (v) => v === undefined,
    );
  }
  if (videoNode && videoNode.type === 'ai_video') {
    metadata.video = omitBy({ prompt: videoNode.prompt, url: videoNode.url }, (v) => v === undefined);
  }
  if (minigameNode && minigameNode.type === 'minigame') {
    metadata.minigame = omitBy(
      { prompt: minigameNode.prompt, variables: minigameNode.variables, url: minigameNode.url },
      (v) => v === undefined,
    );
  }

  // 场景元数据未知键写回（与 parse 的 scene.extra 透传配对）
  if (scene.extra) {
    Object.assign(metadata, scene.extra);
  }

  return metadata;
}

// —— 正文最小转义 ——

const TEMPLATE_SPAN_REGEX = /\{\{[^}]*\}\}/g;

/**
 * 单行转义：行内转义 CommonMark 会重新解析的结构字符，
 * 行首转义块级触发符（标题/引用/列表/分隔线/setext）。
 */
function escapeLine(line: string): string {
  let out = line.replace(/([\\[\]*_`~<])/g, '\\$1');
  // 字符实体引用（&amp; 等）转义 &，普通 & 保持原样
  out = out.replace(/&(#?\w+;)/g, '\\&$1');
  // 行首块级触发符：# 标题、> 引用、+/- 列表与分隔线、= setext
  out = out.replace(/^(\s*)([#>+=-])/, '$1\\$2');
  // 有序列表：转义数字后的 . 或 )
  out = out.replace(/^(\s*\d+)([.)])(\s)/, '$1\\$2$3');
  return out;
}

/**
 * 正文转义：`{{...}}` 模板段用占位符保护（内部零转义，保证表达式原文落盘），
 * 其余文本逐行做最小转义。占位符用 NUL 字符包裹，正文内容不可能出现。
 */
export function escapeProse(text: string): string {
  const spans: string[] = [];
  const shielded = text.replace(TEMPLATE_SPAN_REGEX, (m) => {
    spans.push(m);
    return `\u0000${spans.length - 1}\u0000`;
  });
  const escaped = shielded.split('\n').map(escapeLine).join('\n');
  return escaped.replace(/\u0000(\d+)\u0000/g, (_, i: string) => spans[Number(i)]);
}

// —— 文档拼装 ——

export function stringify(game: Game): string {
  const blocks: string[] = [];

  blocks.push(`---\n${dumpYaml(buildFrontMatter(game))}\n---`);

  const sceneEntries = Object.values(game.scenes);
  for (let i = 0; i < sceneEntries.length; i++) {
    const scene = sceneEntries[i];

    blocks.push(`# ${scene.id}`);

    const metadata = buildSceneMetadata(scene);
    if (Object.keys(metadata).length > 0) {
      blocks.push(`\`\`\`yaml\n${dumpYaml(metadata)}\n\`\`\``);
    }

    // 选项收敛为场景末尾的一个列表（与 parse 的典型形态一致）
    const choiceLines: string[] = [];

    for (const node of scene.nodes) {
      switch (node.type) {
        case 'ai_image':
        case 'ai_audio':
        case 'ai_video':
        case 'minigame':
          break; // 已进元数据块
        case 'text':
          blocks.push(escapeProse(node.content));
          // 语音注释独占一行、紧跟在文本之后（DSL_SPEC §4.3.1）
          if (node.audio_url) blocks.push(`<!-- audio: ${node.audio_url} -->`);
          break;
        case 'dialogue': {
          const emotion = node.emotion ? ` (${node.emotion})` : '';
          blocks.push(escapeProse(`@${node.speaker}${emotion}: ${node.content}`));
          if (node.audio_url) blocks.push(`<!-- audio: ${node.audio_url} -->`);
          break;
        }
        case 'static_image':
          blocks.push(`![${node.alt || ''}](${node.url})`);
          break;
        case 'static_audio':
          blocks.push(`[audio](${node.url})`);
          break;
        case 'static_video':
          blocks.push(`[video](${node.url})`);
          break;
        case 'choice': {
          let line = `* [${node.text}] -> ${node.nextSceneId}`;
          const clauses: string[] = [];
          if (node.condition) clauses.push(`(if: ${node.condition})`);
          if (node.set) clauses.push(`(set: ${node.set})`);
          if (node.audio_url) clauses.push(`(audio: ${node.audio_url})`);
          // 未知子句原样写回（与 parse 的 clauses 透传配对）
          for (const [key, value] of Object.entries(node.clauses ?? {})) {
            clauses.push(`(${key}: ${value})`);
          }
          if (clauses.length > 0) line += ` ${clauses.join(' ')}`;
          choiceLines.push(line);
          break;
        }
      }
    }

    if (choiceLines.length > 0) {
      blocks.push(choiceLines.join('\n'));
    }

    if (i < sceneEntries.length - 1) {
      blocks.push('---');
    }
  }

  return blocks.join('\n\n');
}
