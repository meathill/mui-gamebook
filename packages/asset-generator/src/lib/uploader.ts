/**
 * R2 上传模块
 * 处理文件上传到 Cloudflare R2
 */
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, R2_BUCKET, R2_PUBLIC_URL } from './config';
import { retry } from './utils';
import { isUploaded, markAsUploaded } from './cache';

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
export async function smartUpload(
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
