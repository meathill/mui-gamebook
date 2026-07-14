/**
 * 统一表达式语言的递归下降解析器（DSL_V2_DESIGN §4.1）。
 *
 * 优先级（低 → 高）：
 *   ,（仅条件入口顶层，= 最低优先级 AND）
 *   or  ||
 *   and  &&
 *   not  !
 *   ==  !=  >  <  >=  <=
 *   +  -
 *   *  /  %
 *   一元负号、( )
 *
 * 两个入口（逗号语义按上下文分流）：
 * - parseExpression：if / trigger / 条件文本，顶层 `,` 折叠为 AND
 * - parseStatementList：set，`,` 是赋值语句分隔符
 */
import { ExpressionError, type Token, tokenize } from './lexer';

export type BinaryOp = 'or' | 'and' | '==' | '!=' | '>' | '<' | '>=' | '<=' | '+' | '-' | '*' | '/' | '%';

export type ExprNode =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'identifier'; name: string }
  | { type: 'unary'; op: '!' | '-'; operand: ExprNode }
  | { type: 'binary'; op: BinaryOp; left: ExprNode; right: ExprNode };

export interface Assignment {
  key: string;
  value: ExprNode;
}

/** 递归深度上限：内容来自用户与 AI，防构造深层嵌套炸栈 */
const MAX_DEPTH = 32;

class Parser {
  private readonly tokens: Token[];
  private index = 0;
  private depth = 0;

  constructor(source: string) {
    this.tokens = tokenize(source);
  }

  private peek(): Token {
    return this.tokens[this.index];
  }

  private next(): Token {
    return this.tokens[this.index++];
  }

  private isOperator(value: string): boolean {
    const t = this.peek();
    return t.type === 'operator' && t.value === value;
  }

  private isKeyword(value: string): boolean {
    const t = this.peek();
    return t.type === 'keyword' && t.value === value;
  }

  private expectOperator(value: string): void {
    if (!this.isOperator(value)) {
      const t = this.peek();
      throw new ExpressionError(
        `Expected "${value}" but got "${t.value || 'end of input'}" at position ${t.pos}`,
        t.pos,
      );
    }
    this.next();
  }

  private enter(): void {
    this.depth++;
    if (this.depth > MAX_DEPTH) {
      throw new ExpressionError(`Expression nesting exceeds maximum depth of ${MAX_DEPTH}`, this.peek().pos);
    }
  }

  private leave(): void {
    this.depth--;
  }

  /** 条件入口：顶层逗号折叠为 AND（兼容存量 `(if: a, b)` 写法） */
  parseConditionEntry(): ExprNode {
    let node = this.parseOr();
    while (this.isOperator(',')) {
      this.next();
      node = { type: 'binary', op: 'and', left: node, right: this.parseOr() };
    }
    this.expectEof();
    return node;
  }

  /** 赋值列表入口：`key = expr, key2 = expr2`，逗号是语句分隔符 */
  parseStatementsEntry(): Assignment[] {
    const statements: Assignment[] = [];
    for (;;) {
      const keyToken = this.peek();
      if (keyToken.type !== 'identifier') {
        throw new ExpressionError(
          `Expected variable name but got "${keyToken.value || 'end of input'}" at position ${keyToken.pos}`,
          keyToken.pos,
        );
      }
      this.next();
      this.expectOperator('=');
      // 赋值右侧从 or 层开始（不含逗号折叠——逗号在这里是语句分隔符）
      statements.push({ key: keyToken.value, value: this.parseOr() });

      if (this.isOperator(',')) {
        this.next();
        continue;
      }
      break;
    }
    this.expectEof();
    return statements;
  }

  private expectEof(): void {
    const t = this.peek();
    if (t.type !== 'eof') {
      throw new ExpressionError(`Unexpected "${t.value}" at position ${t.pos}`, t.pos);
    }
  }

  private parseOr(): ExprNode {
    this.enter();
    let node = this.parseAnd();
    while (this.isOperator('||') || this.isKeyword('or')) {
      this.next();
      node = { type: 'binary', op: 'or', left: node, right: this.parseAnd() };
    }
    this.leave();
    return node;
  }

  private parseAnd(): ExprNode {
    this.enter();
    let node = this.parseNot();
    while (this.isOperator('&&') || this.isKeyword('and')) {
      this.next();
      node = { type: 'binary', op: 'and', left: node, right: this.parseNot() };
    }
    this.leave();
    return node;
  }

  private parseNot(): ExprNode {
    this.enter();
    try {
      if (this.isOperator('!') || this.isKeyword('not')) {
        this.next();
        return { type: 'unary', op: '!', operand: this.parseNot() };
      }
      return this.parseComparison();
    } finally {
      this.leave();
    }
  }

  private parseComparison(): ExprNode {
    this.enter();
    let node = this.parseAdditive();
    const t = this.peek();
    if (t.type === 'operator' && ['==', '!=', '>', '<', '>=', '<='].includes(t.value)) {
      this.next();
      node = { type: 'binary', op: t.value as BinaryOp, left: node, right: this.parseAdditive() };
    }
    this.leave();
    return node;
  }

  private parseAdditive(): ExprNode {
    this.enter();
    let node = this.parseMultiplicative();
    while (this.isOperator('+') || this.isOperator('-')) {
      const op = this.next().value as BinaryOp;
      node = { type: 'binary', op, left: node, right: this.parseMultiplicative() };
    }
    this.leave();
    return node;
  }

  private parseMultiplicative(): ExprNode {
    this.enter();
    let node = this.parseUnary();
    while (this.isOperator('*') || this.isOperator('/') || this.isOperator('%')) {
      const op = this.next().value as BinaryOp;
      node = { type: 'binary', op, left: node, right: this.parseUnary() };
    }
    this.leave();
    return node;
  }

  private parseUnary(): ExprNode {
    this.enter();
    try {
      if (this.isOperator('-')) {
        this.next();
        return { type: 'unary', op: '-', operand: this.parseUnary() };
      }
      return this.parsePrimary();
    } finally {
      this.leave();
    }
  }

  private parsePrimary(): ExprNode {
    const t = this.next();
    switch (t.type) {
      case 'number':
        return { type: 'number', value: Number(t.value) };
      case 'string':
        return { type: 'string', value: t.value };
      case 'identifier':
        return { type: 'identifier', name: t.value };
      case 'keyword':
        if (t.value === 'true') return { type: 'boolean', value: true };
        if (t.value === 'false') return { type: 'boolean', value: false };
        throw new ExpressionError(`Unexpected keyword "${t.value}" at position ${t.pos}`, t.pos);
      case 'operator':
        if (t.value === '(') {
          this.enter();
          // 括号内允许完整表达式（含逗号 AND）
          let node = this.parseOr();
          while (this.isOperator(',')) {
            this.next();
            node = { type: 'binary', op: 'and', left: node, right: this.parseOr() };
          }
          this.leave();
          this.expectOperator(')');
          return node;
        }
        throw new ExpressionError(`Unexpected "${t.value}" at position ${t.pos}`, t.pos);
      default:
        throw new ExpressionError(`Unexpected end of input at position ${t.pos}`, t.pos);
    }
  }
}

/** 解析条件表达式（if / trigger / {{if}} 条件文本） */
export function parseExpression(source: string): ExprNode {
  return new Parser(source).parseConditionEntry();
}

/** 解析赋值语句列表（set） */
export function parseStatementList(source: string): Assignment[] {
  return new Parser(source).parseStatementsEntry();
}
