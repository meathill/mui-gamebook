import { describe, expect, it } from 'vitest';
import { parseExpression, parseStatementList, stringifyExpression, stringifyAssignments } from '../src/index';
import { evaluateCondition, executeSet } from '../src/expression';

describe('表达式表单往返', () => {
  it.each([
    '生命 >= 10 and (gold > 2 or not has_key)',
    'not (a == 1) or b * (c + 2) % 3 > -1',
    'a - (b - c) == 0',
    '(a == b) == true',
    'a / (b / c) > 1',
    'name == "a, b)"',
    'flag, count > 1',
  ])('保持语法树和求值：%s', (source) => {
    const tree = parseExpression(source);
    const text = stringifyExpression(tree);
    expect(parseExpression(text)).toEqual(tree);
    const state = { 生命: 20, gold: 3, has_key: false, a: 2, b: 1, c: 4, name: 'a, b)', flag: true, count: 2 };
    expect(evaluateCondition(text, state)).toBe(evaluateCondition(source, state));
  });

  it('保留赋值顺序', () => {
    const source = 'gold = gold + 2, score = gold * (score - 1)';
    const text = stringifyAssignments(parseStatementList(source));
    expect(executeSet(text, { gold: 3, score: 4 })).toEqual({ gold: 5, score: 15 });
  });

  it.each([0.000000001, 1e22])('数字不输出 DSL 不支持的科学计数法：%s', (value) => {
    expect(parseExpression(stringifyExpression({ type: 'number', value }))).toEqual({ type: 'number', value });
  });

  it('不能表达的字符串明确报错', () => {
    expect(() => stringifyExpression({ type: 'string', value: '两种引号\'"' })).toThrow();
  });
  it('不能把关键字变量误写成布尔常量', () => {
    expect(() => stringifyExpression({ type: 'identifier', name: 'true' })).toThrow('关键字');
  });
});
