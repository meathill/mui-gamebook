#!/usr/bin/env node
/**
 * AI Prompt 补全脚本
 * 用法: pnpm enhance --config <配置文件路径>
 *
 * 功能：
 * 1. 从 API 获取剧本
 * 2. 分析缺少图片的场景
 * 3. 调用 AI 生成图片 prompts
 * 4. 保存到本地文件供确认
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { parse, stringify } from '@mui-gamebook/parser';
import { setProviderType } from './lib/config';
import {
  findScenesWithoutImages,
  generateImagePrompts,
  insertImageNodes,
} from './lib/prompt-generator';

/**
 * 配置文件类型（复用 batch-generate 的配置）
 */
interface EnhanceConfig {
  apiUrl: string;
  adminSecret: string;
  gameSlug: string;
  providerType?: 'google' | 'openai';
}

/**
 * 从 API 获取剧本
 */
async function fetchGame(config: EnhanceConfig): Promise<{ id: number; content: string }> {
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
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf('--config');

  if (configIndex === -1 || !args[configIndex + 1]) {
    console.error('用法: pnpm enhance --config <配置文件路径>');
    console.error('');
    console.error('示例: pnpm enhance --config ./configs/cthulhu.my.json');
    process.exit(1);
  }

  const configPath = args[configIndex + 1];

  if (!existsSync(configPath)) {
    console.error(`配置文件不存在: ${configPath}`);
    process.exit(1);
  }

  // 读取配置
  const configContent = await readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent) as EnhanceConfig;

  console.log('==================================================');
  console.log(`AI Prompt 补全: ${config.gameSlug}`);
  console.log(`API: ${config.apiUrl}`);
  console.log(`AI Provider: ${config.providerType || 'google'}`);
  console.log('==================================================\n');

  // 初始化 AI Provider
  if (config.providerType) {
    setProviderType(config.providerType);
  }

  // 1. 获取剧本
  console.log('[1/4] 获取剧本...');
  const { content } = await fetchGame(config);

  // 2. 解析剧本
  console.log('[2/4] 解析剧本...');
  const parseResult = parse(content);
  if (!parseResult.success) {
    console.error('解析剧本失败:', parseResult.error);
    process.exit(1);
  }
  const game = parseResult.data;

  // 3. 分析缺少图片的场景
  console.log('[3/4] 分析缺少图片的场景...');
  const sceneInfos = findScenesWithoutImages(game);
  const scenesWithoutImages = sceneInfos.filter((s) => !s.hasImage);

  console.log(`  总场景数: ${sceneInfos.length}`);
  console.log(`  缺少图片: ${scenesWithoutImages.length}`);

  if (scenesWithoutImages.length === 0) {
    console.log('\n✅ 所有场景都已有图片，无需处理。');
    process.exit(0);
  }

  // 4. 调用 AI 生成 prompts
  console.log('\n[4/4] 调用 AI 生成图片 prompts...');
  const prompts = await generateImagePrompts(game, scenesWithoutImages);

  if (prompts.length === 0) {
    console.log('\n⚠️ AI 未生成任何 prompt，请检查配置或重试。');
    process.exit(1);
  }

  // 5. 插入节点到剧本
  console.log('\n[插入节点]');
  const enhancedGame = insertImageNodes(game, prompts);

  // 6. 保存到本地
  const outputDir = './output';
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = `${outputDir}/${config.gameSlug}-enhanced.md`;
  const enhancedContent = stringify(enhancedGame);
  writeFileSync(outputPath, enhancedContent, 'utf-8');

  console.log('\n==================================================');
  console.log(`✅ 已保存到: ${outputPath}`);
  console.log('');
  console.log('下一步:');
  console.log('  1. 请检查生成的 prompts');
  console.log(`  2. 确认后运行: pnpm batch --config ${configPath}`);
  console.log('==================================================');
}

main().catch((error) => {
  console.error('错误:', error.message);
  process.exit(1);
});
