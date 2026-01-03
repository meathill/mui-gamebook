/**
 * 批量生成脚本入口
 * 通过 API 获取剧本，生成资源，再通过 API 更新
 *
 * 功能：
 * - 自动生成：有 prompt 的节点（图片、视频、音乐、小游戏）自动生成
 * - 可选 TTS：通过配置控制是否生成场景内容语音
 * - 跳过已生成：剧本中已有 URL 的素材跳过
 * - --force：强制重新生成所有素材
 * - --batch：使用 Batch API 批量生成图片（节省 50% 成本）
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { parse, stringify } from '@mui-gamebook/parser';
import type { Game, SceneNode } from '@mui-gamebook/parser';
import { setProviderType, getProviderType } from './lib/config';
import type { AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { processGame } from './lib/generator';
import { checkFfmpeg, imageToWebp } from './lib/converter';
import { fetchGame, updateGame, type BaseConfig } from './lib/api-client';
import {
  hasPendingBatch,
  createBatch,
  checkBatchStatus,
  clearBatchRecord,
  type BatchTask,
} from './lib/batch-client';
import { smartUpload } from './lib/uploader';

/**
 * 配置文件格式
 */
interface BatchConfig extends BaseConfig {
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
 * 收集待生成图片的任务
 */
function collectImageTasks(game: Game, force: boolean): BatchTask[] {
  const tasks: BatchTask[] = [];

  for (const scene of Object.values(game.scenes)) {
    for (const node of scene.nodes) {
      if (node.type === 'ai_image' && (!node.url || force)) {
        tasks.push({
          custom_id: `scene-${scene.id}-${tasks.length}`,
          sceneId: scene.id,
          prompt: node.prompt,
        });
      }
    }
  }

  return tasks;
}

/**
 * 处理 Batch 模式
 */
async function handleBatchMode(
  config: BatchConfig,
  game: Game,
  force: boolean,
  dryRun: boolean,
): Promise<void> {
  const gameSlug = config.gameSlug;
  const provider = getProviderType();
  const apiKey = provider === 'google' ? process.env.GOOGLE_API_KEY : undefined;

  // 检查是否有进行中的 batch
  const pendingBatch = hasPendingBatch(gameSlug);

  if (pendingBatch) {
    // 有进行中的 batch，检查状态
    console.log(`\n[Batch] 发现进行中的任务: ${pendingBatch.batch_id}`);
    console.log(`[Batch] Provider: ${pendingBatch.provider}`);
    console.log(`[Batch] 创建时间: ${pendingBatch.created_at}`);

    const status = await checkBatchStatus(pendingBatch.batch_id, pendingBatch.provider, apiKey);
    console.log(`[Batch] 状态: ${status.status}`);
    console.log(`[Batch] 进度: ${status.progress.completed}/${status.progress.total} 完成`);

    if (status.status === 'completed' && status.results) {
      console.log(`[Batch] 处理 ${status.results.length} 个结果...`);

      // 处理结果
      let successCount = 0;
      for (let i = 0; i < status.results.length; i++) {
        const result = status.results[i];

        if (!result.success || !result.base64) {
          console.log(`  ✗ ${result.custom_id}: ${result.error || '无图片'}`);
          continue;
        }

        // 找到对应的任务
        const task = pendingBatch.tasks[i];
        if (!task) continue;

        // 找到对应的节点
        const scene = game.scenes[task.sceneId];
        if (!scene) continue;

        const node = scene.nodes.find(
          (n: SceneNode) => n.type === 'ai_image' && n.prompt === task.prompt,
        );
        if (!node || node.type !== 'ai_image') continue;

        // 保存图片
        const buffer = Buffer.from(result.base64, 'base64');
        const webpBuffer = imageToWebp(buffer, 'png');
        const fileName = `batch-${task.sceneId}-${i}.webp`;
        const r2Path = `images/${gameSlug}/${fileName}`;

        const url = await smartUpload(gameSlug, fileName, r2Path, webpBuffer, 'image/webp', force);
        node.url = url;
        successCount++;
        console.log(`  ✓ ${task.sceneId}: ${url}`);
      }

      // 更新剧本
      if (!dryRun && successCount > 0) {
        console.log('\n[Batch] 更新剧本...');
        const newContent = stringify(game);
        await updateGame(config, newContent);
      }

      // 清理记录
      clearBatchRecord(gameSlug);
      console.log(`\n✅ Batch 完成! 成功生成 ${successCount} 张图片`);
    } else if (status.status === 'failed') {
      console.log(`[Batch] 任务失败，清理记录`);
      if (status.results) {
        status.results.filter((r) => !r.success).forEach((r) => console.log(`  错误: ${r.error}`));
      }
      clearBatchRecord(gameSlug);
    } else {
      console.log('\n⏳ Batch 任务仍在进行中，请稍后再次运行此命令检查结果');
    }
  } else {
    // 没有进行中的 batch，创建新任务
    const tasks = collectImageTasks(game, force);

    if (tasks.length === 0) {
      console.log('\n✅ 没有待生成的图片任务');
      return;
    }

    console.log(`\n[Batch] 收集到 ${tasks.length} 个待生成图片任务`);

    const batchId = await createBatch({
      gameSlug,
      tasks,
      provider,
      imageStyle: game.ai?.style?.image,
      apiKey,
    });

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Batch 任务已创建: ${batchId}`);
    console.log('');
    console.log('请稍后再次运行此命令检查结果并下载图片:');
    console.log(`  pnpm batch --config ${process.argv[process.argv.indexOf('--config') + 1]} --batch`);
    console.log('='.repeat(50));
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
  const batchMode = args.includes('--batch');

  if (configIndex === -1 || !args[configIndex + 1]) {
    console.error('用法: pnpm batch --config <配置文件路径> [--force] [--dry-run] [--batch]');
    console.error('');
    console.error('选项:');
    console.error('  --force    强制重新生成所有素材（忽略已有 URL）');
    console.error('  --dry-run  只生成和上传，不更新数据库（测试用）');
    console.error('  --batch    使用 Batch API 生成图片（节省 50% 成本）');
    console.error('');
    console.error('示例: pnpm batch --config ./configs/cthulhu.json');
    console.error('      pnpm batch --config ./configs/cthulhu.json --batch');
    process.exit(1);
  }

  const configPath = args[configIndex + 1];

  if (!existsSync(configPath)) {
    console.error(`配置文件不存在: ${configPath}`);
    process.exit(1);
  }

  // 检查 ffmpeg（非 batch 模式或需要处理结果时）
  if (!batchMode && !checkFfmpeg()) {
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
  console.log(`Batch 模式: ${batchMode ? '是（节省 50%）' : '否'}`);
  console.log('='.repeat(50));

  // 1. 获取剧本
  console.log('\n[1/3] 获取剧本...');
  const { content } = await fetchGame(config);

  // 2. 解析
  console.log('[2/3] 解析剧本...');
  const parseResult = parse(content);
  if (!parseResult.success) {
    console.error('解析剧本失败:', parseResult.error);
    process.exit(1);
  }

  const game = parseResult.data;

  // 3. 处理
  if (batchMode) {
    // Batch 模式：只处理图片
    await handleBatchMode(config, game, force, dryRun);
  } else {
    // 实时模式：处理所有资源
    console.log('[3/3] 生成资源...');
    const hasChanged = await processGame(game, force, { gameSlug: config.gameSlug, tts: config.tts });

    if (dryRun) {
      console.log('\n[dry-run] 跳过数据库更新');
      console.log('\n✅ 测试完成!');
    } else if (hasChanged) {
      console.log('\n[保存] 上传更新...');
      const newContent = stringify(game);
      await updateGame(config, newContent);
      console.log('\n✅ 完成!');
    } else {
      console.log('\n无需更新，所有资源已生成。');
    }
  }
}

main().catch((e) => {
  console.error('发生错误:', e);
  process.exit(1);
});

