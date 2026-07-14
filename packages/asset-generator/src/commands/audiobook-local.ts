/**
 * audiobook-local 命令 - 基于本地文件生成分角色语音有声书 manifest
 */
import { readFile } from 'node:fs/promises';
import * as path from 'path';
import { parse } from '@mui-gamebook/parser';
import { generateAudiobook } from '../lib/audiobook/manifest-generator';
import { describeAudiobookMode, printAudiobookSummary } from '../lib/audiobook/report';
import type { AudiobookCommandOptions } from '../lib/audiobook/types';
import { printUsageStats } from '../lib/usage';

/**
 * 只读：不会把 manifest 或音色/分段结果写回本地文件
 */
export async function handleAudiobookLocalCommand(
  relativePath: string,
  options: AudiobookCommandOptions,
): Promise<void> {
  const filePath = path.resolve(process.cwd(), '../..', relativePath);
  console.log(`处理文件: ${filePath}`);
  console.log(`强制模式: ${options.force}`);
  console.log(`模式: ${describeAudiobookMode(options)}\n`);

  const fileContent = await readFile(filePath, 'utf-8');
  const parseResult = parse(fileContent);

  if (!parseResult.success) {
    console.error('解析文件失败:', parseResult.error);
    process.exit(1);
  }

  const game = parseResult.data;
  const gameSlug =
    game.slug ||
    relativePath
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();

  const generation = await generateAudiobook(game, {
    gameSlug,
    force: options.force,
    dryRun: options.dryRun,
    segmentsOnly: options.segmentsOnly,
    verbose: options.verbose,
  });

  printAudiobookSummary(generation);
  printUsageStats();
}
