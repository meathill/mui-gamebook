import type { RuntimeState } from '@mui-gamebook/parser/src/types';

/**
 * Evaluates a condition string against the current game state.
 * Supports:
 * - Comparisons: ==, !=, >, <, >=, <=
 * - Boolean logic: true, false
 * - Variables from gameState
 * - Numbers and Strings
 *
 * Examples:
 * - "gold >= 10"
 * - "has_key == true"
 * - "name == 'Hero'"
 */
export function evaluateCondition(condition: string | undefined, state: RuntimeState): boolean {
  if (!condition) return true;

  // Simple parser for "A op B"
  // This regex splits by operators but keeps them in the result
  const parts = condition.split(/(\s*==\s*|\s*!=\s*|\s*>=\s*|\s*<=\s*|\s*>\s*|\s*<\s*)/).map(p => p.trim()).filter(p => p);

  if (parts.length === 1) {
    // Boolean variable check e.g. "has_key"
    const val = getValue(parts[ 0 ], state);
    return !!val;
  }

  if (parts.length === 3) {
    const [leftRaw, op, rightRaw] = parts;
    const left = getValue(leftRaw, state);
    const right = getValue(rightRaw, state);

    switch (op) {
      case '==': return left == right;
      case '!=': return left != right;
      case '>': return (left as number) > (right as number);
      case '<': return (left as number) < (right as number);
      case '>=': return (left as number) >= (right as number);
      case '<=': return (left as number) <= (right as number);
    }
  }

  console.warn(`Unsupported condition format: ${condition}`);
  return false;
}

/**
 * Updates the game state based on a set instruction.
 * Supports:
 * - Assignment: key = value
 * - Arithmetic: key = key + value, key = key - value
 * - Boolean toggle: key = !key (simple version: key = false)
 *
 * Examples:
 * - "gold = gold - 10"
 * - "has_key = true"
 * - "count = 1"
 */
export function executeSet(instruction: string | undefined, state: RuntimeState): RuntimeState {
  if (!instruction) return state;

  const newState = { ...state };

  // Handle multiple instructions separated by comma
  const statements = instruction.split(',').map(s => s.trim());

  for (const stmt of statements) {
    const parts = stmt.split(/\s*=\s*/);
    if (parts.length !== 2) {
      console.warn(`Invalid set statement: ${stmt}`);
      continue;
    }

    const key = parts[ 0 ];
    const expression = parts[ 1 ];

    // Check for simple arithmetic: "key +/- value" or "val1 +/- val2"
    // This regex captures: (operand1) (operator) (operand2)
    const mathMatch = expression.match(/^(.+?)\s*([\+\-])\s*(.+)$/);

    if (mathMatch) {
      const [, op1Raw, operator, op2Raw] = mathMatch;
      const op1 = getValue(op1Raw, newState) as number;
      const op2 = getValue(op2Raw, newState) as number;

      if (typeof op1 === 'number' && typeof op2 === 'number') {
        newState[ key ] = operator === '+' ? op1 + op2 : op1 - op2;
      } else {
        console.warn(`Invalid arithmetic operands in: ${stmt}`);
      }
    } else {
      // Direct assignment
      const val = getValue(expression, newState);
      if (val !== undefined) {
        newState[ key ] = val;
      }
    }
  }

  return newState;
}

function getValue(token: string, state: RuntimeState): boolean | number | string | undefined {
  // Boolean literals
  if (token === 'true') return true;
  if (token === 'false') return false;

  // Number literals
  if (!isNaN(Number(token))) return Number(token);

  // String literals (start/end with ' or ")
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith('\'') && token.endsWith('\''))) {
    return token.slice(1, -1);
  }

  // Variable lookup
  if (Object.prototype.hasOwnProperty.call(state, token)) {
    return state[ token ];
  }

  // Undefined variable treats as 0 if strictly numeric context needed, or null?
  // For now, return null or 0 depending on usage, or just undefined.
  // Let's default to undefined, but maybe 0 for math?
  // Better: undefined.
  return undefined;
}

/**
 * 在文本中插值变量。
 * 支持 {{变量名}} 语法，将其替换为变量的当前值。
 *
 * 示例:
 * - "你现在有 {{gold}} 金币" -> "你现在有 100 金币"
 * - "{{player_name}}，欢迎回来！" -> "勇者，欢迎回来！"
 */
export function interpolateVariables(text: string, state: RuntimeState): string {
  if (!text) return text;
  
  // 匹配 {{变量名}} 格式，变量名可以包含字母、数字、下划线
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (Object.prototype.hasOwnProperty.call(state, varName)) {
      const value = state[ varName ];
      return String(value);
    }
    // 如果变量不存在，保留原始文本
    return match;
  });
}
