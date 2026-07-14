import * as yaml from 'js-yaml';
import { unified } from 'unified';
import remarkStringify from 'remark-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { omitBy } from 'lodash-es';
import type { Root, RootContent, Heading, Paragraph, List, ListItem, Yaml } from 'mdast';
import type { AICharacter, Game, GameState, VariableMeta } from './types';
import { isVariableMeta, unescapeTemplateSpans } from './utils';

export function stringify(game: Game): string {
  const rootChildren: RootContent[] = [];

  // 1. Global Front Matter
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

  rootChildren.push({
    type: 'yaml',
    value: yaml.dump(frontMatter, { indent: 2, lineWidth: -1 }).trim(),
  } as Yaml);

  // 2. Scenes
  const sceneEntries = Object.values(game.scenes);

  for (let i = 0; i < sceneEntries.length; i++) {
    const scene = sceneEntries[i];

    // Scene Heading
    rootChildren.push({
      type: 'heading',
      depth: 1,
      children: [{ type: 'html', value: scene.id }],
    } as Heading);

    // Scene Metadata for AI Nodes
    const imageNode = scene.nodes.find((n) => n.type === 'ai_image') as any;
    const audioNode = scene.nodes.find((n) => n.type === 'ai_audio') as any;
    const videoNode = scene.nodes.find((n) => n.type === 'ai_video') as any;
    const minigameNode = scene.nodes.find((n) => n.type === 'minigame') as any;

    const metadata: any = {};
    if (imageNode)
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

    if (audioNode)
      metadata.audio = omitBy(
        {
          type: audioNode.audioType,
          prompt: audioNode.prompt,
          url: audioNode.url,
        },
        (v) => v === undefined,
      );

    if (videoNode)
      metadata.video = omitBy(
        {
          prompt: videoNode.prompt,
          url: videoNode.url,
        },
        (v) => v === undefined,
      );

    if (minigameNode)
      metadata.minigame = omitBy(
        {
          prompt: minigameNode.prompt,
          variables: minigameNode.variables, // Expecting object
          url: minigameNode.url,
        },
        (v) => v === undefined,
      );

    if (Object.keys(metadata).length > 0) {
      if (Object.keys(metadata).length > 0) {
        rootChildren.push({
          type: 'code',
          lang: 'yaml',
          value: yaml.dump(metadata, { indent: 2, lineWidth: -1 }).trim(),
        } as any);
      }
    }

    // Content Nodes
    const listItems: ListItem[] = [];

    for (const node of scene.nodes) {
      if (['ai_image', 'ai_audio', 'ai_video', 'minigame'].includes(node.type)) continue;

      if (node.type === 'text') {
        rootChildren.push({
          type: 'paragraph',
          children: [{ type: 'text', value: node.content }],
        } as Paragraph);
        // 语音注释独占一行、紧跟在文本之后（DSL_SPEC §4.3.1）；
        // 放在文本前面同一行会被 CommonMark 当作 HTML block 吞掉整行，导致往返解析丢失文本
        if (node.audio_url) {
          rootChildren.push({ type: 'html', value: `<!-- audio: ${node.audio_url} -->` } as any);
        }
      } else if (node.type === 'static_image') {
        rootChildren.push({
          type: 'paragraph',
          children: [{ type: 'image', url: node.url, alt: node.alt || '' }],
        } as Paragraph);
      } else if (node.type === 'static_audio') {
        rootChildren.push({
          type: 'paragraph',
          children: [{ type: 'link', url: node.url, children: [{ type: 'text', value: 'audio' }] }],
        } as Paragraph);
      } else if (node.type === 'static_video') {
        rootChildren.push({
          type: 'paragraph',
          children: [{ type: 'link', url: node.url, children: [{ type: 'text', value: 'video' }] }],
        } as Paragraph);
      } else if (node.type === 'choice') {
        let text = `[${node.text}] -> ${node.nextSceneId}`;
        const clauses: string[] = [];
        if (node.condition) clauses.push(`(if: ${node.condition})`);
        if (node.set) clauses.push(`(set: ${node.set})`);
        if (node.audio_url) clauses.push(`(audio: ${node.audio_url})`);

        if (clauses.length > 0) {
          text += ` ${clauses.join(' ')}`;
        }

        listItems.push({
          type: 'listItem',
          spread: false,
          children: [{ type: 'html', value: text }],
        } as ListItem);
      }
    }

    if (listItems.length > 0) {
      rootChildren.push({
        type: 'list',
        ordered: false,
        spread: false,
        children: listItems,
      } as List);
    }

    if (i < sceneEntries.length - 1) {
      rootChildren.push({ type: 'thematicBreak' });
    }
  }

  const processor = unified().use(remarkFrontmatter, ['yaml']).use(remarkGfm).use(remarkStringify, {
    bullet: '*',
    fences: true,
    rule: '-',
  });

  const root: Root = { type: 'root', children: rootChildren };
  // remark-stringify 会把文本里的词内 _ 转义成 \_，污染 {{...}} 模板表达式内的变量名，
  // 此处统一还原模板段内的转义（模板段外的转义对 parse 无害，留待手写序列化器根治）
  return unescapeTemplateSpans(processor.stringify(root).trim());
}
