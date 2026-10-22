import { parseExpression, parseStatementList, type Assignment, type ExprNode } from './parse';

const PRECEDENCE = {
  or: 1,
  and: 2,
  '==': 4,
  '!=': 4,
  '>': 4,
  '<': 4,
  '>=': 4,
  '<=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
};

function precedence(node: ExprNode): number {
  if (node.type === 'binary') return PRECEDENCE[node.op];
  if (node.type === 'unary') return node.op === '!' ? 3 : 7;
  return 8;
}

function numberToText(value: number): string {
  if (!Number.isFinite(value)) throw new Error('请输入有限数字');
  const text = String(value);
  if (!/[eE]/.test(text)) return text;
  const [coefficient, exponent] = text.split('e');
  const sign = coefficient.startsWith('-') ? '-' : '';
  const unsigned = coefficient.replace('-', '');
  const digits = unsigned.replace('.', '');
  const point = (unsigned.indexOf('.') < 0 ? unsigned.length : unsigned.indexOf('.')) + Number(exponent);
  return (
    sign +
    (point <= 0
      ? '0.' + '0'.repeat(-point) + digits
      : point >= digits.length
        ? digits + '0'.repeat(point - digits.length)
        : digits.slice(0, point) + '.' + digits.slice(point))
  );
}

function print(node: ExprNode): string {
  switch (node.type) {
    case 'identifier':
      if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(node.name) || /^(or|and|not|true|false)$/i.test(node.name))
        throw new Error('变量名称不能包含特殊字符或使用 DSL 关键字');
      return node.name;
    case 'number':
      return numberToText(node.value);
    case 'boolean':
      return String(node.value);
    case 'string': {
      const quote = node.value.includes('"') ? "'" : '"';
      if (node.value.includes(quote) || /[\r\n]/.test(node.value))
        throw new Error('当前 DSL 字符串不能同时包含两种引号或换行');
      return quote + node.value + quote;
    }
    case 'unary': {
      const text = print(node.operand);
      return (node.op === '!' ? 'not ' : '-') + (precedence(node.operand) < precedence(node) ? '(' + text + ')' : text);
    }
    case 'binary': {
      const level = precedence(node);
      const left = print(node.left);
      const right = print(node.right);
      // 比较不支持链式写法；右操作数同优先级时保留原树的分组。
      const wrapLeft = precedence(node.left) < level || (level === 4 && precedence(node.left) === level);
      const wrapRight = precedence(node.right) <= level;
      return (wrapLeft ? '(' + left + ')' : left) + ' ' + node.op + ' ' + (wrapRight ? '(' + right + ')' : right);
    }
  }
}

export function stringifyExpression(node: ExprNode): string {
  const text = print(node);
  parseExpression(text);
  return text;
}

export function stringifyAssignments(assignments: Assignment[]): string {
  if (!assignments.length) return '';
  const text = assignments.map(({ key, value }) => key + ' = ' + print(value)).join(', ');
  parseStatementList(text);
  return text;
}
