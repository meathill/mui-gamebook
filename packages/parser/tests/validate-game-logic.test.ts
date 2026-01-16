import { describe, it, expect } from 'vitest';
import { validateGameLogic } from '../../../scripts/validate-game-script';
import type { Game } from '../src/types';

// 辅助函数：创建最小有效的游戏对象
function createMinimalGame(overrides: Partial<Game> = {}): Game {
  return {
    slug: 'test-game',
    title: 'Test Game',
    initialState: {},
    ai: {},
    scenes: {
      start: { id: 'start', nodes: [] },
    },
    ...overrides,
  };
}

describe('validateGameLogic - 变量校验', () => {
  describe('(set:) 中的变量校验', () => {
    it('应该检测到未声明的变量', () => {
      const game = createMinimalGame({
        initialState: { gold: 100 },
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'choice',
                text: '购买物品',
                nextSceneId: 'shop',
                set: 'gold = gold - 10, karma = karma + 5',
              },
            ],
          },
          shop: { id: 'shop', nodes: [] },
        },
      });

      const issues = validateGameLogic(game);

      expect(issues.some((i) => i.includes('karma') && i.includes('(set:)'))).toBe(true);
      expect(issues.some((i) => i.includes('gold') && i.includes('(set:)'))).toBe(false);
    });

    it('应该正确识别已声明的变量', () => {
      const game = createMinimalGame({
        initialState: { gold: 100, karma: 0 },
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'choice',
                text: '购买物品',
                nextSceneId: 'shop',
                set: 'gold = gold - 10, karma = karma + 5',
              },
            ],
          },
          shop: { id: 'shop', nodes: [] },
        },
      });

      const issues = validateGameLogic(game);

      expect(issues.some((i) => i.includes('(set:)'))).toBe(false);
    });
  });

  describe('(if:) 条件中的变量校验', () => {
    it('应该检测到未声明的变量', () => {
      const game = createMinimalGame({
        initialState: { has_key: false },
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'choice',
                text: '打开门',
                nextSceneId: 'room',
                condition: 'has_key == true && strength >= 10',
              },
            ],
          },
          room: { id: 'room', nodes: [] },
        },
      });

      const issues = validateGameLogic(game);

      expect(issues.some((i) => i.includes('strength') && i.includes('(if:)'))).toBe(true);
      expect(issues.some((i) => i.includes('has_key') && i.includes('(if:)'))).toBe(false);
    });
  });

  describe('{{ }} 变量插值校验', () => {
    it('应该检测到未声明的变量', () => {
      const game = createMinimalGame({
        initialState: { gold: 100 },
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'text',
                content: '你有 {{gold}} 金币和 {{diamonds}} 钻石。',
              },
            ],
          },
        },
      });

      const issues = validateGameLogic(game);

      expect(issues.some((i) => i.includes('diamonds') && i.includes('{{}}'))).toBe(true);
      expect(issues.some((i) => i.includes('gold') && i.includes('{{}}'))).toBe(false);
    });

    it('应该跳过条件语法关键字 if 和 else', () => {
      const game = createMinimalGame({
        initialState: { health: 100 },
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'text',
                content: '{{ if health > 50 }}你很健康{{ else }}你需要休息{{ /if }}',
              },
            ],
          },
        },
      });

      const issues = validateGameLogic(game);

      // 不应该把 'if' 和 'else' 当作未声明的变量
      expect(issues.some((i) => i.includes('"if"') || i.includes('"else"'))).toBe(false);
    });
  });

  describe('{{ if condition }} 条件块校验', () => {
    it('应该检测条件块中未声明的变量', () => {
      const game = createMinimalGame({
        initialState: { health: 100 },
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'text',
                content: '{{ if mana > 50 }}你有足够的魔法{{ /if }}',
              },
            ],
          },
        },
      });

      const issues = validateGameLogic(game);

      expect(issues.some((i) => i.includes('mana') && i.includes('{{ if }}'))).toBe(true);
    });
  });

  describe('逻辑运算符关键字不应该被误报', () => {
    it('不应该把 and、or、not 当作变量', () => {
      const game = createMinimalGame({
        initialState: { has_key: false, has_sword: false },
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'choice',
                text: '进入房间',
                nextSceneId: 'room',
                condition: 'has_key and has_sword or not has_key',
              },
            ],
          },
          room: { id: 'room', nodes: [] },
        },
      });

      const issues = validateGameLogic(game);

      expect(issues.some((i) => i.includes('"and"') || i.includes('"or"') || i.includes('"not"'))).toBe(false);
    });

    it('不应该把 true、false 当作变量', () => {
      const game = createMinimalGame({
        initialState: { flag: false },
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'choice',
                text: '切换状态',
                nextSceneId: 'next',
                set: 'flag = true',
              },
            ],
          },
          next: { id: 'next', nodes: [] },
        },
      });

      const issues = validateGameLogic(game);

      expect(issues.some((i) => i.includes('"true"') || i.includes('"false"'))).toBe(false);
    });
  });

  describe('复杂表达式中的变量提取', () => {
    it('应该正确解析复杂的数学表达式', () => {
      const game = createMinimalGame({
        initialState: { gold: 100 },
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'choice',
                text: '复杂操作',
                nextSceneId: 'next',
                set: 'gold = gold * 2 + bonus - penalty',
              },
            ],
          },
          next: { id: 'next', nodes: [] },
        },
      });

      const issues = validateGameLogic(game);

      expect(issues.some((i) => i.includes('bonus'))).toBe(true);
      expect(issues.some((i) => i.includes('penalty'))).toBe(true);
      expect(issues.some((i) => i.includes('gold') && i.includes('not declared'))).toBe(false);
    });
  });
});
