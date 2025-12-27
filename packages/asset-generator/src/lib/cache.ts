/**
 * 本地缓存模块
 * 用于缓存生成的素材，避免重复生成
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

const CACHE_DIR = join(dirname(import.meta.url.replace('file://', '')), '..', '..', 'cache');

/**
 * 获取缓存文件路径
 */
export function getCachePath(gameSlug: string, fileName: string): string {
  return join(CACHE_DIR, gameSlug, fileName);
}

/**
 * 确保缓存目录存在
 */
export function ensureCacheDir(gameSlug: string): void {
  const dir = join(CACHE_DIR, gameSlug);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * 检查缓存是否存在
 */
export function cacheExists(gameSlug: string, fileName: string): boolean {
  return existsSync(getCachePath(gameSlug, fileName));
}

/**
 * 读取缓存
 */
export function readCache(gameSlug: string, fileName: string): Buffer | null {
  const path = getCachePath(gameSlug, fileName);
  if (!existsSync(path)) {
    return null;
  }
  return readFileSync(path);
}

/**
 * 写入缓存
 */
export function writeCache(gameSlug: string, fileName: string, data: Buffer): void {
  ensureCacheDir(gameSlug);
  const path = getCachePath(gameSlug, fileName);
  writeFileSync(path, data);
  console.log(`[缓存] 已保存: ${fileName}`);
}

/**
 * 获取上传记录文件路径
 */
function getUploadRecordPath(gameSlug: string): string {
  return join(CACHE_DIR, gameSlug, '.uploaded.json');
}

/**
 * 读取上传记录
 * 返回 { 缓存文件名: R2 URL } 的映射
 */
export function getUploadedUrls(gameSlug: string): Record<string, string> {
  const path = getUploadRecordPath(gameSlug);
  if (!existsSync(path)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * 检查文件是否已上传
 */
export function isUploaded(gameSlug: string, cacheFileName: string): string | null {
  const records = getUploadedUrls(gameSlug);
  return records[cacheFileName] || null;
}

/**
 * 记录文件已上传
 */
export function markAsUploaded(gameSlug: string, cacheFileName: string, r2Url: string): void {
  ensureCacheDir(gameSlug);
  const records = getUploadedUrls(gameSlug);
  records[cacheFileName] = r2Url;
  const path = getUploadRecordPath(gameSlug);
  writeFileSync(path, JSON.stringify(records, null, 2));
}

/**
 * 生成缓存文件名
 * 基于内容和风格生成唯一标识
 */
export function generateCacheFileName(
  sceneId: string,
  nodeIndex: number,
  nodeType: string,
  text: string,
  format: string,
  ttsStyle?: string,
): string {
  // 使用内容+风格的哈希作为文件名的一部分
  // 这样相同文本但不同风格会生成不同的缓存
  const contentToHash = ttsStyle ? `${text}|${ttsStyle}` : text;
  const hash = simpleHash(contentToHash);
  return `${sceneId}-${nodeType}-${nodeIndex}-${hash}.${format}`;
}

/**
 * 生成图片缓存文件名
 * 基于 prompt 和类型生成唯一标识
 */
export function generateImageCacheFileName(imageType: string, prompt: string, format: string = 'png'): string {
  const hash = simpleHash(prompt);
  return `${imageType}-${hash}.${format}`;
}

/**
 * 简单的字符串哈希函数
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}
