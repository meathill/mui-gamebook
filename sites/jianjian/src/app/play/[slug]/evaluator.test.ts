/**
 * evaluator 模块测试
 * 测试条件评估和变量操作
 */

import { describe, it, expect } from 'vitest';
import { evaluateCondition, executeSet, interpolateVariables } from './evaluator';

describe('evaluator', () => {
  describe('evaluateCondition', () => {
    it('当条件为空时返回 true', () => {
      expect(evaluateCondition(undefined, {})).toBe(true);
      expect(evaluateCondition('', {})).toBe(true);
    });

    it('正确评估等于条件', () => {
      expect(evaluateCondition('has_key == true', { has_key: true })).toBe(true);
      expect(evaluateCondition('has_key == true', { has_key: false })).toBe(false);
    });

    it('正确评估数值比较', () => {
      expect(evaluateCondition('gold >= 10', { gold: 15 })).toBe(true);
      expect(evaluateCondition('gold >= 10', { gold: 5 })).toBe(false);
      expect(evaluateCondition('health > 0', { health: 50 })).toBe(true);
      expect(evaluateCondition('health > 0', { health: 0 })).toBe(false);
    });

    it('正确评估不等于条件', () => {
      expect(evaluateCondition('status != dead', { status: 'alive' })).toBe(true);
    });
  });

  describe('executeSet', () => {
    it('正确设置布尔值', () => {
      const result = executeSet('has_key = true', { has_key: false });
      expect(result.has_key).toBe(true);
    });

    it('正确设置数值', () => {
      const result = executeSet('gold = 100', { gold: 50 });
      expect(result.gold).toBe(100);
    });

    it('正确执行加法运算', () => {
      const result = executeSet('gold = gold + 10', { gold: 50 });
      expect(result.gold).toBe(60);
    });

    it('正确执行减法运算', () => {
      const result = executeSet('health = health - 20', { health: 100 });
      expect(result.health).toBe(80);
    });

    it('正确处理多个赋值', () => {
      const result = executeSet('has_key = true, gold = gold + 5', { has_key: false, gold: 10 });
      expect(result.has_key).toBe(true);
      expect(result.gold).toBe(15);
    });
  });

  describe('interpolateVariables', () => {
    it('正确替换变量占位符（双大括号语法）', () => {
      const result = interpolateVariables('你有 {{gold}} 金币', { gold: 100 });
      expect(result).toBe('你有 100 金币');
    });

    it('正确处理多个变量', () => {
      const result = interpolateVariables('生命值: {{health}}, 金币: {{gold}}', { health: 80, gold: 50 });
      expect(result).toBe('生命值: 80, 金币: 50');
    });

    it('未找到变量时保留占位符', () => {
      const result = interpolateVariables('未知变量: {{unknown}}', {});
      expect(result).toBe('未知变量: {{unknown}}');
    });

    it('没有占位符时返回原文', () => {
      const result = interpolateVariables('普通文本无变量', { gold: 100 });
      expect(result).toBe('普通文本无变量');
    });
  });
});
