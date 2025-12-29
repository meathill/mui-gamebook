/**
 * 将 Game 对象序列化为 Markdown/DSL 字符串
 */
import * as yaml from 'js-yaml';
import { omitBy } from 'lodash-es';
import type { AICharacter, Game, GameState, VariableMeta } from './types';
import { isVariableMeta } from './utils';

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
  if (game.cover_prompt) frontMatter.cover_prompt = game.cover_prompt;
  if (game.cover_aspect_ratio) frontMatter.cover_aspect_ratio = game.cover_aspect_ratio;
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
          voice_name: char.voice_name,
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
