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
    it('复杂算术表达式合法（统一引擎已支持 * 与链式运算），变量提取正常', () => {
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

      // 变量提取穿透运算符工作
      expect(issues.some((i) => i.includes('bonus'))).toBe(true);
      expect(issues.some((i) => i.includes('penalty'))).toBe(true);
      expect(issues.some((i) => i.includes('gold') && i.includes('not declared'))).toBe(false);
      // Phase 1 语义反转：* 等运算符已被统一表达式引擎支持，不再报错
      expect(issues.some((i) => i.includes('Invalid'))).toBe(false);
    });
  });
});

describe('validateGameLogic - minigame 节点变量声明', () => {
  it('minigame 节点 variables 字段中的变量名应视为已声明', () => {
    const game = createMinimalGame({
      scenes: {
        start: {
          id: 'start',
          nodes: [
            {
              type: 'minigame',
              prompt: '测试小游戏',
              variables: { flight_score: '飞行得分' },
            },
            {
              type: 'choice',
              text: '成功完成飞行',
              nextSceneId: 'next',
              condition: 'flight_score >= 50',
            },
          ],
        },
        next: { id: 'next', nodes: [] },
      },
    });

    const issues = validateGameLogic(game);

    expect(issues.some((i) => i.includes('flight_score') && i.includes('not declared'))).toBe(false);
  });

  it('minigame 节点不应影响其他未声明变量的检测', () => {
    const game = createMinimalGame({
      scenes: {
        start: {
          id: 'start',
          nodes: [
            {
              type: 'minigame',
              prompt: '测试小游戏',
              variables: { flight_score: '飞行得分' },
            },
            {
              type: 'choice',
              text: '走别的路',
              nextSceneId: 'next',
              condition: 'flight_score >= 50 && other_var == true',
            },
          ],
        },
        next: { id: 'next', nodes: [] },
      },
    });

    const issues = validateGameLogic(game);

    expect(issues.some((i) => i.includes('other_var') && i.includes('not declared'))).toBe(true);
  });
});

describe('validateGameLogic - 表达式语法校验（与运行时同源，Phase 1 语义反转：* / % 已合法）', () => {
  it('四则运算、括号、or、% 均为合法表达式，不再误报', () => {
    const game = createMinimalGame({
      initialState: { gold: 100, note: '' },
      scenes: {
        start: {
          id: 'start',
          nodes: [
            { type: 'choice', text: '翻倍', nextSceneId: 'next', set: 'gold = gold * 2' },
            { type: 'choice', text: '检查', nextSceneId: 'next', condition: '(gold / 2 > 10) or gold == 0' },
            { type: 'choice', text: '买药', nextSceneId: 'next', set: 'gold = gold - 10' },
            { type: 'choice', text: '记录', nextSceneId: 'next', set: 'note = "a*b/c"' },
            { type: 'text', content: '{{ if gold % 2 == 0 }}偶数{{ /if }}' },
          ],
        },
        next: { id: 'next', nodes: [] },
      },
    });

    const issues = validateGameLogic(game);
    expect(issues.some((i) => i.includes('Invalid') || i.includes('Unsupported'))).toBe(false);
  });

  it('缺 = 的 set 子句报 Invalid（运行时会静默跳过的历史坏写法）', () => {
    const game = createMinimalGame({
      initialState: { courage: 0 },
      scenes: {
        start: {
          id: 'start',
          nodes: [{ type: 'choice', text: '鼓起勇气', nextSceneId: 'next', set: 'courage + 10' }],
        },
        next: { id: 'next', nodes: [] },
      },
    });

    const issues = validateGameLogic(game);
    expect(issues.some((i) => i.includes('Invalid (set:)'))).toBe(true);
  });

  it('残缺的 if 条件报 Invalid', () => {
    const game = createMinimalGame({
      initialState: { gold: 100 },
      scenes: {
        start: {
          id: 'start',
          nodes: [{ type: 'choice', text: '检查', nextSceneId: 'next', condition: 'gold >=' }],
        },
        next: { id: 'next', nodes: [] },
      },
    });

    const issues = validateGameLogic(game);
    expect(issues.some((i) => i.includes('Invalid (if:)'))).toBe(true);
  });
});

describe('validateGameLogic - 嵌套 {{ if }} 检测', () => {
  it('应该检测到嵌套条件块（HP4:2059 实锤模式，运行时会渲染裸模板标签）', () => {
    const game = createMinimalGame({
      initialState: { ball_partner: 'none' },
      scenes: {
        start: {
          id: 'start',
          nodes: [
            {
              type: 'text',
              content:
                '勇士们领舞。{{ if ball_partner == "parvati" }}帕瓦蒂{{ else }}{{ if ball_partner == "luna" }}卢娜{{ else }}你独自一人{{ /if }}{{ /if }}走到舞池中央。',
            },
          ],
        },
      },
    });

    const issues = validateGameLogic(game);
    expect(issues.some((i) => i.includes('Nested {{ if }}'))).toBe(true);
  });

  it('并列（非嵌套）条件块不应误报', () => {
    const game = createMinimalGame({
      initialState: { ball_partner: 'none' },
      scenes: {
        start: {
          id: 'start',
          nodes: [
            {
              type: 'text',
              content:
                '{{ if ball_partner == "parvati" }}帕瓦蒂{{ /if }}{{ if ball_partner == "luna" }}卢娜{{ /if }}{{ if ball_partner != "parvati" && ball_partner != "luna" }}你独自一人{{ /if }}',
            },
          ],
        },
      },
    });

    const issues = validateGameLogic(game);
    expect(issues.some((i) => i.includes('Nested {{ if }}'))).toBe(false);
  });
});
