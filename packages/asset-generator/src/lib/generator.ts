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
import {
  generateCacheFileName,
  generateImageCacheFileName,
  cacheExists,
  readCache,
  writeCache,
  isUploaded,
  markAsUploaded,
} from './cache';
import { imageToWebp } from './converter';

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
 * 智能上传：检查是否已上传，已上传则直接返回 URL，否则上传并记录
 * @param gameSlug - 游戏 slug，用于查找上传记录
 * @param cacheFileName - 缓存文件名，用作上传记录的 key
 * @param r2FileName - R2 文件路径
 * @param body - 文件内容
 * @param type - MIME 类型
 * @param force - 是否强制重新上传
 */
async function smartUpload(
  gameSlug: string,
  cacheFileName: string,
  r2FileName: string,
  body: Buffer,
  type: string,
  force: boolean,
): Promise<string> {
  // 检查是否已上传
  if (!force) {
    const existingUrl = isUploaded(gameSlug, cacheFileName);
    if (existingUrl) {
      console.log(`[SKIP] Already uploaded: ${cacheFileName}`);
      return existingUrl;
    }
  }

  // 上传到 R2
  const publicUrl = await uploadToR2(r2FileName, body, type);

  // 记录已上传
  markAsUploaded(gameSlug, cacheFileName, publicUrl);

  return publicUrl;
}

/**
 * 处理全局素材（角色头像、封面图等）
 * 使用本地缓存避免重复生成
 */
export async function processGlobalAssets(game: Game, force: boolean, gameSlug: string): Promise<boolean> {
  let changed = false;

  // 1. Characters
  if (game.ai && game.ai.characters) {
    for (const [id, char] of Object.entries(game.ai.characters)) {
      if (char.image_prompt && (!char.image_url || force)) {
        const fullPrompt = `${game.ai.style?.image || ''}, character portrait of ${char.image_prompt}`;
        try {
          // 检查本地缓存
          const cacheFileName = generateImageCacheFileName(`char-${id}`, fullPrompt, 'png');
          let buffer: Buffer;
          let type = 'image/png';

          if (!force && cacheExists(gameSlug, cacheFileName)) {
            console.log(`[CACHE] Found cached character image: ${cacheFileName}`);
            buffer = readCache(gameSlug, cacheFileName)!;
          } else {
            console.log(`[PROMPT] Character ${char.name}:`);
            console.log(`  ${fullPrompt}`);
            const result = await generateImage(fullPrompt);
            buffer = result.buffer;
            type = result.type;
            addUsage(result.usage);
            // 保存到本地缓存
            writeCache(gameSlug, cacheFileName, buffer);
          }

          // 转换为 webp
          const webpBuffer = imageToWebp(buffer, 'png');
          const webpFileName = cacheFileName.replace('.png', '.webp');

          const r2FileName = `images/${gameSlug}/characters/${webpFileName}`;
          const publicUrl = await smartUpload(gameSlug, webpFileName, r2FileName, webpBuffer, 'image/webp', force);
          char.image_url = publicUrl;
          console.log(`[SUCCESS] Character image for ${char.name}: ${publicUrl}`);
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
      // 检查本地缓存
      const cacheFileName = generateImageCacheFileName('cover', fullPrompt, 'png');
      let buffer: Buffer;
      let type = 'image/png';

      if (!force && cacheExists(gameSlug, cacheFileName)) {
        console.log(`[CACHE] Found cached cover image: ${cacheFileName}`);
        buffer = readCache(gameSlug, cacheFileName)!;
      } else {
        console.log(`[PROMPT] Cover image:`);
        console.log(`  ${fullPrompt}`);
        const result = await generateImage(fullPrompt);
        buffer = result.buffer;
        type = result.type;
        addUsage(result.usage);
        // 保存到本地缓存
        writeCache(gameSlug, cacheFileName, buffer);
      }

      // 转换为 webp
      const webpBuffer = imageToWebp(buffer, 'png');
      const webpFileName = cacheFileName.replace('.png', '.webp');

      const r2FileName = `images/${gameSlug}/${webpFileName}`;
      const publicUrl = await smartUpload(gameSlug, webpFileName, r2FileName, webpBuffer, 'image/webp', force);
      game.cover_image = publicUrl;
      console.log(`[SUCCESS] Cover image: ${publicUrl}`);
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
 * 使用本地缓存避免重复生成
 */
export async function processNode(node: SceneNode, game: Game, force: boolean, gameSlug: string): Promise<boolean> {
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
      // 检查本地缓存
      const cacheFileName = generateImageCacheFileName('scene', fullPrompt, 'png');
      let imageBuffer: Buffer;
      let type = 'image/png';

      if (!force && cacheExists(gameSlug, cacheFileName)) {
        console.log(`[CACHE] Found cached scene image: ${cacheFileName}`);
        imageBuffer = readCache(gameSlug, cacheFileName)!;
      } else {
        console.log(`[PROMPT] Scene image:`);
        console.log(`  ${fullPrompt}`);
        if (referenceImages.length > 0) {
          console.log(`  Reference images:`);
          referenceImages.forEach((url, i) => console.log(`    ${i + 1}. ${url}`));
        }
        const result = await generateImage(fullPrompt, {
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        });
        imageBuffer = result.buffer;
        type = result.type;
        addUsage(result.usage);
        // 保存到本地缓存
        writeCache(gameSlug, cacheFileName, imageBuffer);
      }

      // 转换为 webp
      const webpBuffer = imageToWebp(imageBuffer, 'png');
      const webpFileName = cacheFileName.replace('.png', '.webp');

      const r2FileName = `images/${gameSlug}/${webpFileName}`;
      const publicUrl = await smartUpload(gameSlug, webpFileName, r2FileName, webpBuffer, 'image/webp', force);
      node.url = publicUrl;
      console.log(`[SUCCESS] Scene image: ${publicUrl}`);
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

      // 小游戏使用 prompt 作为缓存 key
      const cacheFileName = generateImageCacheFileName('minigame', node.prompt, 'js');
      let code: string;

      if (!force && cacheExists(gameSlug, cacheFileName)) {
        console.log(`[CACHE] Found cached minigame: ${cacheFileName}`);
        code = readCache(gameSlug, cacheFileName)!.toString('utf-8');
      } else {
        console.log(`[PROMPT] Minigame:`);
        console.log(`  ${node.prompt.substring(0, 200)}...`);
        const provider = getAiProvider();
        const result = await provider.generateMiniGame(node.prompt, node.variables);
        code = result.code;
        addUsage(result.usage);
        // 保存到本地缓存
        writeCache(gameSlug, cacheFileName, Buffer.from(code, 'utf-8'));
      }

      const r2FileName = `minigames/${gameSlug}/${cacheFileName}`;
      const publicUrl = await smartUpload(
        gameSlug,
        cacheFileName,
        r2FileName,
        Buffer.from(code, 'utf-8'),
        'application/javascript',
        force,
      );
      node.url = publicUrl;
      console.log(`[SUCCESS] Minigame: ${publicUrl}`);
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
 * 使用本地缓存避免重复生成
 */
export async function processNodeTTS(
  node: SceneNode,
  game: Game,
  sceneId: string,
  nodeIndex: number,
  force: boolean,
  gameSlug: string,
): Promise<boolean> {
  const voiceName = (DEFAULT_TTS_VOICE as VoiceName) || 'Aoede';

  // 文本节点 TTS
  if (node.type === 'text' && (!node.audio_url || force)) {
    try {
      console.log(`[TTS] Processing text node in scene ${sceneId}...`);

      // 生成缓存文件名（基于内容哈希）
      const cacheFileName = generateCacheFileName(sceneId, nodeIndex, 'text', node.content, 'wav', voiceName);
      let buffer: Buffer;
      let mimeType = 'audio/wav';

      // 检查本地缓存
      if (!force && cacheExists(gameSlug, cacheFileName)) {
        console.log(`[CACHE] Found cached TTS: ${cacheFileName}`);
        buffer = readCache(gameSlug, cacheFileName)!;
      } else {
        // 生成新的 TTS
        const result = await generateStorySpeech(node.content, voiceName);
        buffer = result.buffer;
        mimeType = result.mimeType;
        // 保存到本地缓存
        writeCache(gameSlug, cacheFileName, buffer);
      }

      // 上传到 R2
      const r2FileName = `audio/${gameSlug}/${cacheFileName}`;
      const publicUrl = await smartUpload(gameSlug, cacheFileName, r2FileName, buffer, mimeType, force);
      node.audio_url = publicUrl;
      console.log(`[SUCCESS] TTS for text: ${publicUrl}`);
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

      // 生成缓存文件名（基于内容哈希）
      const cacheFileName = generateCacheFileName(sceneId, nodeIndex, 'choice', node.text, 'wav', voiceName);
      let buffer: Buffer;
      let mimeType = 'audio/wav';

      // 检查本地缓存
      if (!force && cacheExists(gameSlug, cacheFileName)) {
        console.log(`[CACHE] Found cached TTS: ${cacheFileName}`);
        buffer = readCache(gameSlug, cacheFileName)!;
      } else {
        // 生成新的 TTS
        const result = await generateStorySpeech(node.text, voiceName);
        buffer = result.buffer;
        mimeType = result.mimeType;
        // 保存到本地缓存
        writeCache(gameSlug, cacheFileName, buffer);
      }

      // 上传到 R2
      const r2FileName = `audio/${gameSlug}/${cacheFileName}`;
      const publicUrl = await smartUpload(gameSlug, cacheFileName, r2FileName, buffer, mimeType, force);
      node.audio_url = publicUrl;
      console.log(`[SUCCESS] TTS for choice: ${publicUrl}`);
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
 * processGame 的选项
 */
export interface ProcessGameOptions {
  /** 游戏 slug（用于缓存和上传路径） */
  gameSlug: string;
  /** TTS 配置（不配置则不生成 TTS） */
  tts?: {
    /** 是否为场景文本生成语音 */
    sceneText?: boolean;
    /** 是否为选项生成语音 */
    choices?: boolean;
  };
}

/**
 * 处理游戏素材生成的核心逻辑
 */
export async function processGame(game: Game, force: boolean, options: ProcessGameOptions): Promise<boolean> {
  let hasChanged = false;
  const { gameSlug } = options;

  // 统计信息
  const scenes = Object.values(game.scenes);
  const totalScenes = scenes.length;
  const totalNodes = scenes.reduce((sum, scene) => sum + scene.nodes.length, 0);
  let processedNodes = 0;
  let generatedAssets = 0;
  let skippedAssets = 0;

  console.log(`\n📊 素材统计: ${totalScenes} 个场景, ${totalNodes} 个节点`);

  // 处理全局素材（角色头像、封面图等）
  const globalChanged = await processGlobalAssets(game, force, gameSlug);
  if (globalChanged) hasChanged = true;

  // 处理场景素材
  for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
    const scene = scenes[sceneIndex];
    console.log(`\n🎬 [${sceneIndex + 1}/${totalScenes}] 场景: ${scene.id}`);

    for (let i = 0; i < scene.nodes.length; i++) {
      const node = scene.nodes[i];
      processedNodes++;

      // 处理图片/音频/视频素材
      const assetUpdated = await processNode(node, game, force, gameSlug);
      if (assetUpdated) {
        hasChanged = true;
        generatedAssets++;
      } else if (node.type === 'ai_image' || node.type === 'minigame') {
        skippedAssets++;
      }

      // 处理 TTS 语音（仅当配置了 tts 选项时）
      if (options?.tts) {
        const shouldProcessTTS =
          (node.type === 'text' && options.tts.sceneText) || (node.type === 'choice' && options.tts.choices);

        if (shouldProcessTTS) {
          const ttsUpdated = await processNodeTTS(node, game, scene.id, i, force, gameSlug);
          if (ttsUpdated) {
            hasChanged = true;
            generatedAssets++;
          } else {
            skippedAssets++;
          }
        }
      }
    }
  }

  // 最终统计
  console.log(`\n✅ 完成统计:`);
  console.log(`   - 处理节点: ${processedNodes}/${totalNodes}`);
  console.log(`   - 生成素材: ${generatedAssets}`);
  console.log(`   - 跳过素材: ${skippedAssets} (已存在或使用缓存)`);

  return hasChanged;
}
