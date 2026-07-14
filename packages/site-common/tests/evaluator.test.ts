import { describe, it, expect } from 'vitest';
import { evaluateCondition, executeSet, interpolateVariables } from '../src/utils/evaluator';

describe('evaluator', () => {
  describe('evaluateCondition', () => {
    it('should return true for empty condition', () => {
      expect(evaluateCondition(undefined, {})).toBe(true);
      expect(evaluateCondition('', {})).toBe(true);
    });

    it('should evaluate boolean variable', () => {
      expect(evaluateCondition('has_key', { has_key: true })).toBe(true);
      expect(evaluateCondition('has_key', { has_key: false })).toBe(false);
    });

    it('should evaluate comparison expressions', () => {
      const state = { gold: 10, age: 20, name: 'Hero' };

      expect(evaluateCondition('gold == 10', state)).toBe(true);
      expect(evaluateCondition('gold != 5', state)).toBe(true);
      expect(evaluateCondition('age > 18', state)).toBe(true);
      expect(evaluateCondition('age < 10', state)).toBe(false);
      expect(evaluateCondition('age >= 20', state)).toBe(true);
      expect(evaluateCondition('age <= 19', state)).toBe(false);
    });

    it('should evaluate string comparisons', () => {
      const state = { name: 'Hero' };
      expect(evaluateCondition("name == 'Hero'", state)).toBe(true);
      expect(evaluateCondition('name == "Villain"', state)).toBe(false);
    });

    it('should handle variables on both sides', () => {
      const state = { a: 10, b: 10, c: 5 };
      expect(evaluateCondition('a == b', state)).toBe(true);
      expect(evaluateCondition('a > c', state)).toBe(true);
    });

    it('should evaluate multiple conditions (comma separated)', () => {
      const state = { a: 10, b: 5 };
      expect(evaluateCondition('a > 5, b < 10', state)).toBe(true);
      expect(evaluateCondition('a > 5, b > 10', state)).toBe(false);
    });

    it('should evaluate multiple conditions (&& separated)', () => {
      const state = { a: 10, b: 5 };
      expect(evaluateCondition('a > 5 && b < 10', state)).toBe(true);
      expect(evaluateCondition('a > 5 && b > 10', state)).toBe(false);
    });
  });

  describe('executeSet', () => {
    it('should return original state for empty instruction', () => {
      const state = { a: 1 };
      expect(executeSet(undefined, state)).toEqual(state);
    });

    it('should handle simple assignment', () => {
      const state = { gold: 10 };
      const newState = executeSet('gold = 20', state);
      expect(newState.gold).toBe(20);
    });

    it('should handle boolean assignment', () => {
      const state = { has_key: false };
      const newState = executeSet('has_key = true', state);
      expect(newState.has_key).toBe(true);
    });

    it('should handle arithmetic', () => {
      const state = { gold: 10, cost: 5 };

      let newState = executeSet('gold = gold + 5', state);
      expect(newState.gold).toBe(15);

      newState = executeSet('gold = gold - 5', state);
      expect(newState.gold).toBe(5);

      newState = executeSet('gold = gold - cost', state);
      expect(newState.gold).toBe(5);
    });

    it('should handle multiple instructions', () => {
      const state = { gold: 10, has_key: false };
      const newState = executeSet('gold = 5, has_key = true', state);
      expect(newState.gold).toBe(5);
      expect(newState.has_key).toBe(true);
    });
  });

  describe('interpolateVariables', () => {
    it('应返回原文本（空或无变量）', () => {
      expect(interpolateVariables('', {})).toBe('');
      expect(interpolateVariables('普通文本', {})).toBe('普通文本');
    });

    it('应替换单个变量', () => {
      const state = { gold: 100 };
      expect(interpolateVariables('你有 {{gold}} 金币', state)).toBe('你有 100 金币');
    });

    it('应替换多个变量', () => {
      const state = { player_name: '勇者', gold: 50, level: 5 };
      expect(interpolateVariables('{{player_name}}，等级{{level}}，金币{{gold}}', state)).toBe('勇者，等级5，金币50');
    });

    it('应保留不存在的变量原样', () => {
      const state = { gold: 100 };
      expect(interpolateVariables('你有 {{gold}} 金币和 {{silver}} 银币', state)).toBe(
        '你有 100 金币和 {{silver}} 银币',
      );
    });

    it('应处理布尔值', () => {
      const state = { has_key: true, is_dead: false };
      expect(interpolateVariables('钥匙: {{has_key}}, 死亡: {{is_dead}}', state)).toBe('钥匙: true, 死亡: false');
    });

    it('应处理字符串值', () => {
      const state = { weapon: '魔剑' };
      expect(interpolateVariables('你装备了{{weapon}}', state)).toBe('你装备了魔剑');
    });

    it('应支持变量名两侧空格与中文变量名（DSL v2 Phase 1）', () => {
      expect(interpolateVariables('你有 {{ gold }} 金币', { gold: 100 })).toBe('你有 100 金币');
      expect(interpolateVariables('生命：{{生命值}}', { 生命值: 80 })).toBe('生命：80');
      expect(interpolateVariables('生命：{{ 生命值 }}', { 生命值: 80 })).toBe('生命：80');
    });

    it('条件文本内的孤儿标签不被变量插值误吞', () => {
      // 不存在的变量保留原样；`{{ else }}` 形态不匹配任何 state 变量时也保留
      expect(interpolateVariables('{{ else }}', {})).toBe('{{ else }}');
    });
  });

  describe('v2 新表达式能力经适配层可用', () => {
    it('or / 括号 / 乘除在条件与赋值中可用', () => {
      expect(evaluateCondition('a == 1 or b == 1', { a: 0, b: 1 })).toBe(true);
      expect(evaluateCondition('(a or b) and c', { a: 0, b: 1, c: 1 })).toBe(true);
      expect(executeSet('gold = gold * 2', { gold: 10 })).toEqual({ gold: 20 });
    });

    it('{{ if }} 条件文本支持 or 表达式', () => {
      const text = '{{ if partner == "alice" or partner == "luna" }}有伴{{ else }}独行{{ /if }}';
      expect(interpolateVariables(text, { partner: 'luna' })).toBe('有伴');
      expect(interpolateVariables(text, { partner: 'none' })).toBe('独行');
    });
  });
});
