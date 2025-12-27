/**
 * 素材生成模块
 */
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { AiUsageInfo } from '@mui-gamebook/core/lib/ai-provider';
import type { Game, SceneNode } from '@mui-gamebook/parser';
import slugify from 'slugify';
import { getAiProvider, s3Client, R2_BUCKET, R2_PUBLIC_URL, DEFAULT_TTS_VOICE } from './config';
import { retry } from './utils';
import { addUsage } from './usage';
import { generateStorySpeech, type VoiceName } from './tts';

/**
 * 生成图片选项
 */
interface GenerateImageOptions {
  aspectRatio?: string;
  referenceImages?: string[];
}

/**
 * 生成图片（带重试）
 */
export async function generateImage(
  prompt: string,
  options?: GenerateImageOptions,
): Promise<{
  buffer: Buffer;
  type: string;
  usage: AiUsageInfo;
}> {
  return retry<{
    buffer: Buffer;
    type: string;
    usage: AiUsageInfo;
  }>(async () => {
    const provider = getAiProvider();
    const result = await provider.generateImage(prompt, options);
    return {
      buffer: result.buffer,
      type: result.type,
      usage: result.usage,
    };
  });
}

/**
 * 上传文件到 R2（带重试）
 */
export async function uploadToR2(fileName: string, body: Buffer, type: string = 'image/png'): Promise<string> {
  return retry(() => _uploadToR2(fileName, body, type));
}

async function _uploadToR2(fileName: string, body: Buffer, type: string = 'image/png'): Promise<string> {
  console.log(`[R2] Uploading ${fileName}...`);
  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileName,
      Body: body,
      ContentType: type,
    }),
  );
  return `${R2_PUBLIC_URL}/${fileName}`;
}

/**
 * 处理全局素材（角色头像、封面图等）
 */
export async function processGlobalAssets(game: Game, force: boolean): Promise<boolean> {
  let changed = false;

  // 1. Characters
  if (game.ai && game.ai.characters) {
    for (const [id, char] of Object.entries(game.ai.characters)) {
      if (char.image_prompt && (!char.image_url || force)) {
        const fullPrompt = `${game.ai.style?.image || ''}, character portrait of ${char.image_prompt}`;
        try {
          const { buffer, type, usage } = await generateImage(fullPrompt);
          addUsage(usage);

          const fileName = `images/${game.title}/characters/${id}-${Date.now()}.png`;
          const publicUrl = await uploadToR2(fileName, buffer, type);
          char.image_url = publicUrl;
          console.log(`[SUCCESS] Generated character image for ${char.name}: ${publicUrl}`);
          changed = true;
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          console.error(`[ERROR] Failed to generate character image for ${char.name}: ${message}`);
        }
      }
    }
  }

  // 2. Cover Image
  if (game.cover_image && game.cover_image.startsWith('prompt:')) {
    const prompt = game.cover_image.replace(/^prompt:\s*/, '');
    const fullPrompt = `${game.ai.style?.image || ''}, cover art, ${prompt}`;
    try {
      const { buffer, type, usage } = await generateImage(fullPrompt);
      addUsage(usage);

      const fileName = `images/${game.title}/cover-${Date.now()}.png`;
      const publicUrl = await uploadToR2(fileName, buffer, type);
      game.cover_image = publicUrl;
      console.log(`[SUCCESS] Generated cover image: ${publicUrl}`);
      changed = true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[ERROR] Failed to generate cover image: ${message}`);
    }
  }

  return changed;
}

/**
 * 从 prompt 中提取 @角色ID 格式的内联引用
 */
function extractInlineCharacterIds(prompt: string): string[] {
  const matches = prompt.match(/@(\w+)/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1));
}

/**
 * 处理单个场景节点
 */
export async function processNode(node: SceneNode, game: Game, force: boolean = false): Promise<boolean> {
  // AI 图片节点
  if (node.type === 'ai_image' && (!node.url || force)) {
    let fullPrompt = `${game.ai.style?.image || ''}`;

    // 收集所有角色引用：DSL 语法 + @角色ID 内联引用
    const allCharacterIds: string[] = [];

    // Include character from DSL syntax
    if (node.character) {
      allCharacterIds.push(node.character);
    }

    // Include multiple characters from DSL syntax
    if (node.characters && node.characters.length > 0) {
      allCharacterIds.push(...node.characters);
    }

    // Include characters from @角色ID inline syntax
    const inlineIds = extractInlineCharacterIds(node.prompt);
    allCharacterIds.push(...inlineIds);

    // 去重
    const uniqueCharacterIds = [...new Set(allCharacterIds)];

    // 收集角色描述和头像
    const referenceImages: string[] = [];
    if (uniqueCharacterIds.length > 0 && game.ai.characters) {
      for (const charId of uniqueCharacterIds) {
        const char = game.ai.characters[charId];
        if (char) {
          if (char.image_prompt) {
            fullPrompt += `, ${char.image_prompt}`;
          }
          if (char.image_url) {
            referenceImages.push(char.image_url);
          }
        }
      }
    }

    // 清理 prompt 中的 @角色ID，替换为角色名称
    let cleanedPrompt = node.prompt;
    if (game.ai.characters) {
      for (const charId of inlineIds) {
        const char = game.ai.characters[charId];
        if (char) {
          cleanedPrompt = cleanedPrompt.replace(new RegExp(`@${charId}\\b`, 'g'), char.name);
        }
      }
    }

    fullPrompt += `, ${cleanedPrompt}`;

    try {
      const { buffer: imageBuffer, type, usage } = await generateImage(fullPrompt, {
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      });
      addUsage(usage);

      const folder = slugify(game.title, {
        lower: true,
        trim: true,
      });
      const fileName = `images/${folder || game.title}/${Date.now()}.png`;
      const publicUrl = await uploadToR2(fileName, imageBuffer, type);
      node.url = publicUrl;
      console.log(`[SUCCESS] Generated and uploaded image: ${publicUrl}`);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] Failed to process node for prompt "${node.prompt}": ${message}`);
      return false;
    }
  }

  // 小游戏节点
  if (node.type === 'minigame' && (!node.url || force)) {
    try {
      console.log(`[MiniGame] Generating minigame: "${node.prompt.substring(0, 50)}..."`);
      const provider = getAiProvider();
      const { code, usage } = await provider.generateMiniGame(node.prompt, node.variables);
      addUsage(usage);

      const folder = slugify(game.title, { lower: true, trim: true }) || game.title;
      const fileName = `minigames/${folder}/${Date.now()}.js`;
      const publicUrl = await uploadToR2(fileName, Buffer.from(code, 'utf-8'), 'application/javascript');
      node.url = publicUrl;
      console.log(`[SUCCESS] Generated and uploaded minigame: ${publicUrl}`);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] Failed to generate minigame: ${message}`);
      return false;
    }
  }

  // TODO: Add logic for 'ai_audio' and 'ai_video' here in the future
  return false;
}

/**
 * 为节点生成 TTS 语音
 * 支持文本节点和选项节点
 */
export async function processNodeTTS(
  node: SceneNode,
  game: Game,
  sceneId: string,
  nodeIndex: number,
  force: boolean = false,
): Promise<boolean> {
  const folder = slugify(game.title, { lower: true, trim: true }) || game.title;
  const voiceName = (DEFAULT_TTS_VOICE as VoiceName) || 'Aoede';

  // 文本节点 TTS
  if (node.type === 'text' && (!node.audio_url || force)) {
    try {
      console.log(`[TTS] Processing text node in scene ${sceneId}...`);
      const { buffer, mimeType } = await generateStorySpeech(node.content, voiceName);

      const fileName = `audio/${folder}/${sceneId}-text-${nodeIndex}-${Date.now()}.wav`;
      const publicUrl = await uploadToR2(fileName, buffer, mimeType);
      node.audio_url = publicUrl;
      console.log(`[SUCCESS] Generated TTS for text: ${publicUrl}`);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] Failed to generate TTS for text in scene ${sceneId}: ${message}`);
      return false;
    }
  }

  // 选项节点 TTS
  if (node.type === 'choice' && (!node.audio_url || force)) {
    try {
      console.log(`[TTS] Processing choice node in scene ${sceneId}...`);
      const { buffer, mimeType } = await generateStorySpeech(node.text, voiceName);

      const fileName = `audio/${folder}/${sceneId}-choice-${nodeIndex}-${Date.now()}.wav`;
      const publicUrl = await uploadToR2(fileName, buffer, mimeType);
      node.audio_url = publicUrl;
      console.log(`[SUCCESS] Generated TTS for choice: ${publicUrl}`);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ERROR] Failed to generate TTS for choice in scene ${sceneId}: ${message}`);
      return false;
    }
  }

  return false;
}

/**
 * 处理游戏素材生成的核心逻辑
 */
export async function processGame(game: Game, force: boolean): Promise<boolean> {
  let hasChanged = false;

  // 处理全局素材（角色头像、封面图等）
  const globalChanged = await processGlobalAssets(game, force);
  if (globalChanged) hasChanged = true;

  // 处理场景素材
  for (const scene of Object.values(game.scenes)) {
    for (let i = 0; i < scene.nodes.length; i++) {
      const node = scene.nodes[i];

      // 处理图片/音频/视频素材
      const assetUpdated = await processNode(node, game, force);
      if (assetUpdated) hasChanged = true;

      // 处理 TTS 语音
      const ttsUpdated = await processNodeTTS(node, game, scene.id, i, force);
      if (ttsUpdated) hasChanged = true;
    }
  }

  return hasChanged;
}
