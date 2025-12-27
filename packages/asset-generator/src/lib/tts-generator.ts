/**
 * TTS 生成模块
 * 处理文本转语音的生成
 */
import type { Game, SceneNode } from '@mui-gamebook/parser';
import { DEFAULT_TTS_VOICE } from './config';
import { generateStorySpeech, type VoiceName } from './tts';
import { generateCacheFileName, cacheExists, readCache, writeCache } from './cache';
import { smartUpload } from './uploader';

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
