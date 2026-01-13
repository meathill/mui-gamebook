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
    title,
    description,
    cover_image,
    cover_prompt,
    cover_aspect_ratio,
    tags,
    published,
    backgroundStory,
    background_story,
    state = {},
    ai = {},
  } = globalConfig;

  if (!scenes['start']) {
    return { success: false, error: "Game must contain a 'start' scene." };
  }

  const game: Game = {
    slug: slugify(title),
    title,
    description,
    backgroundStory: backgroundStory || background_story,
    cover_image,
    cover_prompt,
    cover_aspect_ratio,
    tags: tags || [],
    published: !!published,
    initialState: state,
    ai: {
      style: ai.style || {},
      characters: ai.characters || {},
    },
    scenes,
  };

  return { success: true, data: game, warnings };
}
