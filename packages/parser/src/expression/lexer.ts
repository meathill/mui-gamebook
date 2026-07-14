/**
 * 统一表达式语言的词法分析器（DSL_V2_DESIGN §4.1）。
 * 供 (if:) / (set:) / trigger / {{if}} 条件文本四处共用。
 */

export type TokenType = 'number' | 'string' | 'identifier' | 'keyword' | 'operator' | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export class ExpressionError extends Error {
  readonly pos: number;

  constructor(message: string, pos: number) {
    super(message);
    this.name = 'ExpressionError';
    this.pos = pos;
  }
}

/** 关键字（大小写不敏感：LLM 作者常写 SQL 风格的 AND/OR，token 值归一为小写） */
const KEYWORDS = new Set(['or', 'and', 'not', 'true', 'false']);

/** 多字符运算符优先匹配 */
const TWO_CHAR_OPERATORS = new Set(['==', '!=', '>=', '<=', '&&', '||']);
const ONE_CHAR_OPERATORS = new Set(['>', '<', '+', '-', '*', '/', '%', '(', ')', ',', '=', '!']);

/** 标识符首字符：Unicode 字母或下划线（支持中文变量名，见设计 §4.1） */
const IDENT_START = /[\p{L}_]/u;
/** 标识符后续字符：Unicode 字母、数字或下划线 */
const IDENT_REST = /[\p{L}\p{N}_]/u;

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    // 跳过空白
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // 数字：整数或小数
    if (/[0-9]/.test(ch)) {
      const start = i;
      while (i < source.length && /[0-9]/.test(source[i])) i++;
      if (source[i] === '.' && /[0-9]/.test(source[i + 1] ?? '')) {
        i++;
        while (i < source.length && /[0-9]/.test(source[i])) i++;
      }
      tokens.push({ type: 'number', value: source.slice(start, i), pos: start });
      continue;
    }

    // 字符串：单/双引号包裹，不支持转义序列（与既有 getValue 行为一致）
    if (ch === '"' || ch === "'") {
      const start = i;
      const closing = source.indexOf(ch, i + 1);
      if (closing === -1) {
        throw new ExpressionError(`Unterminated string literal starting at position ${start}`, start);
      }
      tokens.push({ type: 'string', value: source.slice(i + 1, closing), pos: start });
      i = closing + 1;
      continue;
    }

    // 标识符 / 关键字
    if (IDENT_START.test(ch)) {
      const start = i;
      i++;
      while (i < source.length && IDENT_REST.test(source[i])) i++;
      const word = source.slice(start, i);
      const lower = word.toLowerCase();
      if (KEYWORDS.has(lower)) {
        tokens.push({ type: 'keyword', value: lower, pos: start });
      } else {
        tokens.push({ type: 'identifier', value: word, pos: start });
      }
      continue;
    }

    // 运算符：先试两字符再试单字符
    const two = source.slice(i, i + 2);
    if (TWO_CHAR_OPERATORS.has(two)) {
      tokens.push({ type: 'operator', value: two, pos: i });
      i += 2;
      continue;
    }
    if (ONE_CHAR_OPERATORS.has(ch)) {
      tokens.push({ type: 'operator', value: ch, pos: i });
      i++;
      continue;
    }

    throw new ExpressionError(`Unexpected character "${ch}" at position ${i}`, i);
  }

  tokens.push({ type: 'eof', value: '', pos: source.length });
  return tokens;
}
