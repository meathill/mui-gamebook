import { describe, it, expect } from 'vitest';
import { parse, stringify } from '../src';
import type { Game, SceneNode, SceneMiniGameNode } from '../src/types';
import { toPlayableGame } from '../src/utils';

describe('minigame DSL', () => {
  describe('parse', () => {
    it('应该正确解析基本的小游戏节点', () => {
      const source = `---
title: "Minigame Test"
---
# start
\`\`\`minigame-gen
prompt: 创建一个点击金色飞贼的游戏
variables:
  - snitch_caught: 捕获的飞贼数量
url: https://example.com/minigames/1
\`\`\`
`;
      const result = parse(source);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const node = result.data.scenes['start']?.nodes[0] as SceneMiniGameNode;
      expect(node.type).toBe('minigame');
      expect(node.prompt).toBe('创建一个点击金色飞贼的游戏');
      expect(node.variables).toEqual({ snitch_caught: '捕获的飞贼数量' });
      expect(node.url).toBe('https://example.com/minigames/1');
    });

    it('应该解析无 URL 的小游戏（待生成状态）', () => {
      const source = `---
title: "Pending Minigame"
---
# start
\`\`\`minigame-gen
prompt: 创建一个记忆配对游戏
variables:
  - score: 得分
\`\`\`
`;
      const result = parse(source);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const node = result.data.scenes['start']?.nodes[0] as SceneMiniGameNode;
      expect(node.type).toBe('minigame');
      expect(node.prompt).toBe('创建一个记忆配对游戏');
      expect(node.url).toBeUndefined();
    });

    it('应该解析带多个变量的小游戏', () => {
      const source = `---
title: "Multi Var Minigame"
---
# start
\`\`\`minigame-gen
prompt: 打地鼠游戏
variables:
  - hits: 击中次数
  - misses: 失误次数
  - score: 最终得分
\`\`\`
`;
      const result = parse(source);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const node = result.data.scenes['start']?.nodes[0] as SceneMiniGameNode;
      expect(node.variables).toEqual({
        hits: '击中次数',
        misses: '失误次数',
        score: '最终得分',
      });
    });

    it('应该解析对象形式的变量定义', () => {
      const source = `---
title: "Object Vars"
---
# start
\`\`\`minigame-gen
prompt: 测试游戏
variables:
  health: 生命值
  gold: 金币数量
\`\`\`
`;
      const result = parse(source);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const node = result.data.scenes['start']?.nodes[0] as SceneMiniGameNode;
      expect(node.variables).toEqual({
        health: '生命值',
        gold: '金币数量',
      });
    });

    it('应该解析无变量的小游戏', () => {
      const source = `---
title: "No Vars"
---
# start
\`\`\`minigame-gen
prompt: 简单的点击游戏，不需要变量
\`\`\`
`;
      const result = parse(source);
      expect(result.success).toBe(true);
      if (!result.success) return;

      const node = result.data.scenes['start']?.nodes[0] as SceneMiniGameNode;
      expect(node.type).toBe('minigame');
      expect(node.variables).toBeUndefined();
    });
  });

  describe('stringify', () => {
    it('应该正确序列化小游戏节点', () => {
      const game: Game = {
        slug: 'test',
        title: 'Minigame Stringify',
        initialState: { snitch_caught: 0 },
        ai: {},
        scenes: {
          start: {
            id: 'start',
            nodes: [
              { type: 'text', content: '准备开始游戏！' },
              {
                type: 'minigame',
                prompt: '抓住金色飞贼',
                variables: { snitch_caught: '捕获数量' },
                url: 'https://example.com/game.js',
              } as SceneMiniGameNode,
            ],
          },
        },
      };

      const result = stringify(game);
      expect(result).toContain('```minigame-gen');
      expect(result).toContain('prompt: 抓住金色飞贼');
      expect(result).toContain('snitch_caught: 捕获数量');
      expect(result).toContain('url: https://example.com/game.js');
    });

    it('应该正确序列化无 URL 的小游戏', () => {
      const game: Game = {
        slug: 'test',
        title: 'No URL Minigame',
        initialState: {},
        ai: {},
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'minigame',
                prompt: '简单游戏',
              } as SceneMiniGameNode,
            ],
          },
        },
      };

      const result = stringify(game);
      expect(result).toContain('```minigame-gen');
      expect(result).toContain('prompt: 简单游戏');
      expect(result).not.toContain('url:');
    });
  });

  describe('toPlayableGame', () => {
    it('应该过滤小游戏的敏感信息（prompt 和变量描述）', () => {
      const game: Game = {
        slug: 'test',
        title: 'Playable Test',
        initialState: { score: 0 },
        ai: {},
        scenes: {
          start: {
            id: 'start',
            nodes: [
              {
                type: 'minigame',
                prompt: '这是创作者的 prompt，玩家不应该看到',
                variables: { score: '玩家得分，这是敏感描述' },
                url: 'https://example.com/game.js',
              } as SceneMiniGameNode,
            ],
          },
        },
      };

      const playable = toPlayableGame(game);
      const node = playable.scenes['start']?.nodes[0];

      expect(node).toBeDefined();
      expect(node?.type).toBe('minigame');

      // 应该有 url 和变量名列表，但没有 prompt 和变量描述
      if (node?.type === 'minigame') {
        expect(node.url).toBe('https://example.com/game.js');
        expect(node.variables).toEqual(['score']); // 只有变量名，没有描述
        expect((node as any).prompt).toBeUndefined(); // prompt 应该被过滤
      }
    });
  });

  describe('结合变量和选项', () => {
    it('应该正确解析小游戏与条件选项的组合', () => {
      const source = `---
title: "魁地奇比赛"
state:
  snitch_caught:
    value: 0
    visible: true
    label: 飞贼捕获数
---
# start
欢迎来到魁地奇球场！

* [开始比赛] -> quidditch_match

---

# quidditch_match
魁地奇比赛开始了！

\`\`\`minigame-gen
prompt: 创建一个点击金色飞贼的游戏，10秒内需要点击10次
variables:
  - snitch_caught: 捕获的飞贼数量
\`\`\`

* [比赛结束] -> quidditch_win (if: snitch_caught >= 10)
* [比赛结束] -> quidditch_lose (if: snitch_caught < 10)

---

# quidditch_win
恭喜！你成功抓住了金色飞贼！

---

# quidditch_lose
很遗憾，你没能抓住足够的飞贼。
`;
      const result = parse(source);
      expect(result.success).toBe(true);
      if (!result.success) return;

      // 验证小游戏节点
      const matchScene = result.data.scenes['quidditch_match'];
      expect(matchScene).toBeDefined();

      const minigameNode = matchScene?.nodes.find((n) => n.type === 'minigame') as SceneMiniGameNode;
      expect(minigameNode).toBeDefined();
      expect(minigameNode.variables?.snitch_caught).toBe('捕获的飞贼数量');

      // 验证条件选项
      const choices = matchScene?.nodes.filter((n) => n.type === 'choice');
      expect(choices?.length).toBe(2);

      const winChoice = choices?.find((c) => c.type === 'choice' && c.nextSceneId === 'quidditch_win');
      const loseChoice = choices?.find((c) => c.type === 'choice' && c.nextSceneId === 'quidditch_lose');

      expect(winChoice?.type === 'choice' && winChoice.condition).toBe('snitch_caught >= 10');
      expect(loseChoice?.type === 'choice' && loseChoice.condition).toBe('snitch_caught < 10');

      // 验证结局场景存在
      expect(result.data.scenes['quidditch_win'] !== undefined).toBe(true);
      expect(result.data.scenes['quidditch_lose'] !== undefined).toBe(true);
    });
  });
});
