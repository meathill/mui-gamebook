/**
 * 批量生成脚本入口
 * 通过 API 获取剧本，生成资源，再通过 API 更新
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { parse, stringify } from '@mui-gamebook/parser';
import type { Game, SceneNode } from '@mui-gamebook/parser';
import slugify from 'slugify';
import { genAI, s3Client, R2_BUCKET, R2_PUBLIC_URL, DEFAULT_TTS_VOICE } from './lib/config';
import { generateStorySpeech, type VoiceName } from './lib/tts';
import { uploadToR2 } from './lib/generator';
import { wavToMp3, checkFfmpeg } from './lib/converter';

/**
 * 配置文件格式
 */
interface BatchConfig {
  apiUrl: string;
  adminSecret: string;
  gameSlug: string;
  generate: {
    sceneTTS?: boolean;
    choiceTTS?: boolean;
  };
  format?: {
    audio?: 'mp3' | 'wav';
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
 * 为节点生成 TTS
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

  console.log(`[TTS] 生成语音: "${text.substring(0, 30)}..."`);

  // 构建 TTS prompt，使用 ai.style.tts 作为风格指导
  const ttsStyle = game.ai?.style?.tts || '';
  const { buffer: wavBuffer, mimeType } = await generateStorySpeech(genAI, text, voiceName, ttsStyle);

  // 如果配置了 MP3 格式，进行转换
  let finalBuffer = wavBuffer;
  let finalMimeType = mimeType;
  let fileExt = 'wav';

  if (config.format?.audio === 'mp3') {
    console.log('[转换] WAV -> MP3...');
    finalBuffer = wavToMp3(wavBuffer);
    finalMimeType = 'audio/mpeg';
    fileExt = 'mp3';
  }

  const fileName = `audio/${folder}/${sceneId}-${nodeType}-${nodeIndex}-${Date.now()}.${fileExt}`;
  const publicUrl = await uploadToR2(fileName, finalBuffer, finalMimeType);

  console.log(`[成功] ${publicUrl}`);
  return publicUrl;
}

/**
 * 处理游戏所有场景
 */
async function processGame(game: Game, config: BatchConfig): Promise<boolean> {
  let hasChanged = false;

  for (const scene of Object.values(game.scenes)) {
    for (let i = 0; i < scene.nodes.length; i++) {
      const node = scene.nodes[i];

      // 文本节点 TTS
      if (config.generate.sceneTTS && node.type === 'text' && !node.audio_url) {
        try {
          const url = await generateNodeTTS(node.content, game, scene.id, i, 'text', config);
          node.audio_url = url;
          hasChanged = true;
        } catch (e) {
          console.error(`[错误] 场景 ${scene.id} 文本 TTS 失败:`, (e as Error).message);
        }
      }

      // 选项节点 TTS
      if (config.generate.choiceTTS && node.type === 'choice' && !node.audio_url) {
        try {
          const url = await generateNodeTTS(node.text, game, scene.id, i, 'choice', config);
          node.audio_url = url;
          hasChanged = true;
        } catch (e) {
          console.error(`[错误] 场景 ${scene.id} 选项 TTS 失败:`, (e as Error).message);
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

  if (configIndex === -1 || !args[configIndex + 1]) {
    console.error('用法: pnpm batch --config <配置文件路径>');
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

  console.log('='.repeat(50));
  console.log(`批量生成: ${config.gameSlug}`);
  console.log(`API: ${config.apiUrl}`);
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
  const hasChanged = await processGame(game, config);

  // 3. 更新剧本
  if (hasChanged) {
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
