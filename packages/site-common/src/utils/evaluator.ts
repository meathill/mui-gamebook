import type { RuntimeState } from '@mui-gamebook/parser/src/types';

/**
 * 评估条件字符串
 * 支持: ==, !=, >, <, >=, <= 以及布尔值
 * 支持多条件 AND 逻辑（使用逗号或 && 分隔）
 */
export function evaluateCondition(condition: string | undefined, state: RuntimeState): boolean {
  if (!condition) return true;

  // 处理多条件（AND 逻辑）
  // 支持逗号和 && 分隔
  const subConditions = condition
    .split(/,|&&/)
    .map((s) => s.trim())
    .filter((s) => s);
  if (subConditions.length > 1) {
    return subConditions.every((sub) => evaluateCondition(sub, state));
  }

  const parts = condition
    .split(/(\s*==\s*|\s*!=\s*|\s*>=\s*|\s*<=\s*|\s*>\s*|\s*<\s*)/)
    .map((p) => p.trim())
    .filter((p) => p);

  if (parts.length === 1) {
    const val = getValue(parts[0], state);
    return !!val;
  }

  if (parts.length === 3) {
    const [leftRaw, op, rightRaw] = parts;
    const left = getValue(leftRaw, state);
    const right = getValue(rightRaw, state);

    switch (op) {
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '>':
        return (left as number) > (right as number);
      case '<':
        return (left as number) < (right as number);
      case '>=':
        return (left as number) >= (right as number);
      case '<=':
        return (left as number) <= (right as number);
    }
  }

  console.warn(`Unsupported condition format: ${condition}`);
  return false;
}

/**
 * 执行变量设置指令
 * 支持赋值和简单算术运算
 */
export function executeSet(instruction: string | undefined, state: RuntimeState): RuntimeState {
  if (!instruction) return state;

  const newState = { ...state };
  const statements = instruction.split(',').map((s) => s.trim());

  for (const stmt of statements) {
    const parts = stmt.split(/\s*=\s*/);
    if (parts.length !== 2) {
      console.warn(`Invalid set statement: ${stmt}`);
      continue;
    }

    const key = parts[0];
    const expression = parts[1];
    const mathMatch = expression.match(/^(.+?)\s*([\+\-])\s*(.+)$/);

    if (mathMatch) {
      const [, op1Raw, operator, op2Raw] = mathMatch;
      const op1 = getValue(op1Raw, newState) as number;
      const op2 = getValue(op2Raw, newState) as number;

      if (typeof op1 === 'number' && typeof op2 === 'number') {
        newState[key] = operator === '+' ? op1 + op2 : op1 - op2;
      } else {
        console.warn(`Invalid arithmetic operands in: ${stmt}`);
      }
    } else {
      const val = getValue(expression, newState);
      if (val !== undefined) {
        newState[key] = val;
      }
    }
  }

  return newState;
}

function getValue(token: string, state: RuntimeState): boolean | number | string | undefined {
  if (token === 'true') return true;
  if (token === 'false') return false;
  if (!isNaN(Number(token))) return Number(token);

  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    return token.slice(1, -1);
  }

  if (Object.prototype.hasOwnProperty.call(state, token)) {
    return state[token];
  }

  return undefined;
}

/**
 * 在文本中插值变量
 * 支持 {{变量名}} 语法
 */
export function interpolateVariables(text: string, state: RuntimeState): string {
  if (!text) return text;

  let processed = text;

  // 1. Handle conditionals: {{ if condition }} ... {{ else }} ... {{ /if }}
  // RegExp matches:
  // Group 1: condition string
  // Group 2: content for TRUE
  // Group 3: content for FALSE (optional, inside {{ else }} block)
  const ifRegex = /{{\s*if\s+(.+?)\s*}}([\s\S]*?)(?:{{\s*else\s*}}([\s\S]*?))?{{\s*\/if\s*}}/gi;

  if (processed.match(ifRegex)) {
    processed = processed.replace(ifRegex, (match, condition, trueBlock, falseBlock) => {
      const isTrue = evaluateCondition(condition, state);
      return isTrue ? trueBlock : (falseBlock || '');
    });
  }

  // 2. Handle variable interpolation: {{varName}}
  return processed.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (Object.prototype.hasOwnProperty.call(state, varName)) {
      const value = state[varName];
      return String(value);
    }
    return match;
  });
}
