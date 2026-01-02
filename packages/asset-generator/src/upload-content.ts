#!/usr/bin/env node
/**
 * 上传增强后的剧本到服务器
 * 用法: pnpm upload --config <配置文件路径>
 *
 * 功能：
 * 1. 读取 output 目录下增强后的剧本
 * 2. 上传到服务器更新数据库
 */
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { parse } from '@mui-gamebook/parser';

/**
 * 配置文件类型
 */
interface UploadConfig {
  apiUrl: string;
  adminSecret: string;
  gameSlug: string;
}

/**
 * 更新剧本到 API
 */
async function updateGame(config: UploadConfig, content: string): Promise<void> {
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

  if (configIndex === -1 || !args[configIndex + 1]) {
    console.error('用法: pnpm upload --config <配置文件路径>');
    console.error('');
    console.error('示例: pnpm upload --config ./configs/corlenka.my.json');
    process.exit(1);
  }

  const configPath = args[configIndex + 1];

  if (!existsSync(configPath)) {
    console.error(`配置文件不存在: ${configPath}`);
    process.exit(1);
  }

  // 读取配置
  const configContent = await readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent) as UploadConfig;

  // 查找增强后的剧本文件
  const outputPath = `./output/${config.gameSlug}-enhanced.md`;

  if (!existsSync(outputPath)) {
    console.error(`增强剧本不存在: ${outputPath}`);
    console.error('');
    console.error('请先运行: pnpm enhance --config ' + configPath);
    process.exit(1);
  }

  console.log('==================================================');
  console.log(`上传剧本: ${config.gameSlug}`);
  console.log(`API: ${config.apiUrl}`);
  console.log(`文件: ${outputPath}`);
  console.log('==================================================\n');

  // 读取增强后的剧本
  const content = await readFile(outputPath, 'utf-8');

  // 验证剧本格式
  const parseResult = parse(content);
  if (!parseResult.success) {
    console.error('剧本格式错误:', parseResult.error);
    process.exit(1);
  }

  console.log(`剧本: ${parseResult.data.title}`);
  console.log(`场景数: ${Object.keys(parseResult.data.scenes).length}`);
  console.log('');

  // 上传
  console.log('正在上传...');
  await updateGame(config, content);

  console.log('');
  console.log('==================================================');
  console.log('✅ 上传成功！');
  console.log('');
  console.log('下一步:');
  console.log(`  pnpm batch --config ${configPath}`);
  console.log('==================================================');
}

main().catch((error) => {
  console.error('错误:', error.message);
  process.exit(1);
});
