/**
 * 统一表达式语言门面（DSL_V2_DESIGN §4.1）。
 * (if:) / (set:) / trigger / {{if}} 条件文本四处共用同一实现，
 * 校验器（lint）与运行时同源，消灭「校验通过但运行时坏」。
 *
 * 运行时入口不抛异常：解析失败时告警并回退（条件为 false、赋值不生效），
 * 线上剧本不能崩；结构性报错是 validateExpression（lint 层）的职责。
 */
import type { RuntimeState } from '../types';
import { ExpressionError } from './lexer';
import { evaluateConditionAst, executeAssignments } from './evaluate';
import { type Assignment, type ExprNode, parseExpression, parseStatementList } from './parse';

export { ExpressionError } from './lexer';
export { evaluate, evaluateConditionAst, executeAssignments, type Value } from './evaluate';
export { type Assignment, type BinaryOp, type ExprNode, parseExpression, parseStatementList } from './parse';

/** 解析结果缓存：条目数超限时整体清空（游戏内表达式数量有限，够用且实现简单） */
const MAX_CACHE_SIZE = 1000;
const conditionCache = new Map<string, ExprNode | ExpressionError>();
const statementCache = new Map<string, Assignment[] | ExpressionError>();

function cached<T>(cache: Map<string, T | ExpressionError>, source: string, parse: (s: string) => T): T {
  let entry = cache.get(source);
  if (entry === undefined) {
    if (cache.size >= MAX_CACHE_SIZE) cache.clear();
    try {
      entry = parse(source);
    } catch (e) {
      entry = e instanceof ExpressionError ? e : new ExpressionError(String(e), 0);
    }
    cache.set(source, entry);
  }
  if (entry instanceof ExpressionError) throw entry;
  return entry;
}

/**
 * 求值条件表达式。空条件视为 true（与旧引擎一致）；解析失败告警并返回 false。
 */
export function evaluateCondition(condition: string | undefined, state: RuntimeState): boolean {
  if (!condition || !condition.trim()) return true;
  try {
    return evaluateConditionAst(cached(conditionCache, condition, parseExpression), state);
  } catch (e) {
    console.warn(`Unsupported condition format: ${condition} (${(e as Error).message})`);
    return false;
  }
}

/**
 * 执行赋值指令。解析失败告警并原样返回 state。
 */
export function executeSet(instruction: string | undefined, state: RuntimeState): RuntimeState {
  if (!instruction || !instruction.trim()) return state;
  try {
    return executeAssignments(cached(statementCache, instruction, parseStatementList), state);
  } catch (e) {
    console.warn(`Invalid set statement: ${instruction} (${(e as Error).message})`);
    return state;
  }
}

/**
 * trigger 条件归一：旧前缀式（如 `<= 0`、`== true`）补全 LHS 为变量名，
 * 归一后可直接用 evaluateCondition(expr, state) 求值——
 * 取代旧运行时「把当前值拼进字符串再求值」的做法（对字符串变量失效）。
 */
export function normalizeTriggerCondition(condition: string, variableName: string): string {
  const trimmed = condition.trim();
  if (/^(==|!=|>=|<=|>|<)/.test(trimmed)) {
    return `${variableName} ${trimmed}`;
  }
  return trimmed;
}

export interface ExpressionValidation {
  ok: boolean;
  /** 表达式中引用的全部变量名（去重，供未声明变量检查） */
  identifiers: string[];
  /** 解析失败时的错误信息 */
  error?: string;
  /** set 模式下被赋值的变量名 */
  assignedKeys?: string[];
}

function collectIdentifiers(node: ExprNode, into: Set<string>): void {
  switch (node.type) {
    case 'identifier':
      into.add(node.name);
      break;
    case 'unary':
      collectIdentifiers(node.operand, into);
      break;
    case 'binary':
      collectIdentifiers(node.left, into);
      collectIdentifiers(node.right, into);
      break;
    default:
      break;
  }
}

/**
 * 静态校验表达式（lint 层入口）：语法是否合法 + 引用了哪些变量。
 * 与运行时同一文法实现，杜绝「校验器接受、运行时不认」。
 */
export function validateExpression(source: string, mode: 'condition' | 'statements'): ExpressionValidation {
  const identifiers = new Set<string>();
  try {
    if (mode === 'condition') {
      collectIdentifiers(parseExpression(source), identifiers);
      return { ok: true, identifiers: [...identifiers] };
    }
    const statements = parseStatementList(source);
    for (const stmt of statements) {
      collectIdentifiers(stmt.value, identifiers);
    }
    return {
      ok: true,
      identifiers: [...identifiers],
      assignedKeys: statements.map((s) => s.key),
    };
  } catch (e) {
    return { ok: false, identifiers: [...identifiers], error: (e as Error).message };
  }
}
