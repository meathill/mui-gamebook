#!/usr/bin/env node
/**
 * 检查剧本图片生成完整性脚本
 * 用法: pnpm check <剧本文件路径>
 *
 * 功能：检查剧本中所有 ai_image 节点是否都有 url
 */
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { parse } from '@mui-gamebook/parser';
import type { SceneNode } from '@mui-gamebook/parser';

interface CheckResult {
  sceneId: string;
  nodeIndex: number;
  prompt: string;
  hasUrl: boolean;
  url?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];

  if (!filePath) {
    console.error('用法: pnpm check <剧本文件路径>');
    console.error('');
    console.error('示例: pnpm check ./output/my-game-enhanced.md');
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.error(`文件不存在: ${filePath}`);
    process.exit(1);
  }

  // 读取并解析剧本
  const content = await readFile(filePath, 'utf-8');
  const parseResult = parse(content);

  if (!parseResult.success) {
    console.error('解析剧本失败:', parseResult.error);
    process.exit(1);
  }

  const game = parseResult.data;

  console.log('==================================================');
  console.log(`检查剧本: ${game.title || filePath}`);
  console.log('==================================================\n');

  // 收集所有 ai_image 节点
  const results: CheckResult[] = [];

  for (const scene of Object.values(game.scenes)) {
    scene.nodes.forEach((node: SceneNode, index: number) => {
      if (node.type === 'ai_image') {
        results.push({
          sceneId: scene.id,
          nodeIndex: index,
          prompt: node.prompt.substring(0, 50) + (node.prompt.length > 50 ? '...' : ''),
          hasUrl: !!node.url,
          url: node.url,
        });
      }
    });
  }

  if (results.length === 0) {
    console.log('⚠️ 未找到任何 ai_image 节点');
    process.exit(0);
  }

  // 统计
  const completed = results.filter((r) => r.hasUrl);
  const pending = results.filter((r) => !r.hasUrl);

  console.log(`📊 统计: ${completed.length}/${results.length} 已完成\n`);

  // 显示未完成的
  if (pending.length > 0) {
    console.log('❌ 未生成:');
    for (const r of pending) {
      console.log(`   - [${r.sceneId}] ${r.prompt}`);
    }
    console.log('');
  }

  // 显示已完成的
  if (completed.length > 0) {
    console.log('✅ 已生成:');
    for (const r of completed) {
      console.log(`   - [${r.sceneId}] ${r.prompt}`);
    }
    console.log('');
  }

  // 最终状态
  if (pending.length === 0) {
    console.log('==================================================');
    console.log('🎉 所有图片已生成完整！');
    console.log('==================================================');
  } else {
    console.log('==================================================');
    console.log(`⏳ 还有 ${pending.length} 个图片待生成`);
    console.log('==================================================');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('错误:', error.message);
  process.exit(1);
});
