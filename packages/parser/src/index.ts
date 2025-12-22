import * as yaml from 'js-yaml';
import type { AICharacter, Game, GameState, ParseResult, Scene, SceneNode, VariableMeta } from './types';
import { isVariableMeta } from './utils';
import { omitBy } from 'lodash-es';
import slugify from 'slugify';
export type { Game, SceneNode };
export * from './types';
export * from './utils';

// Final, correct regexes
const FRONT_MATTER_REGEX = /---\n([\s\S]*?)\n---/;
const SCENE_ID_REGEX = /^#\s*([\w-]+)/;
const CHOICE_REGEX = /^\s*\*\s*\[(.*?)\]\s*->\s*([\w-]+)\s*(.*?)\s*$/;
const IF_REGEX = /\(if:\s*(.*?)\)/;
const SET_REGEX = /\(set:\s*(.*?)\)/;
const AUDIO_REGEX = /\(audio:\s*(.*?)\)/;
const TEXT_AUDIO_COMMENT_REGEX = /^<!--\s*audio:\s*(.*?)\s*-->$/;
const STATIC_IMAGE_REGEX = /^\s*!\[(.*?)\]\((.*?)\)$/;
const STATIC_AUDIO_REGEX = /^\s*\[audio\]\((.*?)\)$/;
const STATIC_VIDEO_REGEX = /^\s*\[video\]\((.*?)\)$/;
const BLOCK_START_REGEX = /^```([\w-]+)$/;
const BLOCK_END_REGEX = /^```$/;

function parseSceneContent(content: string): SceneNode[] {
  const nodes: SceneNode[] = [];
  const lines = content.split('\n');

  let mode: 'default' | 'in_block' = 'default';
  let blockType = '';
  let blockContentBuffer: string[] = [];
  let textBuffer: string[] = [];

  // 当前文本节点的 audio_url（从 HTML 注释提取）
  let pendingAudioUrl: string | undefined;

  const flushTextBuffer = () => {
    if (textBuffer.length > 0) {
      const content = textBuffer.join('\n').trim();
      if (content) {
        const textNode: SceneNode = { type: 'text', content };
        if (pendingAudioUrl) {
          textNode.audio_url = pendingAudioUrl;
          pendingAudioUrl = undefined;
        }
        nodes.push(textNode);
      }
      textBuffer = [];
    }
  };

  for (const line of lines) {
    if (mode === 'in_block') {
      if (BLOCK_END_REGEX.test(line)) {
        const blockContentStr = blockContentBuffer.join('\n');
        const blockContent = blockContentStr ? (yaml.load(blockContentStr) as SceneNode) : null;
        if (blockContent && typeof blockContent === 'object') {
          if (blockType === 'image-gen') {
            nodes.push({ ...blockContent, type: 'ai_image' } as SceneNode);
          } else if (blockType === 'audio-gen') {
            const { type: audioType, ...rest } = blockContent as any;
            nodes.push({ type: 'ai_audio', audioType, ...rest });
          } else if (blockType === 'video-gen') {
            nodes.push({ ...blockContent, type: 'ai_video' } as SceneNode);
          } else if (blockType === 'minigame-gen') {
            // 解析小游戏节点
            const { prompt, variables, url } = blockContent as any;
            // variables 可能是数组形式 ['key: desc'] 或对象形式 {key: desc}
            let parsedVariables: Record<string, string> | undefined;
            if (Array.isArray(variables)) {
              parsedVariables = {};
              for (const item of variables) {
                if (typeof item === 'string') {
                  const [key, ...rest] = item.split(':');
                  parsedVariables[key.trim()] = rest.join(':').trim();
                } else if (typeof item === 'object') {
                  Object.assign(parsedVariables, item);
                }
              }
            } else if (typeof variables === 'object') {
              parsedVariables = variables;
            }
            nodes.push({ type: 'minigame', prompt, variables: parsedVariables, url } as SceneNode);
          }
        }
        mode = 'default';
        blockContentBuffer = [];
      } else {
        blockContentBuffer.push(line);
      }
    } else {
      const blockStartMatch = line.match(BLOCK_START_REGEX);
      const staticImageMatch = line.match(STATIC_IMAGE_REGEX);
      const staticAudioMatch = line.match(STATIC_AUDIO_REGEX);
      const staticVideoMatch = line.match(STATIC_VIDEO_REGEX);
      const choiceMatch = line.match(CHOICE_REGEX);

      if (blockStartMatch) {
        flushTextBuffer();
        mode = 'in_block';
        blockType = blockStartMatch[1];
      } else if (staticImageMatch) {
        flushTextBuffer();
        nodes.push({ type: 'static_image', alt: staticImageMatch[1], url: staticImageMatch[2] });
      } else if (staticAudioMatch) {
        flushTextBuffer();
        nodes.push({ type: 'static_audio', url: staticAudioMatch[1] });
      } else if (staticVideoMatch) {
        flushTextBuffer();
        nodes.push({ type: 'static_video', url: staticVideoMatch[1] });
      } else if (choiceMatch) {
        flushTextBuffer();
        const [, text, nextSceneId, clausesStr] = choiceMatch;
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
      } else {
        // 检查是否是 audio_url 的 HTML 注释
        const audioCommentMatch = line.match(TEXT_AUDIO_COMMENT_REGEX);
        if (audioCommentMatch) {
          pendingAudioUrl = audioCommentMatch[1];
        } else {
          textBuffer.push(line);
        }
      }
    }
  }

  flushTextBuffer();
  return nodes;
}

/**
 * Parses a gamebook source string.
 * @param source The string content of the gamebook file.
 * @returns A structured game object or an error.
 */
export function parse(source: string): ParseResult {
  if (typeof source !== 'string') {
    return { success: false, error: 'Source input must be a string.' };
  }

  source = source
    .split('\n')
    .map((item) => item.trimEnd())
    .join('\n');
  const match = source.match(FRONT_MATTER_REGEX);
  if (!match) {
    return {
      success: false,
      error: 'YAML front matter is missing or invalid.',
    };
  }

  const frontMatterContent = match[1];
  const body = source.substring(match[0].length);

  try {
    const frontMatter = yaml.load(frontMatterContent) as any;

    if (!frontMatter || typeof frontMatter !== 'object') {
      return { success: false, error: 'Invalid YAML front matter format.' };
    }

    const {
      title,
      description,
      cover_image,
      tags,
      published,
      backgroundStory,
      background_story, // 兼容旧格式
      state = {},
      ai = {},
    } = frontMatter;

    if (!title) {
      return { success: false, error: 'Title is required in YAML front matter.' };
    }

    const scenes: Record<string, Scene> = {};
    const sceneBlocks = body.split(/\n---\n/);

    for (const block of sceneBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;

      const idMatch = trimmedBlock.match(SCENE_ID_REGEX);
      if (!idMatch) continue;

      const sceneId = idMatch[1];
      const contentAfterId = trimmedBlock.substring(idMatch[0].length).trim();

      const nodes = parseSceneContent(contentAfterId);

      scenes[sceneId] = { id: sceneId, nodes };
    }

    const game: Game = {
      slug: slugify(title),
      title,
      description,
      backgroundStory: backgroundStory || background_story, // 兼容两种格式
      cover_image,
      tags: tags || [],
      published: !!published,
      initialState: state,
      ai: {
        style: ai.style || {},
        characters: ai.characters || {},
      },
      scenes,
    };

    // Validate that a 'start' scene exists
    if (!game.scenes['start']) {
      return { success: false, error: "Game must contain a 'start' scene." };
    }

    return { success: true, data: game };
  } catch (e: any) {
    return { success: false, error: `YAML parsing failed: ${e.message}` };
  }
}

/**
 * Converts a structured Game object back into a Markdown string.
 * This is the inverse of the parse function.
 * @param game The structured Game object.
 * @returns The Markdown string representation of the game.
 */
export function stringify(game: Game): string {
  let markdown = '';

  // 1. Front Matter
  const frontMatter: Partial<Game> = {
    title: game.title,
  };
  if (game.description) frontMatter.description = game.description;
  if (game.backgroundStory) frontMatter.backgroundStory = game.backgroundStory;
  if (game.cover_image) frontMatter.cover_image = game.cover_image;
  if (game.tags && game.tags.length > 0) frontMatter.tags = game.tags;
  if (game.published) frontMatter.published = true;
  if (Object.keys(game.initialState).length > 0) {
    // 清理变量元数据中的 undefined 字段
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
        frontMatter.ai.characters[id] = {
          name: char.name,
          description: char.description,
          image_prompt: char.image_prompt,
          image_url: char.image_url,
          voice_sample_url: char.voice_sample_url,
        };
        // Clean up undefined fields
        frontMatter.ai.characters[id] = omitBy(frontMatter.ai.characters[id], (v) => v === undefined) as AICharacter;
      }
    }
  }

  markdown += '---\n' + yaml.dump(frontMatter, { indent: 2, lineWidth: -1 }) + '---\n\n';

  // 2. Scenes
  const sceneEntries = Object.values(game.scenes);
  for (let i = 0; i < sceneEntries.length; i++) {
    const scene = sceneEntries[i];
    markdown += `# ${scene.id}\n`;

    for (const node of scene.nodes) {
      switch (node.type) {
        case 'text':
          if (node.audio_url) {
            markdown += `<!-- audio: ${node.audio_url} -->\n`;
          }
          markdown += `${node.content}\n`;
          break;
        case 'static_image':
          markdown += `![${node.alt || ''}](${node.url})\n`;
          break;
        case 'static_audio':
          markdown += `[audio](${node.url})\n`;
          break;
        case 'static_video':
          markdown += `[video](${node.url})\n`;
          break;
        case 'choice':
          let choiceLine = `* [${node.text}] -> ${node.nextSceneId}`;
          if (node.condition) {
            choiceLine += ` (if: ${node.condition})`;
          }
          if (node.set) {
            choiceLine += ` (set: ${node.set})`;
          }
          if (node.audio_url) {
            choiceLine += ` (audio: ${node.audio_url})`;
          }
          markdown += `${choiceLine}\n`;
          break;
        case 'ai_image':
          markdown += `\`\`\`image-gen\n`;
          markdown += `prompt: ${node.prompt}\n`;
          if (node.character) markdown += `character: ${node.character}\n`;
          if (node.characters && node.characters.length > 0)
            markdown += `characters: [${node.characters.join(', ')}]\n`;
          if (node.url) markdown += `url: ${node.url}\n`;
          markdown += `\`\`\`\n`;
          break;
        case 'ai_audio':
          markdown += `\`\`\`audio-gen\n`;
          markdown += `type: ${node.audioType}\n`;
          markdown += `prompt: ${node.prompt}\n`;
          if (node.url) markdown += `url: ${node.url}\n`;
          markdown += `\`\`\`\n`;
          break;
        case 'ai_video':
          markdown += `\`\`\`video-gen\n`;
          markdown += `prompt: ${node.prompt}\n`;
          if (node.url) markdown += `url: ${node.url}\n`;
          markdown += `\`\`\`\n`;
          break;
        case 'minigame':
          markdown += `\`\`\`minigame-gen\n`;
          markdown += `prompt: ${node.prompt}\n`;
          if (node.variables && Object.keys(node.variables).length > 0) {
            markdown += `variables:\n`;
            for (const [key, desc] of Object.entries(node.variables)) {
              markdown += `  - ${key}: ${desc}\n`;
            }
          }
          if (node.url) markdown += `url: ${node.url}\n`;
          markdown += `\`\`\`\n`;
          break;
      }
    }
    markdown += '\n'; // Add a newline after each scene content

    if (i < sceneEntries.length - 1) {
      markdown += '---\n\n'; // Separator between scenes
    }
  }

  return markdown.trim();
}
