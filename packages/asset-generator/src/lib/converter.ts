/**
 * 媒体格式转换工具
 * 使用系统 ffmpeg 进行音频/视频转换
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * 将 WAV 音频转换为 MP3
 */
export function wavToMp3(wavBuffer: Buffer): Buffer {
  const tempDir = tmpdir();
  const inputPath = join(tempDir, `input-${Date.now()}.wav`);
  const outputPath = join(tempDir, `output-${Date.now()}.mp3`);

  try {
    writeFileSync(inputPath, wavBuffer);

    // 使用 ffmpeg 转换，128kbps 音质
    execSync(`ffmpeg -i "${inputPath}" -acodec libmp3lame -b:a 128k -y "${outputPath}"`, {
      stdio: 'pipe',
    });

    const mp3Buffer = readFileSync(outputPath);
    return mp3Buffer;
  } finally {
    // 清理临时文件
    try {
      unlinkSync(inputPath);
      unlinkSync(outputPath);
    } catch {
      // 忽略删除错误
    }
  }
}

/**
 * 将图片转换为 WebP（使用 ffmpeg）
 */
export function imageToWebp(imageBuffer: Buffer, inputFormat: string = 'png'): Buffer {
  const tempDir = tmpdir();
  const inputPath = join(tempDir, `input-${Date.now()}.${inputFormat}`);
  const outputPath = join(tempDir, `output-${Date.now()}.webp`);

  try {
    writeFileSync(inputPath, imageBuffer);

    // 使用 ffmpeg 转换为 WebP，质量 85
    execSync(`ffmpeg -i "${inputPath}" -quality 85 -y "${outputPath}"`, {
      stdio: 'pipe',
    });

    const webpBuffer = readFileSync(outputPath);
    return webpBuffer;
  } finally {
    try {
      unlinkSync(inputPath);
      unlinkSync(outputPath);
    } catch {
      // 忽略删除错误
    }
  }
}

/**
 * 检查 ffmpeg 是否可用
 */
export function checkFfmpeg(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 从 URL 下载文件
 */
export async function downloadFile(url: string): Promise<Buffer> {
  console.log(`[下载] ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`下载失败: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 从 URL 获取文件格式
 */
export function getFormatFromUrl(url: string): string | null {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * 检查 URL 格式是否匹配目标格式
 */
export function isFormatMatch(url: string, targetFormat: string): boolean {
  const currentFormat = getFormatFromUrl(url);
  if (!currentFormat) return true; // 无法判断时认为匹配
  return currentFormat === targetFormat.toLowerCase();
}

/**
 * 通用格式转换
 */
export function convertFormat(buffer: Buffer, inputFormat: string, outputFormat: string): Buffer {
  // 图片格式转换
  if (outputFormat === 'webp') {
    return imageToWebp(buffer, inputFormat);
  }
  // 音频格式转换
  if (outputFormat === 'mp3' && (inputFormat === 'wav' || inputFormat === 'audio')) {
    return wavToMp3(buffer);
  }
  // 不支持的转换，返回原始数据
  console.warn(`[警告] 不支持的格式转换: ${inputFormat} -> ${outputFormat}`);
  return buffer;
}
