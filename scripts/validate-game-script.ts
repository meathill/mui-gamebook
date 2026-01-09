#!/usr/bin/env npx tsx
/**
 * 游戏剧本 DSL 验证脚本
 * 检查 Markdown 文件中的 YAML 块是否能正确解析
 *
 * 用法: npx tsx scripts/validate-game-script.ts <path/to/script.md>
 */

import * as fs from 'fs';
import { parse as parseYaml } from 'yaml';

const BLOCK_TYPES = ['image-gen', 'audio-gen', 'minigame-gen', 'video-gen'];

interface ValidationError {
  line: number;
  blockType: string;
  message: string;
  content: string;
}

interface Block {
  type: string;
  content: string;
  startLine: number;
}

function extractBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];

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
        blockStartLine = i + 2; // 1-indexed, +1 for next line
        break;
      }
    }

    // Skip if we just started a block
    if (line.trim().startsWith('```') && BLOCK_TYPES.some((bt) => line.trim() === '```' + bt)) {
      continue;
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

function validateYaml(block: Block): ValidationError | null {
  try {
    parseYaml(block.content);
    return null;
  } catch (e: unknown) {
    const error = e as Error & { mark?: { line?: number } };
    // Extract line number from YAML error if available
    let errorLine = block.startLine;
    if (error.mark?.line) {
      errorLine = block.startLine + error.mark.line;
    }

    return {
      line: errorLine,
      blockType: block.type,
      message: error.message || 'Unknown YAML parsing error',
      content: block.content.substring(0, 200) + (block.content.length > 200 ? '...' : ''),
    };
  }
}

function validateScript(filePath: string): ValidationError[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const blocks = extractBlocks(content);
  const errors: ValidationError[] = [];

  console.log(`Found ${blocks.length} YAML blocks to validate...\n`);

  for (const block of blocks) {
    const error = validateYaml(block);
    if (error) {
      errors.push(error);
    }
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
  console.log('✅ All YAML blocks are valid!\n');
} else {
  console.log(`❌ Found ${yamlErrors.length} YAML parsing error(s):\n`);
  for (const error of yamlErrors) {
    console.log(`  Line ${error.line} [${error.blockType}]:`);
    console.log(`    ${error.message.split('\n')[0]}`);
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
const hasErrors =
  yamlErrors.length > 0 || structureIssues.some((i) => i.includes('Missing') || i.includes('not defined'));
process.exit(hasErrors ? 1 : 0);
