/**
 * 批量生成脚本入口
 * 通过 API 获取剧本，生成资源，再通过 API 更新
 *
 * 功能：
 * - 本地缓存：生成的素材保存到本地，避免重复生成
 * - 跳过已生成：剧本中已有 URL 的素材跳过
 * - --force：强制重新生成所有素材
 * - 格式转换：远端素材格式不符时下载转换后重新上传
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { parse, stringify } from '@mui-gamebook/parser';
import type { Game } from '@mui-gamebook/parser';
import slugify from 'slugify';
import { genAI, DEFAULT_TTS_VOICE } from './lib/config';
import { generateStorySpeech, type VoiceName } from './lib/tts';
import { uploadToR2 } from './lib/generator';
import { wavToMp3, checkFfmpeg, isFormatMatch, getFormatFromUrl, downloadFile, convertFormat } from './lib/converter';
import { cacheExists, readCache, writeCache, generateCacheFileName } from './lib/cache';

/**
 * 配置文件格式
 */
interface BatchConfig {
  apiUrl: string;
  adminSecret: string;
  gameSlug: string;
  force?: boolean;
  generate: {
    sceneTTS?: boolean;
    choiceTTS?: boolean;
  };
  format?: {
    audio?: 'mp3' | 'wav';
    image?: 'webp' | 'png';
  };
}

/**
 * 从 API 获取剧本
 */
async function fetchGame(config: BatchConfig): Promise<{ id: number; content: string }> {
  const res = await fetch(`${config.apiUrl}/api/admin/games/${config.gameSlug}`, {
    headers: { Authorization: `Bearer ${config.adminSecret}` },
  });

  if (!res.ok) {
    const error = (await res.json()) as { error: string };
    throw new Error(`获取剧本失败: ${error.error}`);
  }

  return (await res.json()) as { id: number; content: string };
}

/**
 * 更新剧本到 API
 */
async function updateGame(config: BatchConfig, content: string): Promise<void> {
  const res = await fetch(`${config.apiUrl}/api/admin/games/${config.gameSlug}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.adminSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const error = (await res.json()) as { error: string };
    throw new Error(`更新剧本失败: ${error.error}`);
  }
}

/**
 * 为节点生成 TTS（带缓存）
 */
async function generateNodeTTS(
  text: string,
  game: Game,
  sceneId: string,
  nodeIndex: number,
  nodeType: string,
  config: BatchConfig,
): Promise<string> {
  const voiceName = (DEFAULT_TTS_VOICE as VoiceName) || 'Aoede';
  const folder = slugify(game.title, { lower: true, trim: true }) || game.title;
  const audioFormat = config.format?.audio || 'wav';
  const ttsStyle = game.ai?.style?.tts || '';

  // 生成缓存文件名（包含 ttsStyle，确保相同文本不同风格生成不同缓存）
  const cacheFileName = generateCacheFileName(sceneId, nodeIndex, nodeType, text, audioFormat, ttsStyle);

  // 检查本地缓存
  if (cacheExists(config.gameSlug, cacheFileName)) {
    console.log(`[缓存命中] ${cacheFileName}`);
    const cachedBuffer = readCache(config.gameSlug, cacheFileName)!;
    const mimeType = audioFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    const fileName = `audio/${folder}/${cacheFileName}`;
    const publicUrl = await uploadToR2(fileName, cachedBuffer, mimeType);
    console.log(`[上传缓存] ${publicUrl}`);
    return publicUrl;
  }

  console.log(`[TTS] 生成语音: "${text.substring(0, 30)}..."`);

  // 构建 TTS prompt，使用 ai.style.tts 作为风格指导
  const { buffer: wavBuffer, mimeType } = await generateStorySpeech(genAI, text, voiceName, ttsStyle);

  // 如果配置了 MP3 格式，进行转换
  let finalBuffer = wavBuffer;
  let finalMimeType = mimeType;

  if (audioFormat === 'mp3') {
    console.log('[转换] WAV -> MP3...');
    finalBuffer = wavToMp3(wavBuffer);
    finalMimeType = 'audio/mpeg';
  }

  // 保存到本地缓存
  writeCache(config.gameSlug, cacheFileName, finalBuffer);

  const fileName = `audio/${folder}/${cacheFileName}`;
  const publicUrl = await uploadToR2(fileName, finalBuffer, finalMimeType);

  console.log(`[成功] ${publicUrl}`);
  return publicUrl;
}

/**
 * 转换远端素材格式
 */
async function convertRemoteAsset(
  url: string,
  targetFormat: string,
  game: Game,
  assetType: 'audio' | 'image',
): Promise<string | null> {
  try {
    const currentFormat = getFormatFromUrl(url);
    if (!currentFormat) return null;

    console.log(`[格式转换] ${currentFormat} -> ${targetFormat}`);

    // 下载远端文件
    const buffer = await downloadFile(url);

    // 转换格式
    const convertedBuffer = convertFormat(buffer, currentFormat, targetFormat);

    // 上传新文件
    const folder = slugify(game.title, { lower: true, trim: true }) || game.title;
    const mimeType =
      targetFormat === 'mp3' ? 'audio/mpeg' : targetFormat === 'webp' ? 'image/webp' : 'application/octet-stream';
    const fileName = `${assetType}/${folder}/converted-${Date.now()}.${targetFormat}`;
    const publicUrl = await uploadToR2(fileName, convertedBuffer, mimeType);

    console.log(`[转换完成] ${publicUrl}`);
    return publicUrl;
  } catch (e) {
    console.error(`[转换失败] ${(e as Error).message}`);
    return null;
  }
}

/**
 * 处理游戏所有场景
 */
async function processGame(game: Game, config: BatchConfig, force: boolean): Promise<boolean> {
  let hasChanged = false;
  const audioFormat = config.format?.audio || 'wav';

  for (const scene of Object.values(game.scenes)) {
    for (let i = 0; i < scene.nodes.length; i++) {
      const node = scene.nodes[i];

      // 文本节点 TTS
      if (config.generate.sceneTTS && node.type === 'text') {
        const hasUrl = !!node.audio_url;
        const formatMatch = hasUrl ? isFormatMatch(node.audio_url!, audioFormat) : true;

        // 需要生成：无 URL 或强制模式
        if (!hasUrl || force) {
          try {
            const url = await generateNodeTTS(node.content, game, scene.id, i, 'text', config);
            node.audio_url = url;
            hasChanged = true;
          } catch (e) {
            console.error(`[错误] 场景 ${scene.id} 文本 TTS 失败:`, (e as Error).message);
          }
        }
        // 格式不匹配：下载转换
        else if (!formatMatch) {
          const newUrl = await convertRemoteAsset(node.audio_url!, audioFormat, game, 'audio');
          if (newUrl) {
            node.audio_url = newUrl;
            hasChanged = true;
          }
        } else {
          console.log(`[跳过] 场景 ${scene.id} 文本已有语音`);
        }
      }

      // 选项节点 TTS
      if (config.generate.choiceTTS && node.type === 'choice') {
        const hasUrl = !!node.audio_url;
        const formatMatch = hasUrl ? isFormatMatch(node.audio_url!, audioFormat) : true;

        if (!hasUrl || force) {
          try {
            const url = await generateNodeTTS(node.text, game, scene.id, i, 'choice', config);
            node.audio_url = url;
            hasChanged = true;
          } catch (e) {
            console.error(`[错误] 场景 ${scene.id} 选项 TTS 失败:`, (e as Error).message);
          }
        } else if (!formatMatch) {
          const newUrl = await convertRemoteAsset(node.audio_url!, audioFormat, game, 'audio');
          if (newUrl) {
            node.audio_url = newUrl;
            hasChanged = true;
          }
        } else {
          console.log(`[跳过] 场景 ${scene.id} 选项已有语音`);
        }
      }
    }
  }

  return hasChanged;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf('--config');
  const forceArg = args.includes('--force');
  const dryRun = args.includes('--dry-run');

  if (configIndex === -1 || !args[configIndex + 1]) {
    console.error('用法: pnpm batch --config <配置文件路径> [--force] [--dry-run]');
    console.error('');
    console.error('选项:');
    console.error('  --force    强制重新生成所有素材（忽略已有 URL）');
    console.error('  --dry-run  只生成和上传，不更新数据库（测试用）');
    console.error('');
    console.error('示例: pnpm batch --config ./configs/jianjian.json');
    process.exit(1);
  }

  const configPath = args[configIndex + 1];

  if (!existsSync(configPath)) {
    console.error(`配置文件不存在: ${configPath}`);
    process.exit(1);
  }

  // 检查 ffmpeg
  if (!checkFfmpeg()) {
    console.error('错误: 未找到 ffmpeg，请确保已安装');
    process.exit(1);
  }

  const config: BatchConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

  // --force 命令行参数优先于配置文件
  const force = forceArg || config.force || false;

  console.log('='.repeat(50));
  console.log(`批量生成: ${config.gameSlug}`);
  console.log(`API: ${config.apiUrl}`);
  console.log(`强制模式: ${force ? '是' : '否'}`);
  console.log(`测试模式: ${dryRun ? '是（不更新数据库）' : '否'}`);
  console.log(`音频格式: ${config.format?.audio || 'wav'}`);
  console.log('='.repeat(50));

  // 1. 获取剧本
  console.log('\n[1/3] 获取剧本...');
  const { content } = await fetchGame(config);

  // 2. 解析并处理
  console.log('[2/3] 解析并生成资源...');
  const parseResult = parse(content);
  if (!parseResult.success) {
    console.error('解析剧本失败:', parseResult.error);
    process.exit(1);
  }

  const game = parseResult.data;
  const hasChanged = await processGame(game, config, force);

  // 3. 更新剧本（dry-run 模式下跳过）
  if (dryRun) {
    console.log('\n[dry-run] 跳过数据库更新');
    console.log('\n✅ 测试完成!');
  } else if (hasChanged) {
    console.log('\n[3/3] 上传更新...');
    const newContent = stringify(game);
    await updateGame(config, newContent);
    console.log('\n✅ 完成!');
  } else {
    console.log('\n无需更新，所有资源已生成。');
  }
}

main().catch((e) => {
  console.error('发生错误:', e);
  process.exit(1);
});
