/**
 * 场景内容节点解析（从 index.ts 拆出，DSL_V2_DESIGN §4.3/§4.5）。
 * 原则 P1：任何会被丢弃的内容都必须产生诊断，不允许静默丢失。
 */
import * as yaml from 'js-yaml';
import type { RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { parseChoices, scanClauses } from './parse-choice';
import type {
  DiagnosticReporter,
  SceneAiAudioNode,
  SceneAiImageNode,
  SceneAiVideoNode,
  SceneMiniGameNode,
  SceneNode,
} from './types';

// 块级 HTML 注释形式的文本语音：<!-- audio: URL -->，可能带同行尾随文本（旧版 stringify 产物）
const AUDIO_COMMENT_REGEX = /^<!--\s*audio:\s*(.*?)\s*-->[ \t]*(.*)$/;

// 对话行：`@角色ID: 台词` / `@角色ID (表情): 台词`——冒号与括号支持全角/半角（中文作者与 LLM 常写全角）
const DIALOGUE_LINE_REGEX = /^@([\p{L}\p{N}_]+)\s*(?:[(（]([^)）]*)[)）])?\s*[:：]\s*(.*)$/u;

// 块级重定向行：`-> target_scene (if: expr) (set: ...)`（`->` 行首不构成 CommonMark 列表项）
const REDIRECT_LINE_REGEX = /^->\s*([\w-]+)\s*(.*)$/;

/** 已废弃的代码围栏语言（现 parser 不再解析，检出必须报 error 提示迁移） */
const LEGACY_FENCE_LANGS = new Set(['minigame-gen', 'image-gen', 'audio-gen', 'video-gen']);

/**
 * 归一化 minigame.variables：作者（尤其 AI 生成）常把 "变量名: 说明" 的映射误写成
 * YAML 列表形式（`- 变量名: 说明`），yaml.load 会产出 Array<Record<string, string>>
 * 而非类型声明的 Record<string, string>。parser 是唯一数据入口，这里统一收敛两种写法。
 */
export function normalizeMiniGameVariables(raw: unknown): Record<string, string> | undefined {
  if (raw == null) return undefined;

  const items = Array.isArray(raw) ? raw : [raw];
  const variables: Record<string, string> = {};
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    for (const [key, value] of Object.entries(item)) {
      variables[key] = String(value);
    }
  }
  return Object.keys(variables).length > 0 ? variables : undefined;
}

export interface AssetNodes {
  image?: SceneAiImageNode;
  audio?: SceneAiAudioNode;
  video?: SceneAiVideoNode;
  minigame?: SceneMiniGameNode;
}

/**
 * 从场景元数据对象构建 AI 素材节点（显式字段映射）。
 * 不用对象展开：body yaml 的 `audio.type` 展开会覆盖节点的 `type: 'ai_audio'`（历史隐藏 bug）。
 */
export function buildAssetNodes(parsed: Record<string, unknown>): AssetNodes {
  const result: AssetNodes = {};
  const { image, audio, video, minigame } = parsed as Record<string, any>;

  if (image) {
    result.image = {
      type: 'ai_image',
      prompt: image.prompt,
      character: image.character,
      characters: image.characters,
      url: image.url,
      aspectRatio: image.aspectRatio,
    };
  }
  if (audio) {
    // bgm 是历史别名，统一收敛为 background_music（DSL_V2_DESIGN §4.7）
    const audioType = audio.type === 'bgm' || !audio.type ? 'background_music' : audio.type;
    result.audio = { type: 'ai_audio', audioType, prompt: audio.prompt, url: audio.url };
  }
  if (video) {
    result.video = { type: 'ai_video', prompt: video.prompt, url: video.url };
  }
  if (minigame) {
    result.minigame = {
      type: 'minigame',
      prompt: minigame.prompt,
      variables: normalizeMiniGameVariables(minigame.variables),
      url: minigame.url,
    };
  }
  return result;
}

/**
 * 把一段正文文本按行拆出对话节点（DSL v2 对话行语法）。
 * 只有 speaker 在 ai.characters 注册时才成为 dialogue 节点，
 * 未注册的 `@xx:` 行按普通文本处理并发 unregistered-speaker 警告。
 */
function extractProseNodes(
  textToken: string,
  characterIds: ReadonlySet<string> | undefined,
  report: DiagnosticReporter | undefined,
  sceneId: string | undefined,
  line: number | undefined,
): SceneNode[] {
  const nodes: SceneNode[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length > 0) {
      const content = buffer.join('\n').trim();
      if (content) nodes.push({ type: 'text', content });
      buffer = [];
    }
  };

  for (const rawLine of textToken.split('\n')) {
    // 块级重定向行（DSL_V2_DESIGN §4.6）
    const redirectMatch = rawLine.trim().match(REDIRECT_LINE_REGEX);
    if (redirectMatch) {
      flushBuffer();
      const [, nextSceneId, clausesStr] = redirectMatch;
      const node: SceneNode = { type: 'redirect', nextSceneId };
      for (const { key, value } of scanClauses(clausesStr)) {
        if (key === 'if' && node.condition === undefined) node.condition = value;
        else if (key === 'set' && node.set === undefined) node.set = value;
        else if (key !== 'if' && key !== 'set') {
          node.clauses = node.clauses ?? {};
          if (!(key in node.clauses)) node.clauses[key] = value;
        }
      }
      nodes.push(node);
      continue;
    }

    const match = rawLine.trim().match(DIALOGUE_LINE_REGEX);
    if (match) {
      const [, speaker, emotion, content] = match;
      if (characterIds?.has(speaker)) {
        flushBuffer();
        const node: SceneNode = { type: 'dialogue', speaker, content: content.trim() };
        if (emotion?.trim()) node.emotion = emotion.trim();
        nodes.push(node);
        continue;
      }
      report?.({
        severity: 'warning',
        code: 'unregistered-speaker',
        message: `"@${speaker}" is not registered in ai.characters; line treated as plain text`,
        sceneId,
        line,
      });
    }
    buffer.push(rawLine);
  }
  flushBuffer();
  return nodes;
}

/**
 * 公开入口：把一段正文文本解析为 text/dialogue 节点序列。
 * 供编辑器（flowToGame）等场景复用同一套对话行识别逻辑。
 */
export function parseProseBlock(text: string, characterIds?: ReadonlySet<string>): SceneNode[] {
  return extractProseNodes(text, characterIds, undefined, undefined, undefined);
}

export function parseSceneNodes(
  nodes: RootContent[],
  report?: DiagnosticReporter,
  sceneId?: string,
  characterIds?: ReadonlySet<string>,
): SceneNode[] {
  const sceneNodes: SceneNode[] = [];

  for (const node of nodes) {
    const line = node.position?.start.line;

    if (node.type === 'paragraph') {
      let paragraphContent: string[] = [];
      let pendingAudioUrl: string | undefined;

      const flushText = () => {
        if (paragraphContent.length > 0) {
          const textToken = paragraphContent.join('').trim();
          if (textToken) {
            const proseNodes = extractProseNodes(textToken, characterIds, report, sceneId, line);
            if (pendingAudioUrl && proseNodes.length > 0) {
              // 行内 audio 注释附加到其后第一个正文/对话节点
              const first = proseNodes[0];
              if (first.type === 'text' || first.type === 'dialogue') {
                first.audio_url = pendingAudioUrl;
              }
              pendingAudioUrl = undefined;
            }
            sceneNodes.push(...proseNodes);
          }
          paragraphContent = [];
        }
      };

      // node.children is PhrasingContent[]
      for (const child of node.children) {
        if (child.type === 'image') {
          flushText();
          sceneNodes.push({
            type: 'static_image',
            alt: child.alt || '',
            url: child.url,
          });
        } else if (child.type === 'text') {
          paragraphContent.push(child.value);
        } else if (child.type === 'link') {
          const linkText = toString(child);
          if (linkText === 'audio') {
            flushText();
            sceneNodes.push({ type: 'static_audio', url: child.url });
          } else if (linkText === 'video') {
            flushText();
            sceneNodes.push({ type: 'static_video', url: child.url });
          } else {
            // Regular link, treat as text
            paragraphContent.push(toString(child));
          }
        } else if (child.type === 'html') {
          const commentMatch = child.value.match(/^<!--\s*audio:\s*(.*?)\s*-->$/);
          if (commentMatch) {
            // 行内注释：附加到下一段 flush 出的文本
            pendingAudioUrl = commentMatch[1];
          }
        } else if (child.type === 'break') {
          // 硬换行补回 \n：否则英文两行会被 join('') 粘成一个词，对话行扫描也依赖换行
          paragraphContent.push('\n');
        } else if (child.type === 'strong' || child.type === 'emphasis' || child.type === 'inlineCode') {
          // Handle other formatting as text
          paragraphContent.push(toString(child));
        }
      }

      flushText();
    } else if (node.type === 'html') {
      // 独占一行的 <!-- audio: URL --> 会被 CommonMark 解析成块级 html 节点（HTML block type 2），
      // 而不是 paragraph 的行内子节点，所以要在这里处理
      const commentMatch = node.value.match(AUDIO_COMMENT_REGEX);
      if (commentMatch) {
        const [, audioUrl, trailing] = commentMatch;
        const trailingText = trailing.trim();
        if (trailingText) {
          // 旧版 stringify 产出的同行格式：<!-- audio: URL -->文本，整行被吞进一个 html 节点，
          // 这里还原成带语音的 text 节点，兼容已存盘的历史内容
          sceneNodes.push({ type: 'text', content: trailingText, audio_url: audioUrl });
        } else {
          // 规范格式（DSL_SPEC §4.3.1）：注释紧跟在文本之后，附加到前一个 text/dialogue 节点
          const lastNode = sceneNodes[sceneNodes.length - 1];
          if (lastNode && (lastNode.type === 'text' || lastNode.type === 'dialogue')) {
            lastNode.audio_url = audioUrl;
          } else {
            report?.({
              severity: 'warning',
              code: 'orphan-audio',
              message: 'Audio comment has no preceding text node and will be dropped',
              sceneId,
              line,
            });
          }
        }
      }
    } else if (node.type === 'list') {
      const choices = parseChoices(node, report, sceneId);
      if (choices.length > 0) {
        sceneNodes.push(...choices);
      }
    } else if (node.type === 'code') {
      if (node.lang === 'yaml') {
        try {
          const parsed = yaml.load(node.value);
          if (parsed && typeof parsed === 'object') {
            // 正文中的 yaml 块只提取素材键（保持既有 push 顺序：minigame → image → audio → video）
            const assets = buildAssetNodes(parsed as Record<string, unknown>);
            if (assets.minigame) sceneNodes.push(assets.minigame);
            if (assets.image) sceneNodes.push(assets.image);
            if (assets.audio) sceneNodes.push(assets.audio);
            if (assets.video) sceneNodes.push(assets.video);
          }
        } catch (e) {
          report?.({
            severity: 'warning',
            code: 'invalid-yaml',
            message: `Invalid YAML code block ignored: ${e instanceof Error ? e.message : e}`,
            sceneId,
            line,
          });
        }
      } else if (node.lang && LEGACY_FENCE_LANGS.has(node.lang)) {
        report?.({
          severity: 'error',
          code: 'legacy-fence',
          message: `Legacy \`\`\`${node.lang} fence is no longer supported and will be IGNORED (game logic depending on it is broken). Migrate to a \`\`\`yaml block, see scripts/migrate-game-script.ts`,
          sceneId,
          line,
        });
      } else {
        report?.({
          severity: 'warning',
          code: 'ignored-block',
          message: `Code block (lang: ${node.lang || 'none'}) is not part of the DSL and will be dropped`,
          sceneId,
          line,
        });
      }
    } else if (node.type === 'thematicBreak') {
      // `---` 是纯视觉分隔，无语义（DSL_SPEC §3.2），静默忽略是规范行为
    } else {
      // heading(##+) / blockquote / table 等整类块不属于 DSL，会被丢弃，必须可见
      report?.({
        severity: 'warning',
        code: 'ignored-block',
        message: `Block of type "${node.type}" is not part of the DSL and will be dropped`,
        sceneId,
        line,
      });
    }
  }

  return sceneNodes;
}
