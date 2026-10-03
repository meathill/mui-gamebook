import * as fs from 'fs';
import * as path from 'path';
import { parse, validateExpression, parseTemplate, type Game, type SceneNode } from '@roudanio/parser';
import { colors } from '../utils/colors';
import type { ValidationIssue, ValidationReport, ValidationStats } from '../types';

export interface ValidateOptions {
  strict?: boolean;
  json?: boolean;
}

/**
 * 计算剧情分支拓扑指标与最大深度
 */
function computeTopology(game: Game): {
  endingsCount: number;
  choicesCount: number;
  maxBranchDepth: number;
  inDegrees: Map<string, number>;
} {
  const inDegrees = new Map<string, number>();
  for (const id of Object.keys(game.scenes)) {
    inDegrees.set(id, 0);
  }

  let endingsCount = 0;
  let choicesCount = 0;

  for (const [sceneId, scene] of Object.entries(game.scenes)) {
    let hasOutgoing = false;
    for (const node of scene.nodes) {
      if (node.type === 'choice') {
        choicesCount++;
        hasOutgoing = true;
        inDegrees.set(node.nextSceneId, (inDegrees.get(node.nextSceneId) ?? 0) + 1);
      } else if (node.type === 'redirect') {
        hasOutgoing = true;
        inDegrees.set(node.nextSceneId, (inDegrees.get(node.nextSceneId) ?? 0) + 1);
      }
    }
    if (!hasOutgoing) {
      endingsCount++;
    }
  }

  // 计算从 start 出发的最长无环深度
  let maxBranchDepth = 0;
  const visited = new Set<string>();

  function dfs(curr: string, depth: number) {
    if (depth > maxBranchDepth) maxBranchDepth = depth;
    if (visited.has(curr) || depth > 200) return; // 环保护
    visited.add(curr);

    const scene = game.scenes[curr];
    if (scene) {
      for (const node of scene.nodes) {
        if (node.type === 'choice' || node.type === 'redirect') {
          dfs(node.nextSceneId, depth + 1);
        }
      }
    }
    visited.delete(curr);
  }

  if (game.scenes['start']) {
    dfs('start', 1);
  }

  return { endingsCount, choicesCount, maxBranchDepth, inDegrees };
}

/**
 * 执行剧本逻辑完整体验证
 */
export function validateScriptContent(content: string, filePath = 'input.md'): ValidationReport {
  const issues: ValidationIssue[] = [];

  const parseResult = parse(content);
  if (!parseResult.success) {
    const isMissingStart = parseResult.error?.includes("'start' scene");
    const errorIssue: ValidationIssue = {
      severity: 'error',
      code: isMissingStart ? 'MISSING_START' : 'PARSE_ERROR',
      message: parseResult.error || 'DSL 语法解析失败',
    };
    return {
      valid: false,
      filePath,
      issues: [errorIssue],
      errors: [errorIssue],
      warnings: [],
      stats: {
        scenesCount: 0,
        endingsCount: 0,
        variablesCount: 0,
        choicesCount: 0,
        maxBranchDepth: 0,
      },
    };
  }

  const game = parseResult.data;
  const sceneIds = new Set(Object.keys(game.scenes));

  // 收集所有有效变量
  const declaredVariables = new Set(Object.keys(game.initialState || {}));
  for (const scene of Object.values(game.scenes)) {
    for (const node of scene.nodes) {
      if (node.type === 'minigame' && node.variables) {
        for (const varName of Object.keys(node.variables)) {
          declaredVariables.add(varName);
        }
      }
    }
  }

  // 1. 首场景校验
  if (!game.scenes['start']) {
    issues.push({
      severity: 'error',
      code: 'MISSING_START',
      message: '缺失必需的首场景 "# start"（小写，严格匹配）',
    });
  }

  // 辅助：检查表达式
  function auditExpression(expr: string, mode: 'condition' | 'statements', context: string, sceneId: string) {
    const res = validateExpression(expr, mode);
    if (!res.ok) {
      issues.push({
        severity: 'error',
        sceneId,
        code: 'INVALID_EXPRESSION',
        message: `场景 "${sceneId}": ${context} 表达式语法错误: "${expr}" (${res.error})`,
      });
      return;
    }
    const referenced = new Set([...res.identifiers, ...(res.assignedKeys ?? [])]);
    for (const v of referenced) {
      if (!declaredVariables.has(v)) {
        issues.push({
          severity: 'error',
          sceneId,
          code: 'UNDECLARED_VARIABLE',
          message: `场景 "${sceneId}": 变量 "${v}" 在 ${context} 中使用，但未在 initialState 中声明`,
        });
      }
    }
  }

  // 2. 遍历场景节点做语法与引用排查
  for (const [sceneId, scene] of Object.entries(game.scenes)) {
    let hasChoices = false;
    let hasUnconditionalChoice = false;

    for (const node of scene.nodes) {
      if (node.type === 'choice') {
        hasChoices = true;
        if (!node.condition) {
          hasUnconditionalChoice = true;
        } else {
          auditExpression(node.condition, 'condition', '选项条件 (if:)', sceneId);
        }
        if (node.set) {
          auditExpression(node.set, 'statements', '选项赋值 (set:)', sceneId);
        }
        if (!sceneIds.has(node.nextSceneId)) {
          issues.push({
            severity: 'error',
            sceneId,
            code: 'DANGLING_TARGET',
            message: `场景 "${sceneId}": 选项指向了不存在的场景 "${node.nextSceneId}"`,
          });
        }
      } else if (node.type === 'redirect') {
        if (node.condition) {
          auditExpression(node.condition, 'condition', '重定向条件', sceneId);
        }
        if (!sceneIds.has(node.nextSceneId)) {
          issues.push({
            severity: 'error',
            sceneId,
            code: 'DANGLING_TARGET',
            message: `场景 "${sceneId}": 重定向指向了不存在的场景 "${node.nextSceneId}"`,
          });
        }
      } else if (node.type === 'dialogue') {
        const charId = (node as any).speaker || (node as any).character;
        if (charId && !game.ai?.characters?.[charId]) {
          issues.push({
            severity: 'warning',
            sceneId,
            code: 'UNREGISTERED_CHARACTER',
            message: `场景 "${sceneId}": 对白出现未在 ai.characters 中注册的角色 "@${charId}:"`,
          });
        }
        if (node.content.includes('{{')) {
          const tpl = parseTemplate(node.content);
          for (const diag of tpl.diagnostics) {
            issues.push({
              severity: 'error',
              sceneId,
              code: 'TEMPLATE_SYNTAX_ERROR',
              message: `场景 "${sceneId}": 动态模板语法错误 (${diag.code}) 在 "${node.content}"`,
            });
          }
        }
      } else if (node.type === 'text') {
        const lines = node.content.split('\n');
        for (const line of lines) {
          const charMatch = line.match(/^@([a-zA-Z0-9_\u4e00-\u9fa5]+)\s*(?:[(（][^)）]*[)）])?\s*[:：]/);
          if (charMatch) {
            const charId = charMatch[1];
            if (!game.ai?.characters?.[charId]) {
              issues.push({
                severity: 'warning',
                sceneId,
                code: 'UNREGISTERED_CHARACTER',
                message: `场景 "${sceneId}": 对白出现未在 ai.characters 中注册的角色 "@${charId}:"`,
              });
            }
          }
          if (line.includes('{{')) {
            const tpl = parseTemplate(line);
            for (const diag of tpl.diagnostics) {
              issues.push({
                severity: 'error',
                sceneId,
                code: 'TEMPLATE_SYNTAX_ERROR',
                message: `场景 "${sceneId}": 动态模板语法错误 (${diag.code}) 在 "${line}"`,
              });
            }
          }
        }
      }
    }

    // 死局防范：带选项的场景必须有至少一个无条件选项兜底
    if (hasChoices && !hasUnconditionalChoice) {
      issues.push({
        severity: 'error',
        sceneId,
        code: 'DEAD_END',
        message: `场景 "${sceneId}": 所有选项均带有 if 条件，缺少无条件选项兜底，可能导致玩家卡死`,
      });
    }
  }

  // 3. 计算拓扑与孤岛场景
  const { endingsCount, choicesCount, maxBranchDepth, inDegrees } = computeTopology(game);

  for (const [id, deg] of inDegrees.entries()) {
    if (id !== 'start' && deg === 0) {
      issues.push({
        severity: 'warning',
        sceneId: id,
        code: 'ORPHAN_SCENE',
        message: `场景 "${id}": 孤岛场景，没有被任何选项或重定向指向，玩家无法游玩到该剧情`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return {
    valid: errors.length === 0,
    filePath,
    gameTitle: game.title,
    issues,
    errors,
    warnings,
    stats: {
      scenesCount: sceneIds.size,
      endingsCount,
      variablesCount: declaredVariables.size,
      choicesCount,
      maxBranchDepth,
    },
  };
}

/**
 * 校验本地文件
 */
export function validateScriptFile(filePath: string, options: ValidateOptions = {}): ValidationReport {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    const errorIssue: ValidationIssue = {
      severity: 'error',
      code: 'FILE_NOT_FOUND',
      message: `文件不存在: ${filePath}`,
    };
    return {
      valid: false,
      filePath,
      issues: [errorIssue],
      errors: [errorIssue],
      warnings: [],
      stats: {
        scenesCount: 0,
        endingsCount: 0,
        variablesCount: 0,
        choicesCount: 0,
        maxBranchDepth: 0,
      },
    };
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  return validateScriptContent(content, filePath);
}

/**
 * 格式化输出终端报告
 */
export function formatReportText(report: ValidationReport): string {
  const lines: string[] = [];
  const title = report.gameTitle ? `《${report.gameTitle}》` : path.basename(report.filePath);

  lines.push('');
  lines.push(colors.bold(`📋 剧本逻辑健康诊断报告: ${colors.cyan(title)}`));
  lines.push(colors.dim(`文件路径: ${report.filePath}`));
  lines.push(colors.dim('─'.repeat(60)));

  if (report.errors.length > 0) {
    lines.push('');
    lines.push(colors.red(colors.bold(`🚨 阻断性错误 (${report.errors.length} 项) - 必须修复才能上线:`)));
    report.errors.forEach((e: ValidationIssue, idx: number) => {
      lines.push(`  ${colors.red(`${idx + 1}.`)} ${e.message}`);
    });
  }

  if (report.warnings.length > 0) {
    lines.push('');
    lines.push(colors.yellow(colors.bold(`⚠️ 体验性警告 (${report.warnings.length} 项) - 建议优化:`)));
    report.warnings.forEach((w: ValidationIssue, idx: number) => {
      lines.push(`  ${colors.yellow(`${idx + 1}.`)} ${w.message}`);
    });
  }

  if (report.errors.length === 0 && report.warnings.length === 0) {
    lines.push('');
    lines.push(colors.green(colors.bold('✨ 恭喜！未发现任何逻辑错误或卡关隐患，剧本质量优秀！')));
  }

  lines.push('');
  lines.push(colors.cyan(colors.bold('📊 剧本统计指标:')));
  lines.push(`  • 场景总数: ${colors.bold(report.stats.scenesCount)}`);
  lines.push(`  • 结局通路: ${colors.bold(report.stats.endingsCount)}`);
  lines.push(`  • 分支选项: ${colors.bold(report.stats.choicesCount)}`);
  lines.push(`  • 状态变量: ${colors.bold(report.stats.variablesCount)}`);
  lines.push(`  • 最长剧情分支深度: ${colors.bold(report.stats.maxBranchDepth)} 步`);
  lines.push(colors.dim('─'.repeat(60)));

  const statusText = report.valid
    ? colors.bgGreen(colors.white(colors.bold(' PASSED ')))
    : colors.bgRed(colors.white(colors.bold(' FAILED ')));

  lines.push(`最终评定: ${statusText} (错误: ${report.errors.length}, 警告: ${report.warnings.length})`);
  lines.push('');

  return lines.join('\n');
}
