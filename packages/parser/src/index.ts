import * as yaml from 'js-yaml';
import type { Game, ParseResult, Scene, SceneNode } from './types';

const FRONT_MATTER_REGEX = /---\n([\s\S]*?)\n---/;
const SCENE_ID_REGEX = /^#\s*([a-zA-Z0-9_]+)/;

// Node-level regexes
const CHOICE_REGEX = /^\s*\*\s*\[(.*?)\]\s*->\s*([a-zA-Z0-9_]+)\s*(.*)/;
const IF_REGEX = /\(if:\s*(.*?)\)/;
const SET_REGEX = /\(set:\s*(.*?)\)/;
const STATIC_IMAGE_REGEX = /^\s*!\[(.*?)\]\((.*?)\)/;
const BLOCK_START_REGEX = /^```(\w+)/;
const BLOCK_END_REGEX = /^```/;

function parseSceneContent(content: string): SceneNode[] {
  const nodes: SceneNode[] = [];
  const lines = content.split('\n');

  let mode: 'default' | 'in_block' = 'default';
  let blockType = '';
  let blockContentBuffer: string[] = [];
  let textBuffer: string[] = [];

  const flushTextBuffer = () => {
    if (textBuffer.length > 0) {
      const content = textBuffer.join('\n').trim();
      if (content) {
        nodes.push({ type: 'text', content });
      }
      textBuffer = [];
    }
  };

  for (const line of lines) {
    if (mode === 'in_block') {
      if (BLOCK_END_REGEX.test(line)) {
        const blockContentStr = blockContentBuffer.join('\n');
        const blockContent = blockContentStr ? yaml.load(blockContentStr) : null;
        if (blockContent && typeof blockContent === 'object') {
          if (blockType === 'image-gen') {
            nodes.push({ type: 'ai_image', ...blockContent });
          } else if (blockType === 'audio-gen') {
            const { type: audioType, ...rest } = blockContent as any;
            nodes.push({ type: 'ai_audio', audioType, ...rest });
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
      const choiceMatch = line.match(CHOICE_REGEX);

      if (blockStartMatch) {
        flushTextBuffer();
        mode = 'in_block';
        blockType = blockStartMatch[1];
      } else if (staticImageMatch) {
        flushTextBuffer();
        nodes.push({ type: 'static_image', alt: staticImageMatch[1], url: staticImageMatch[2] });
      } else if (choiceMatch) {
        flushTextBuffer();
        const [, text, nextSceneId, clausesStr] = choiceMatch;
        const choiceNode: SceneNode = { type: 'choice', text, nextSceneId };
        if (clausesStr) {
          const ifMatch = clausesStr.match(IF_REGEX);
          const setMatch = clausesStr.match(SET_REGEX);
          if (ifMatch) choiceNode.condition = ifMatch[1].trim();
          if (setMatch) choiceNode.set = setMatch[1].trim();
        }
        nodes.push(choiceNode);
      } else {
        textBuffer.push(line);
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

  source = source.split('\n').map(item => item.trimEnd()).join('\n');
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
      state = {},
      ai = {},
    } = frontMatter;

    if (!title) {
      return { success: false, error: 'Title is required in YAML front matter.' };
    }

    const scenes = new Map<string, Scene>();
    const sceneBlocks = body.split(/\n---\n/);

    for (const block of sceneBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock) continue;

      const idMatch = trimmedBlock.match(SCENE_ID_REGEX);
      if (!idMatch) continue;

      const sceneId = idMatch[1];
      const contentAfterId = trimmedBlock.substring(idMatch[0].length).trim();

      const nodes = parseSceneContent(contentAfterId);

      scenes.set(sceneId, { id: sceneId, nodes });
    }

    const game: Game = {
      title,
      description,
      cover_image,
      tags: tags || [],
      initialState: state,
      ai: {
        style: ai.style || {},
        characters: ai.characters || {},
      },
      scenes,
    };

    return { success: true, data: game };
  } catch (e: any) {
    return { success: false, error: `YAML parsing failed: ${e.message}` };
  }
}
