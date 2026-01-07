#!/usr/bin/env npx tsx
/**
 * 游戏剧本 DSL 验证脚本
 * 检查 Markdown 文件中的 YAML 块是否能正确解析
 *
 * 用法: npx tsx scripts/validate-game-script.ts <path/to/script.md>
 */

import * as fs from 'fs';

const BLOCK_TYPES = ['image-gen', 'audio-gen', 'minigame-gen'];

interface ValidationError {
  line: number;
  blockType: string;
  message: string;
  content: string;
}

function extractBlocks(content: string): { type: string; content: string; startLine: number }[] {
  const lines = content.split('\n');
  const blocks: { type: string; content: string; startLine: number }[] = [];

  let inBlock = false;
  let currentBlockType = '';
  let currentBlockContent = '';
  let blockStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for block start
    for (const blockType of BLOCK_TYPES) {
      if (line.trim() === '```' + blockType) {
        inBlock = true;
        currentBlockType = blockType;
        currentBlockContent = '';
        blockStartLine = i + 1; // 1-indexed
        break;
      }
    }

    // Check for front matter
    if (i === 0 && line.trim() === '---') {
      inBlock = true;
      currentBlockType = 'frontmatter';
      currentBlockContent = '';
      blockStartLine = 1;
      continue;
    }

    // Check for block end
    if (inBlock) {
      if (line.trim() === '```' || (currentBlockType === 'frontmatter' && line.trim() === '---' && i > 0)) {
        blocks.push({
          type: currentBlockType,
          content: currentBlockContent,
          startLine: blockStartLine,
        });
        inBlock = false;
        currentBlockType = '';
        currentBlockContent = '';
      } else if (currentBlockType !== 'frontmatter' || i > 0) {
        currentBlockContent += line + '\n';
      }
    }
  }

  return blocks;
}

/**
 * 简单的 YAML 语法检查（不依赖外部库）
 */
function validateYamlSimple(content: string, blockType: string, startLine: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = startLine + i + 1;

    // 检查未转义的特殊字符
    // 1. 值中的引号不匹配
    const colonMatch = line.match(/^(\s*)(\w+):\s*(.+)$/);
    if (colonMatch) {
      const value = colonMatch[3];

      // 检查未闭合的引号
      const doubleQuotes = (value.match(/"/g) || []).length;
      if (doubleQuotes % 2 !== 0) {
        errors.push({
          line: lineNum,
          blockType,
          message: 'Unbalanced double quotes in value',
          content: line,
        });
      }

      // 检查值中包含特殊 YAML 字符（需要引号包裹）
      if (!value.startsWith('"') && !value.startsWith("'") && !value.startsWith('|') && !value.startsWith('>')) {
        if (value.includes(': ') || value.includes(' #')) {
          errors.push({
            line: lineNum,
            blockType,
            message: 'Value contains special characters (: or #) - should be quoted',
            content: line,
          });
        }
        // 检查 > 符号（在非引号值中）
        if (/[^=!<]>/.test(value)) {
          errors.push({
            line: lineNum,
            blockType,
            message: 'Value contains ">" character - may cause YAML parsing issues',
            content: line,
          });
        }
      }
    }

    // 检查缩进问题
    if (i > 0 && line.trim() && !line.startsWith(' ') && !line.startsWith('-') && !line.match(/^\w+:/)) {
      // 可疑的缩进
    }
  }

  return errors;
}

function validateScript(filePath: string): ValidationError[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const blocks = extractBlocks(content);
  const errors: ValidationError[] = [];

  console.log(`Found ${blocks.length} YAML blocks to validate...\n`);

  for (const block of blocks) {
    const blockErrors = validateYamlSimple(block.content, block.type, block.startLine);
    errors.push(...blockErrors);
  }

  return errors;
}

function validateSceneStructure(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues: string[] = [];

  const sceneIds = new Set<string>();
  const referencedScenes = new Set<string>();
  let hasStart = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find scene definitions
    const sceneMatch = line.match(/^# (\w+)$/);
    if (sceneMatch) {
      const sceneId = sceneMatch[1];
      if (sceneIds.has(sceneId)) {
        issues.push(`Line ${i + 1}: Duplicate scene ID "${sceneId}"`);
      }
      sceneIds.add(sceneId);
      if (sceneId === 'start') hasStart = true;
    }

    // Find scene references in options
    const optionMatches = line.matchAll(/-> (\w+)/g);
    for (const match of optionMatches) {
      referencedScenes.add(match[1]);
    }
  }

  if (!hasStart) {
    issues.push('Missing required "# start" scene');
  }

  // Check for undefined references
  for (const ref of referencedScenes) {
    if (!sceneIds.has(ref)) {
      issues.push(`Referenced scene "${ref}" is not defined`);
    }
  }

  // Check for orphan scenes (except start)
  for (const scene of sceneIds) {
    if (scene !== 'start' && !referencedScenes.has(scene)) {
      issues.push(`Scene "${scene}" is defined but never referenced (orphan)`);
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

// Validate YAML blocks
console.log('\n📋 YAML Block Validation\n');
const yamlErrors = validateScript(filePath);

if (yamlErrors.length === 0) {
  console.log('✅ All YAML blocks look valid!\n');
} else {
  console.log(`⚠️  Found ${yamlErrors.length} potential issue(s):\n`);
  for (const error of yamlErrors) {
    console.log(`  Line ${error.line} [${error.blockType}]:`);
    console.log(`    ${error.message}`);
    console.log(`    Content: ${error.content.substring(0, 80)}...`);
    console.log();
  }
}

// Validate scene structure
console.log('='.repeat(60));
console.log('\n🎬 Scene Structure Validation\n');
const structureIssues = validateSceneStructure(filePath);

if (structureIssues.length === 0) {
  console.log('✅ Scene structure is valid!\n');
} else {
  console.log(`⚠️  Found ${structureIssues.length} structural issue(s):\n`);
  for (const issue of structureIssues) {
    console.log(`  - ${issue}`);
  }
  console.log();
}

// Count scenes
const content = fs.readFileSync(filePath, 'utf-8');
const sceneCount = (content.match(/^# \w+$/gm) || []).length;
console.log('='.repeat(60));
console.log(`\n📊 Statistics:\n`);
console.log(`  Total scenes: ${sceneCount}`);
console.log(`  Estimated playtime: ${Math.round(sceneCount * 1.5)} - ${Math.round(sceneCount * 2.5)} minutes`);
console.log();

// Exit code
const hasErrors = yamlErrors.length > 0 || structureIssues.some(i => i.includes('Missing') || i.includes('not defined'));
process.exit(hasErrors ? 1 : 0);
