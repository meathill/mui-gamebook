/**
 * audiobook 命令 - 为线上游戏生成分角色语音有声书 manifest
 */
import { parse } from '@mui-gamebook/parser';
import { getGameContent } from '../lib/d1';
import { generateAudiobook } from '../lib/audiobook/manifest-generator';
import { describeAudiobookMode, printAudiobookSummary } from '../lib/audiobook/report';
import type { AudiobookCommandOptions } from '../lib/audiobook/types';
import { printUsageStats } from '../lib/usage';

/**
 * 只读：不会把 manifest 或音色/分段结果写回游戏内容，不调用 updateGameContent
 */
export async function handleAudiobookCommand(idOrSlug: string, options: AudiobookCommandOptions): Promise<void> {
  console.log(`正在获取游戏: ${idOrSlug}...\n`);

  const result = await getGameContent(idOrSlug);
  if (!result) {
    console.error(`错误: 找不到游戏 "${idOrSlug}"`);
    process.exit(1);
  }

  const { game: gameRow, content } = result;
  console.log(`游戏: ${gameRow.title} (ID: ${gameRow.id}, Slug: ${gameRow.slug})`);
  console.log(`强制模式: ${options.force}`);
  console.log(`模式: ${describeAudiobookMode(options)}\n`);

  const parseResult = parse(content);
  if (!parseResult.success) {
    console.error('解析游戏内容失败:', parseResult.error);
    process.exit(1);
  }

  const game = parseResult.data;

  const generation = await generateAudiobook(game, {
    gameSlug: gameRow.slug,
    force: options.force,
    dryRun: options.dryRun,
    segmentsOnly: options.segmentsOnly,
    verbose: options.verbose,
  });

  printAudiobookSummary(generation);
  printUsageStats();
}
