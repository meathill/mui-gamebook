#!/usr/bin/env npx tsx
/**
 * 游戏剧本 DSL 验证脚本
 * 使用统一的 Parser 检查 Markdown 文件格式和逻辑完整性
 *
 * 用法: npx tsx scripts/validate-game-script.ts <path/to/script.md>
 */

import * as fs from 'fs';
import path from 'path';
import { parse } from '../packages/parser/src/index';
import type { Game, SceneNode } from '../packages/parser/src/types';

function validateGameLogic(game: Game, warnings: string[] = []): string[] {
  const issues: string[] = [...warnings];
  const sceneIds = new Set<string>(Object.keys(game.scenes));
  const referencedScenes = new Set<string>();

  // 1. Check Start Scene
  if (!game.scenes['start']) {
    issues.push('Missing required "# start" scene');
  }

  // 2. Iterate scenes to find references (choices)
  for (const [id, scene] of Object.entries(game.scenes)) {
    for (const node of scene.nodes) {
      if (node.type === 'choice') {
        referencedScenes.add(node.nextSceneId);
      }
    }
  }

  // 3. Check for undefined references
  for (const ref of referencedScenes) {
    if (!sceneIds.has(ref)) {
      issues.push(`Referenced scene "${ref}" is not defined`);
    }
  }

  // 4. Check for orphan scenes (except start)
  for (const sceneId of sceneIds) {
    if (sceneId !== 'start' && !referencedScenes.has(sceneId)) {
      issues.push(`Scene "${sceneId}" is defined but never referenced (orphan)`);
    }
  }

  return issues;
}

// Main
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: npx tsx scripts/validate-game-script.ts <path/to/script.md>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

console.log(`Validating: ${filePath}\n`);
console.log('='.repeat(60));

try {
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  console.log('🔄 Parsing with @mui-gamebook/parser...');
  const result = parse(fileContent);

  if (!result.success) {
    console.error('\n❌ Parser Error:');
    console.error(result.error);
    process.exit(1);
  }

  console.log('✅ Syntax is Valid!');
  console.log('='.repeat(60));

  const game = result.data as Game;
  // Assuming we might extend ParseResult to include warnings later, or we rely on parser logic.
  // Ideally duplicate warnings come from parser. For now we use what we have.
  const warnings = (result as any).warnings || [];

  console.log('\n🎬 Validating Game Logic...');
  const logicIssues = validateGameLogic(game, warnings);

  if (logicIssues.length === 0) {
    console.log('✅ Game logic is valid!\n');
  } else {
    console.log(`⚠️  Found ${logicIssues.length} logical issue(s):\n`);
    for (const issue of logicIssues) {
      console.log(`  - ${issue}`);
    }
    console.log();
  }

  // Statistics
  const sceneCount = Object.keys(game.scenes).length;
  console.log('='.repeat(60));
  console.log(`\n📊 Statistics:\n`);
  console.log(`  Title: ${game.title}`);
  console.log(`  Total scenes: ${sceneCount}`);

  let totalWords = 0;
  let totalChoices = 0;
  let aiImages = 0;

  for (const scene of Object.values(game.scenes)) {
    for (const node of scene.nodes) {
      if (node.type === 'text') totalWords += node.content.length;
      if (node.type === 'choice') {
        totalChoices++;
        totalWords += node.text.length;
      }
      if (node.type === 'ai_image') aiImages++;
    }
  }

  console.log(`  Total characters (approx): ${totalWords}`);
  console.log(`  Total choices: ${totalChoices}`);
  console.log(`  AI Images: ${aiImages}`);
  console.log(`  Estimated playtime: ${Math.round(totalWords / 300)} - ${Math.round(totalWords / 150)} minutes`); // Rough estimation based on reading speed
  console.log();

  const hasErrors = logicIssues.some((i) => i.includes('not defined') || i.includes('Missing'));
  process.exit(hasErrors ? 1 : 0);
} catch (e) {
  console.error('An unexpected error occurred:', e);
  process.exit(1);
}
