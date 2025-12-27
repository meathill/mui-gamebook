/**
 * 批量生成脚本入口
 * 通过 API 获取剧本，生成资源，再通过 API 更新
 *
 * 功能：
 * - 自动生成：有 prompt 的节点（图片、视频、音乐、小游戏）自动生成
 * - 可选 TTS：通过配置控制是否生成场景内容语音
 * - 跳过已生成：剧本中已有 URL 的素材跳过
 * - --force：强制重新生成所有素材
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { parse, stringify } from '@mui-gamebook/parser';
import { setProviderType } from './lib/config';
import type { AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { processGame } from './lib/generator';
import { checkFfmpeg } from './lib/converter';

/**
 * 配置文件格式
 */
interface BatchConfig {
  apiUrl: string;
  adminSecret: string;
  gameSlug: string;
  force?: boolean;
  providerType?: AiProviderType;
  /** TTS 配置（可选） */
  tts?: {
    /** 是否为场景文本生成语音 */
    sceneText?: boolean;
    /** 是否为选项生成语音 */
    choices?: boolean;
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
    console.error('示例: pnpm batch --config ./configs/cthulhu.json');
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

  // 设置 AI Provider（如果配置了）
  if (config.providerType) {
    setProviderType(config.providerType);
  }

  // --force 命令行参数优先于配置文件
  const force = forceArg || config.force || false;

  console.log('='.repeat(50));
  console.log(`批量生成: ${config.gameSlug}`);
  console.log(`API: ${config.apiUrl}`);
  console.log(`AI Provider: ${config.providerType || '默认（环境变量）'}`);
  console.log(`强制模式: ${force ? '是' : '否'}`);
  console.log(`测试模式: ${dryRun ? '是（不更新数据库）' : '否'}`);
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

  // 使用 generator.ts 中的 processGame 处理所有资源
  // 包括：封面图、角色头像、场景图片、视频、音乐、小游戏
  // TTS 仅在配置了 tts 选项时生成
  const hasChanged = await processGame(game, force, { tts: config.tts });

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
