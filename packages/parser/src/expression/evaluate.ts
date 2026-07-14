/**
 * 统一表达式语言的求值器（DSL_V2_DESIGN §4.1）。
 *
 * 语义决策（与设计文档一致，行为差异以 conformance 测试锁定）：
 * - `==`/`!=`：同类型严格比较；数字与「数字形字符串」比较时做数值提升
 *   （锁定旧引擎宽松 == 中真正被存量依赖的部分）
 * - 未定义变量：按 falsy 处理 + console.warn，不 throw——线上剧本不能崩，报错是 lint 的职责
 * - 算术仅对数字有效，操作数非数字时结果为 undefined（赋值层会跳过并告警）
 * - 不使用 eval / new Function
 */
import type { RuntimeState } from '../types';
import type { Assignment, ExprNode } from './parse';

export type Value = number | string | boolean | undefined;

function truthy(value: Value): boolean {
  return !!value;
}

function isNumericString(value: Value): value is string {
  return typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value));
}

/** `==` 语义：同类型严格 + 数字/数字形字符串提升 */
function looseEquals(a: Value, b: Value): boolean {
  if (typeof a === typeof b) return a === b;
  if (typeof a === 'number' && isNumericString(b)) return a === Number(b);
  if (typeof b === 'number' && isNumericString(a)) return Number(a) === b;
  return false;
}

function readVariable(name: string, state: RuntimeState): Value {
  if (Object.prototype.hasOwnProperty.call(state, name)) {
    return state[name];
  }
  console.warn(`Undefined variable "${name}" in expression, treated as falsy`);
  return undefined;
}

function arithmetic(op: '+' | '-' | '*' | '/' | '%', left: Value, right: Value): Value {
  if (typeof left !== 'number' || typeof right !== 'number') {
    console.warn(`Invalid arithmetic operands for "${op}": ${JSON.stringify(left)}, ${JSON.stringify(right)}`);
    return undefined;
  }
  switch (op) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return left / right;
    case '%':
      return left % right;
  }
}

export function evaluate(node: ExprNode, state: RuntimeState): Value {
  switch (node.type) {
    case 'number':
    case 'string':
    case 'boolean':
      return node.value;
    case 'identifier':
      return readVariable(node.name, state);
    case 'unary': {
      if (node.op === '!') return !truthy(evaluate(node.operand, state));
      const operand = evaluate(node.operand, state);
      if (typeof operand !== 'number') {
        console.warn(`Unary minus on non-number: ${JSON.stringify(operand)}`);
        return undefined;
      }
      return -operand;
    }
    case 'binary': {
      switch (node.op) {
        // 逻辑运算短路
        case 'or':
          return truthy(evaluate(node.left, state)) || truthy(evaluate(node.right, state));
        case 'and':
          return truthy(evaluate(node.left, state)) && truthy(evaluate(node.right, state));
        case '==':
          return looseEquals(evaluate(node.left, state), evaluate(node.right, state));
        case '!=':
          return !looseEquals(evaluate(node.left, state), evaluate(node.right, state));
        case '>':
        case '<':
        case '>=':
        case '<=': {
          // 与旧引擎保持一致：直接用 JS 关系运算语义（数字/字符串混合时按 JS 规则）
          const left = evaluate(node.left, state) as never;
          const right = evaluate(node.right, state) as never;
          if (node.op === '>') return left > right;
          if (node.op === '<') return left < right;
          if (node.op === '>=') return left >= right;
          return left <= right;
        }
        default:
          return arithmetic(node.op, evaluate(node.left, state), evaluate(node.right, state));
      }
    }
  }
}

/** 条件求值：任何值折叠为布尔 */
export function evaluateConditionAst(node: ExprNode, state: RuntimeState): boolean {
  return truthy(evaluate(node, state));
}

/** 执行赋值列表：逐条求值并写入（后面的语句能看到前面的结果）；值为 undefined 时跳过该条 */
export function executeAssignments(statements: Assignment[], state: RuntimeState): RuntimeState {
  const newState = { ...state };
  for (const stmt of statements) {
    const value = evaluate(stmt.value, newState);
    if (value !== undefined) {
      newState[stmt.key] = value;
    } else {
      console.warn(`Assignment to "${stmt.key}" skipped: expression evaluated to undefined`);
    }
  }
  return newState;
}
