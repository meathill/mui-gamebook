import * as yaml from 'js-yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import type { Root, RootContent, List } from 'mdast';
import type { Game, ParseResult, Scene, SceneNode } from './types';
import slugify from 'slugify';

export type { Game, SceneNode };
export * from './types';
export * from './utils';
export { stringify } from './stringify';

// Regex for specific inline syntax not covered by commonmark
const IF_REGEX = /\(if:\s*(.*?)\)/;
const SET_REGEX = /\(set:\s*(.*?)\)/;
const AUDIO_REGEX = /\(audio:\s*(.*?)\)/;
// 块级 HTML 注释形式的文本语音：<!-- audio: URL -->，可能带同行尾随文本（旧版 stringify 产物）
const AUDIO_COMMENT_REGEX = /^<!--\s*audio:\s*(.*?)\s*-->[ \t]*(.*)$/;

function parseChoices(list: List): SceneNode[] {
  const nodes: SceneNode[] = [];

  if (list.ordered) return nodes;

  for (const item of list.children) {
    const firstChild = item.children[0];
    if (!firstChild || firstChild.type !== 'paragraph') continue;

    const textContent = toString(firstChild).trim();
    // Syntax: [Text] -> ID (clauses)

    const match = textContent.match(/^\[(.*?)\]\s*->\s*([\w-]+)\s*(.*?)$/);
    if (!match) continue;

    const [, text, nextSceneId, clausesStr] = match;
    const choiceNode: SceneNode = { type: 'choice', text, nextSceneId };

    if (clausesStr) {
      const ifMatch = clausesStr.match(IF_REGEX);
      const setMatch = clausesStr.match(SET_REGEX);
      const audioMatch = clausesStr.match(AUDIO_REGEX);

      if (ifMatch) choiceNode.condition = ifMatch[1].trim();
      if (setMatch) choiceNode.set = setMatch[1].trim();
      if (audioMatch) choiceNode.audio_url = audioMatch[1].trim();
    }
    nodes.push(choiceNode);
  }
  return nodes;
}

function parseSceneNodes(nodes: RootContent[]): SceneNode[] {
  const sceneNodes: SceneNode[] = [];

  for (const node of nodes) {
    if (node.type === 'paragraph') {
      let paragraphContent: string[] = [];
      let pendingAudioUrl: string | undefined;

      const flushText = () => {
        if (paragraphContent.length > 0) {
          const textToken = paragraphContent.join('').trim();
          if (textToken) {
            const textNode: SceneNode = { type: 'text', content: textToken };
            if (pendingAudioUrl) {
              textNode.audio_url = pendingAudioUrl;
              pendingAudioUrl = undefined;
            }
            sceneNodes.push(textNode);
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
            // If there is existing text, maybe the audio belongs to it?
            // Or belongs to next? Usually audio comment tags prompt for audio of that text.
            // Original logic applied it to the *entire* paragraph text node.
            // If we are streaming, we assume it applies to the *next* flushed text segment.
            pendingAudioUrl = commentMatch[1];
          }
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
          // 规范格式（DSL_SPEC §4.3.1）：注释紧跟在文本之后，附加到前一个 text 节点
          const lastNode = sceneNodes[sceneNodes.length - 1];
          if (lastNode && lastNode.type === 'text') {
            lastNode.audio_url = audioUrl;
          }
        }
      }
    } else if (node.type === 'list') {
      const choices = parseChoices(node);
      if (choices.length > 0) {
        sceneNodes.push(...choices);
      }
    } else if (node.type === 'code' && node.lang === 'yaml') {
      try {
        const parsed = yaml.load(node.value) as any;
        if (parsed) {
          if (parsed.minigame) {
            sceneNodes.push({
              type: 'minigame',
              ...parsed.minigame,
            });
          }
          if (parsed.image) {
            sceneNodes.push({
              type: 'ai_image',
              ...parsed.image,
            });
          }
          if (parsed.audio) {
            sceneNodes.push({
              type: 'ai_audio',
              ...parsed.audio,
            });
          }
          if (parsed.video) {
            sceneNodes.push({
              type: 'ai_video',
              ...parsed.video,
            });
          }
        }
      } catch (e) {
        // Ignore invalid yaml in body, or maybe warn?
      }
    }
  }

  return sceneNodes;
}

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

  let currentSceneId: string | null = null;
  let currentSceneNodes: RootContent[] = [];

  const commitScene = () => {
    if (!currentSceneId) return;

    if (scenes[currentSceneId]) {
      warnings.push(`Duplicate scene ID found: "${currentSceneId}". The latter one will overwrite the previous.`);
    }

    let metadata: any = null;
    let contentNodes = currentSceneNodes;

    // Strategy 1: Parsed as 'yaml' node (e.g. by remark-frontmatter if supported or at root)
    if (currentSceneNodes.length > 0 && currentSceneNodes[0].type === 'yaml') {
      try {
        metadata = yaml.load(currentSceneNodes[0].value);
        contentNodes = currentSceneNodes.slice(1);
      } catch (e: any) {
        warnings.push(`Failed to parse metadata for scene "${currentSceneId}": ${e.message}`);
      }
    }
    // Strategy 2: Code block with lang='yaml'
    else if (
      currentSceneNodes.length > 0 &&
      currentSceneNodes[0].type === 'code' &&
      currentSceneNodes[0].lang === 'yaml'
    ) {
      try {
        const parsed = yaml.load(currentSceneNodes[0].value);
        // Verify it has expected keys to be considered metadata
        if (
          parsed &&
          typeof parsed === 'object' &&
          ('image' in parsed || 'audio' in parsed || 'video' in parsed || 'minigame' in parsed)
        ) {
          metadata = parsed;
          contentNodes = currentSceneNodes.slice(1);
        }
      } catch (e) {
        // If generic YAML parsing fails, just treat as code block
        warnings.push(`Failed to parse YAML code block in scene "${currentSceneId}": ${e}`);
      }
    }

    const nodes = parseSceneNodes(contentNodes);

    if (metadata && typeof metadata === 'object') {
      const { image, audio, video, minigame } = metadata;

      if (minigame)
        nodes.unshift({
          type: 'minigame',
          prompt: minigame.prompt,
          variables: minigame.variables,
          url: minigame.url,
        });
      if (video)
        nodes.unshift({
          type: 'ai_video',
          prompt: video.prompt,
          url: video.url,
        });
      if (audio)
        nodes.unshift({
          type: 'ai_audio',
          audioType: audio.type || 'bgm',
          prompt: audio.prompt,
          url: audio.url,
        });
      if (image)
        nodes.unshift({
          type: 'ai_image',
          prompt: image.prompt,
          character: image.character,
          characters: image.characters,
          url: image.url,
          aspectRatio: image.aspectRatio,
        });
    }

    scenes[currentSceneId] = { id: currentSceneId, nodes };
  };

  for (let i = 0; i < tree.children.length; i++) {
    const node = tree.children[i];
    if (i === 0 && node.type === 'yaml') continue;

    if (node.type === 'heading' && node.depth === 1) {
      commitScene();
      currentSceneId = toString(node).trim();
      currentSceneNodes = [];
    } else {
      if (currentSceneId) {
        currentSceneNodes.push(node);
      }
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
  } = globalConfig;

  if (!scenes['start']) {
    return { success: false, error: "Game must contain a 'start' scene." };
  }

  if (dsl_version !== undefined && typeof dsl_version !== 'number') {
    warnings.push(`dsl_version must be a number, got: ${JSON.stringify(dsl_version)}. Field ignored.`);
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

  return { success: true, data: game, warnings };
}
