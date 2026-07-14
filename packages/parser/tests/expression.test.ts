import { describe, expect, it, vi } from 'vitest';
import {
  evaluateCondition,
  executeSet,
  normalizeTriggerCondition,
  parseExpression,
  parseStatementList,
  validateExpression,
} from '../src/expression';

describe('表达式引擎 - 存量语法兼容（对齐旧 evaluator 行为）', () => {
  it('基本比较运算符', () => {
    const state = { gold: 10, name: 'alice' };
    expect(evaluateCondition('gold == 10', state)).toBe(true);
    expect(evaluateCondition('gold != 10', state)).toBe(false);
    expect(evaluateCondition('gold > 5', state)).toBe(true);
    expect(evaluateCondition('gold < 5', state)).toBe(false);
    expect(evaluateCondition('gold >= 10', state)).toBe(true);
    expect(evaluateCondition('gold <= 9', state)).toBe(false);
    expect(evaluateCondition('name == "alice"', state)).toBe(true);
    expect(evaluateCondition("name == 'alice'", state)).toBe(true);
  });

  it('逗号与 && 均为 AND（存量 13 处 `(if: a, b)` 写法）', () => {
    const state = { a: 1, b: 0 };
    expect(evaluateCondition('a == 1, b == 0', state)).toBe(true);
    expect(evaluateCondition('a == 1 && b == 0', state)).toBe(true);
    expect(evaluateCondition('a == 1, b == 1', state)).toBe(false);
  });

  it('单 token 真值判断（`(if: has_key)`）', () => {
    expect(evaluateCondition('has_key', { has_key: true })).toBe(true);
    expect(evaluateCondition('has_key', { has_key: false })).toBe(false);
    expect(evaluateCondition('gold', { gold: 0 })).toBe(false);
    expect(evaluateCondition('gold', { gold: 5 })).toBe(true);
  });

  it('宽松 ==：数字与数字形字符串相等（旧引擎 10 == "10" 为真）', () => {
    expect(evaluateCondition('gold == "10"', { gold: 10 })).toBe(true);
    expect(evaluateCondition('"10" == gold', { gold: 10 })).toBe(true);
    // 布尔与字符串 "true" 不相等（旧引擎 JS 宽松 == 同样为 false）
    expect(evaluateCondition('flag == "true"', { flag: true })).toBe(false);
  });

  it('未定义变量按 falsy 处理且不 throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(evaluateCondition('ghost', {})).toBe(false);
    expect(evaluateCondition('ghost == 1', {})).toBe(false);
    // 两个未定义变量相等（与旧引擎 undefined == undefined 一致）
    expect(evaluateCondition('ghost == phantom', {})).toBe(true);
    warn.mockRestore();
  });

  it('空条件视为 true', () => {
    expect(evaluateCondition(undefined, {})).toBe(true);
    expect(evaluateCondition('', {})).toBe(true);
    expect(evaluateCondition('   ', {})).toBe(true);
  });

  it('set：赋值与单次加减（存量 261 处的主要形态）', () => {
    expect(executeSet('gold = 10', { gold: 0 })).toEqual({ gold: 10 });
    expect(executeSet('gold = gold + 5', { gold: 10 })).toEqual({ gold: 15 });
    expect(executeSet('gold = gold - 3', { gold: 10 })).toEqual({ gold: 7 });
    expect(executeSet('has_key = true, gold = gold + 5', { has_key: false, gold: 1 })).toEqual({
      has_key: true,
      gold: 6,
    });
    expect(executeSet('name = "alice"', { name: '' })).toEqual({ name: 'alice' });
  });

  it('set：后面的语句能看到前面的结果', () => {
    expect(executeSet('a = 1, b = a + 1', { a: 0, b: 0 })).toEqual({ a: 1, b: 2 });
  });

  it('set：非数字算术跳过该条赋值并告警（旧行为）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(executeSet('gold = name + 1', { gold: 5, name: 'x' })).toEqual({ gold: 5, name: 'x' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('非法输入：条件为 false、set 原样返回，均不 throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(evaluateCondition('== ==', {})).toBe(false);
    expect(evaluateCondition('gold >', { gold: 1 })).toBe(false);
    const state = { gold: 1 };
    expect(executeSet('gold + 10', state)).toBe(state); // 缺 = 的历史坏写法
    expect(executeSet('gold = ', state)).toBe(state);
    warn.mockRestore();
  });
});

describe('表达式引擎 - v2 新能力', () => {
  it('or / || 运算', () => {
    const state = { a: 1, b: 0 };
    expect(evaluateCondition('a == 1 or b == 1', state)).toBe(true);
    expect(evaluateCondition('a == 2 || b == 0', state)).toBe(true);
    expect(evaluateCondition('a == 2 or b == 1', state)).toBe(false);
  });

  it('关键字大小写不敏感（LLM 常写 SQL 风格 AND/OR，HP4 存量实锤）', () => {
    const state = { a: 1, b: 1, flag: true };
    expect(evaluateCondition('a == 1 AND b == 1', state)).toBe(true);
    expect(evaluateCondition('a == 2 OR b == 1', state)).toBe(true);
    expect(evaluateCondition('NOT flag', state)).toBe(false);
    expect(evaluateCondition('flag == TRUE', state)).toBe(true);
  });

  it('优先级：`a, b or c` ≡ a && (b || c)；and 高于 or', () => {
    expect(evaluateCondition('a, b or c', { a: 1, b: 0, c: 1 })).toBe(true);
    expect(evaluateCondition('a, b or c', { a: 0, b: 1, c: 1 })).toBe(false);
    expect(evaluateCondition('a or b and c', { a: 0, b: 1, c: 1 })).toBe(true);
    expect(evaluateCondition('a or b and c', { a: 0, b: 1, c: 0 })).toBe(false);
  });

  it('not / ! 运算（binds looser than comparison：not a == b ≡ not (a == b)）', () => {
    expect(evaluateCondition('not has_key', { has_key: false })).toBe(true);
    expect(evaluateCondition('!has_key', { has_key: true })).toBe(false);
    expect(evaluateCondition('not gold == 5', { gold: 3 })).toBe(true);
  });

  it('括号分组', () => {
    const state = { a: 0, b: 1, c: 1 };
    expect(evaluateCondition('(a or b) and c', state)).toBe(true);
    expect(evaluateCondition('a and (b or c)', state)).toBe(false);
  });

  it('四则运算与优先级、一元负号', () => {
    expect(executeSet('gold = gold * 2', { gold: 10 })).toEqual({ gold: 20 });
    expect(executeSet('gold = gold / 4', { gold: 10 })).toEqual({ gold: 2.5 });
    expect(executeSet('r = gold % 3', { gold: 10, r: 0 })).toEqual({ gold: 10, r: 1 });
    expect(executeSet('x = 2 + 3 * 4', { x: 0 })).toEqual({ x: 14 });
    expect(executeSet('x = (2 + 3) * 4', { x: 0 })).toEqual({ x: 20 });
    expect(executeSet('x = a + b + c', { a: 1, b: 2, c: 3, x: 0 })).toEqual({ a: 1, b: 2, c: 3, x: 6 });
    expect(executeSet('x = -5', { x: 0 })).toEqual({ x: -5 });
    expect(evaluateCondition('temp < -5', { temp: -10 })).toBe(true);
    expect(evaluateCondition('gold + bonus > 15', { gold: 10, bonus: 6 })).toBe(true);
  });

  it('中文变量名（Unicode 标识符）', () => {
    expect(evaluateCondition('生命值 > 50', { 生命值: 80 })).toBe(true);
    expect(executeSet('金币 = 金币 + 10', { 金币: 5 })).toEqual({ 金币: 15 });
    expect(evaluateCondition('伙伴 == "爱丽丝"', { 伙伴: '爱丽丝' })).toBe(true);
  });

  it('字符串字面量可以包含逗号（旧引擎会被逗号切坏的场景）', () => {
    expect(evaluateCondition('name == "a, b"', { name: 'a, b' })).toBe(true);
    expect(executeSet('note = "x, y", gold = 1', { note: '', gold: 0 })).toEqual({ note: 'x, y', gold: 1 });
  });

  it('递归深度上限：深层嵌套报错而非炸栈', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const deep = `${'('.repeat(100)}1${')'.repeat(100)}`;
    expect(evaluateCondition(deep, {})).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('maximum depth'));
    warn.mockRestore();
  });
});

describe('normalizeTriggerCondition - trigger 前缀式归一', () => {
  it('前缀式补全 LHS', () => {
    expect(normalizeTriggerCondition('<= 0', 'health')).toBe('health <= 0');
    expect(normalizeTriggerCondition('== true', 'is_dead')).toBe('is_dead == true');
  });

  it('完整表达式原样返回', () => {
    expect(normalizeTriggerCondition('health <= 0', 'health')).toBe('health <= 0');
  });

  it('归一后字符串变量 trigger 可正确求值（修复旧运行时 bug）', () => {
    const expr = normalizeTriggerCondition('== "Alice"', 'partner');
    expect(evaluateCondition(expr, { partner: 'Alice' })).toBe(true);
    expect(evaluateCondition(expr, { partner: 'Bob' })).toBe(false);
  });
});

describe('validateExpression - lint 层静态校验', () => {
  it('提取条件表达式中的变量名', () => {
    const result = validateExpression('gold >= 10 and (has_key or 生命值 > 0)', 'condition');
    expect(result.ok).toBe(true);
    expect(result.identifiers.sort()).toEqual(['gold', 'has_key', '生命值']);
  });

  it('set 模式返回赋值目标与引用变量', () => {
    const result = validateExpression('gold = gold * 2 + bonus, has_key = true', 'statements');
    expect(result.ok).toBe(true);
    expect(result.assignedKeys).toEqual(['gold', 'has_key']);
    expect(result.identifiers.sort()).toEqual(['bonus', 'gold']);
  });

  it('关键字与字面量不计入变量', () => {
    const result = validateExpression('flag == true and not other', 'condition');
    expect(result.ok).toBe(true);
    expect(result.identifiers.sort()).toEqual(['flag', 'other']);
  });

  it('语法错误返回 ok=false 与错误信息', () => {
    const result = validateExpression('gold >=', 'condition');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('parse 层 AST 形状', () => {
  it('parseExpression 顶层逗号折叠为 and', () => {
    const ast = parseExpression('a, b');
    expect(ast).toEqual({
      type: 'binary',
      op: 'and',
      left: { type: 'identifier', name: 'a' },
      right: { type: 'identifier', name: 'b' },
    });
  });

  it('parseStatementList 逗号是语句分隔符', () => {
    const statements = parseStatementList('a = 1, b = 2');
    expect(statements).toHaveLength(2);
    expect(statements[0].key).toBe('a');
    expect(statements[1].key).toBe('b');
  });
});
