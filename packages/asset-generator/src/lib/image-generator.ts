/**
 * 图片生成模块
 * 处理 AI 图片和小游戏的生成
 */
import type { AiUsageInfo } from '@mui-gamebook/core/lib/ai-provider';
import type { Game, SceneNode } from '@mui-gamebook/parser';
import { getAiProvider } from './config';
import { retry } from './utils';
import { addUsage } from './usage';
import { generateImageCacheFileName, cacheExists, readCache, writeCache } from './cache';
import { smartUpload } from './uploader';
import { imageToWebp } from './converter';

/**
 * 生成图片选项
 */
export interface GenerateImageOptions {
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

          if (!force && cacheExists(gameSlug, cacheFileName)) {
            console.log(`[CACHE] Found cached character image: ${cacheFileName}`);
            buffer = readCache(gameSlug, cacheFileName)!;
          } else {
            console.log(`[PROMPT] Character ${char.name}:`);
            console.log(`  ${fullPrompt}`);
            const result = await generateImage(fullPrompt);
            buffer = result.buffer;
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

      if (!force && cacheExists(gameSlug, cacheFileName)) {
        console.log(`[CACHE] Found cached cover image: ${cacheFileName}`);
        buffer = readCache(gameSlug, cacheFileName)!;
      } else {
        console.log(`[PROMPT] Cover image:`);
        console.log(`  ${fullPrompt}`);
        const result = await generateImage(fullPrompt);
        buffer = result.buffer;
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
 * 支持中文、英文等任意语言的角色名
 */
function extractInlineCharacterIds(prompt: string): string[] {
  // 使用 Unicode 属性匹配任何语言的字母、数字和下划线
  const matches = prompt.match(/@([\p{L}\p{N}_]+)/gu);
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
      console.log(`  [角色引用] 找到 ${uniqueCharacterIds.length} 个角色: ${uniqueCharacterIds.join(', ')}`);
      for (const charId of uniqueCharacterIds) {
        const char = game.ai.characters[charId];
        if (char) {
          if (char.image_prompt) {
            fullPrompt += `, ${char.image_prompt}`;
          }
          if (char.image_url) {
            referenceImages.push(char.image_url);
            console.log(`    ✓ ${charId}: 有头像 ${char.image_url.substring(0, 50)}...`);
          } else {
            console.log(`    ✗ ${charId}: 无头像 (需要先生成角色头像)`);
          }
        } else {
          console.log(`    ⚠ ${charId}: 角色未定义`);
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
