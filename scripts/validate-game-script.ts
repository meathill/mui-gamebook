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

export function validateGameLogic(game: Game, warnings: string[] = []): string[] {
  const issues: string[] = [...warnings];
  const sceneIds = new Set<string>(Object.keys(game.scenes));
  const referencedScenes = new Set<string>();

  // 收集所有已声明的变量名
  const declaredVariables = new Set<string>(Object.keys(game.initialState));

  // 提取变量名的辅助函数
  function extractVariablesFromExpression(expr: string): string[] {
    // 匹配变量名（字母或下划线开头，后跟字母、数字或下划线）
    // 排除数字、布尔值和运算符
    const tokens = expr.split(/[\s,=<>!+\-*/&|()]+/).filter(Boolean);
    const variables: string[] = [];
    // 逻辑运算符关键字
    const keywords = new Set(['true', 'false', 'and', 'or', 'not']);
    for (const token of tokens) {
      // 跳过数字
      if (/^\d/.test(token)) continue;
      // 跳过关键字
      if (keywords.has(token.toLowerCase())) continue;
      // 跳过字符串字面量
      if (/^['"]/.test(token)) continue;
      // 这是一个变量名（Unicode 标识符，支持中文变量名）
      if (/^[\p{L}_][\p{L}\p{N}_]*$/u.test(token)) {
        variables.push(token);
      }
    }
    return variables;
  }

  // 检测运行时不支持的算术运算符：executeSet 每条赋值只支持单次 +/-，
  // evaluateCondition 完全不支持算术（DSL_V2_DESIGN §2.4）——校验器必须与运行时能力对齐
  function checkUnsupportedOperators(expr: string, context: string, sceneId: string) {
    // 先剔除字符串字面量，避免把文本内容里的符号误报
    const stripped = expr.replace(/"[^"]*"|'[^']*'/g, '""');
    const op = stripped.match(/[*/%]/);
    if (op) {
      issues.push(
        `Scene "${sceneId}": Unsupported operator "${op[0]}" in ${context} (runtime only supports a single + or - per assignment): "${expr}"`,
      );
    }
  }

  // 检测嵌套的 {{ if }} 条件块：运行时是单趟非递归正则，嵌套会把裸模板标签渲染给玩家
  function hasNestedConditionBlocks(content: string): boolean {
    const tokenRegex = /\{\{\s*if\s+[^}]*\}\}|\{\{\s*\/if\s*\}\}/g;
    let depth = 0;
    for (const match of content.matchAll(tokenRegex)) {
      if (/^\{\{\s*\/if/.test(match[0])) {
        depth = Math.max(0, depth - 1);
      } else {
        if (depth > 0) return true;
        depth++;
      }
    }
    return false;
  }

  // 1. Check Start Scene
  if (!game.scenes['start']) {
    issues.push('Missing required "# start" scene');
  }

  // 2. Collect references from choices and validate variable usage
  for (const [sceneId, scene] of Object.entries(game.scenes)) {
    for (const node of scene.nodes) {
      if (node.type === 'choice') {
        referencedScenes.add(node.nextSceneId);

        // 检查 (set:) 中的变量
        if (node.set) {
          const vars = extractVariablesFromExpression(node.set);
          for (const v of vars) {
            if (!declaredVariables.has(v)) {
              issues.push(`Scene "${sceneId}": Variable "${v}" used in (set:) but not declared in state`);
            }
          }
          checkUnsupportedOperators(node.set, '(set:)', sceneId);
        }

        // 检查 (if:) 中的变量
        if (node.condition) {
          const vars = extractVariablesFromExpression(node.condition);
          for (const v of vars) {
            if (!declaredVariables.has(v)) {
              issues.push(`Scene "${sceneId}": Variable "${v}" used in (if:) condition but not declared in state`);
            }
          }
          checkUnsupportedOperators(node.condition, '(if:)', sceneId);
        }
      }

      // Check for redirect nodes (text starting with "-> ")
      if (node.type === 'text') {
        // Handle both normal underscores and escaped underscores (\_)
        const redirectMatch = node.content.match(/^->\s*([a-z_\\][a-z0-9_\\]*)/i);
        if (redirectMatch) {
          // Remove backslash escapes from scene ID
          const sceneIdRef = redirectMatch[1].replace(/\\/g, '');
          referencedScenes.add(sceneIdRef);
        }

        // 检查 {{ variable }} 插值中的变量
        const interpolationMatches = node.content.matchAll(/\{\{\s*([\p{L}_][\p{L}\p{N}_]*)\s*\}\}/gu);
        for (const match of interpolationMatches) {
          const varName = match[1];
          // 跳过条件语法的关键字
          if (varName === 'if' || varName === 'else') continue;
          if (!declaredVariables.has(varName)) {
            issues.push(
              `Scene "${sceneId}": Variable "${varName}" used in {{}} interpolation but not declared in state`,
            );
          }
        }

        // 检查 {{ if condition }} 条件块中的变量
        const conditionBlockMatches = node.content.matchAll(/\{\{\s*if\s+(.+?)\s*\}\}/g);
        for (const match of conditionBlockMatches) {
          const conditionExpr = match[1];
          const vars = extractVariablesFromExpression(conditionExpr);
          for (const v of vars) {
            if (!declaredVariables.has(v)) {
              issues.push(`Scene "${sceneId}": Variable "${v}" used in {{ if }} condition but not declared in state`);
            }
          }
          checkUnsupportedOperators(conditionExpr, '{{ if }} condition', sceneId);
        }

        // 检查嵌套 {{ if }} 条件块
        if (hasNestedConditionBlocks(node.content)) {
          issues.push(
            `Scene "${sceneId}": Nested {{ if }} blocks are not supported by the runtime and will render raw template tags to players`,
          );
        }
      }
    }
  }

  // 3. Collect references from variable triggers
  for (const [varName, varValue] of Object.entries(game.initialState)) {
    if (typeof varValue === 'object' && varValue !== null && 'trigger' in varValue) {
      const trigger = (varValue as any).trigger;
      if (trigger && trigger.scene) {
        referencedScenes.add(trigger.scene);
      }
    }
  }

  // 4. Check for undefined references
  for (const ref of referencedScenes) {
    if (!sceneIds.has(ref)) {
      issues.push(`Referenced scene "${ref}" is not defined`);
    }
  }

  // 5. Check for orphan scenes (except start)
  for (const sceneId of sceneIds) {
    if (sceneId !== 'start' && !referencedScenes.has(sceneId)) {
      issues.push(`Scene "${sceneId}" is defined but never referenced (orphan)`);
    }
  }

  return issues;
}

// Main - 只有直接运行脚本时才执行
function main() {
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

    const game = (result as any).data as Game;
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

    const hasErrors = logicIssues.some(
      (i) =>
        i.includes('not defined') ||
        i.includes('Missing') ||
        i.includes('Unsupported operator') ||
        i.includes('Nested {{ if }}'),
    );
    process.exit(hasErrors ? 1 : 0);
  } catch (e) {
    console.error('An unexpected error occurred:', e);
    process.exit(1);
  }
}

// 检测是否为直接运行（而非被导入）
const isDirectRun =
  process.argv[1]?.endsWith('validate-game-script.ts') || process.argv[1]?.includes('validate-game-script');
if (isDirectRun) {
  main();
}
