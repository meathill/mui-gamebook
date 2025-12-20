import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import { toPlayableGame } from '../src/utils';
import type { PlayableGame } from '../src/types';

describe('toPlayableGame - 过滤敏感数据', () => {
  it('应该过滤角色的 prompt 和 description', () => {
    const dsl = `---
title: "测试游戏"
ai:
  characters:
    hero:
      name: 英雄
      description: 这是一个勇敢的英雄
      image_prompt: a brave hero with golden armor
      image_url: https://example.com/hero.png
---
# start
这是开始场景。
* [继续] -> next
`;
    const result = parse(dsl);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const playable = toPlayableGame(result.data);

    // 验证角色信息只保留 name 和 image_url
    expect(playable.characters).toBeDefined();
    expect(playable.characters!['hero']).toEqual({
      name: '英雄',
      image_url: 'https://example.com/hero.png',
    });
    // 不应该有 description 和 image_prompt
    expect((playable.characters!['hero'] as Record<string, unknown>)['description']).toBeUndefined();
    expect((playable.characters!['hero'] as Record<string, unknown>)['image_prompt']).toBeUndefined();
  });

  it('应该过滤 AI 图片节点的 prompt', () => {
    const dsl = `---
title: "测试游戏"
---
# start
\`\`\`image-gen
prompt: 一个美丽的城堡，阳光明媚
url: https://example.com/castle.png
\`\`\`
这是开始场景。
* [继续] -> next
`;
    const result = parse(dsl);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const playable = toPlayableGame(result.data);
    const startScene = playable.scenes['start'];
    expect(startScene).toBeDefined();

    const imageNode = startScene!.nodes.find((n) => n.type === 'ai_image');
    expect(imageNode).toBeDefined();
    // 不应该有 prompt
    expect((imageNode as Record<string, unknown>)['prompt']).toBeUndefined();
    expect(imageNode!.type).toBe('ai_image');
    // 应该保留 url
    if (imageNode && 'url' in imageNode) {
      expect(imageNode.url).toBe('https://example.com/castle.png');
    }
  });

  it('应该保留基本元数据', () => {
    const dsl = `---
title: "我的游戏"
description: 这是一个测试游戏
cover_image: https://example.com/cover.png
tags: [冒险, 奇幻]
---
# start
开始你的冒险！
* [开始] -> adventure
`;
    const result = parse(dsl);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const playable = toPlayableGame(result.data);

    expect(playable.title).toBe('我的游戏');
    expect(playable.description).toBe('这是一个测试游戏');
    expect(playable.cover_image).toBe('https://example.com/cover.png');
    expect(playable.tags).toEqual(['冒险', '奇幻']);
  });

  it('不应该包含 ai.style 配置', () => {
    const dsl = `---
title: "测试游戏"
ai:
  style:
    image: fantasy
---
# start
开始。
* [继续] -> next
`;
    const result = parse(dsl);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const playable = toPlayableGame(result.data) as PlayableGame & { ai?: unknown };

    // PlayableGame 类型中不应该有 ai 属性
    expect(playable.ai).toBeUndefined();
  });

  it('应该保留选项和条件', () => {
    const dsl = `---
title: "测试游戏"
state:
  gold: 100
---
# start
你有 100 金币。
* [购买剑] -> buy (if: gold >= 50) (set: gold = gold - 50)
* [离开] -> leave
`;
    const result = parse(dsl);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const playable = toPlayableGame(result.data);
    const startScene = playable.scenes['start'];
    const choices = startScene!.nodes.filter((n) => n.type === 'choice');

    expect(choices).toHaveLength(2);
    expect(choices[0]).toMatchObject({
      type: 'choice',
      text: '购买剑',
      nextSceneId: 'buy',
      condition: 'gold >= 50',
      set: 'gold = gold - 50',
    });
  });

  it('应该过滤 AI 音频节点的 prompt', () => {
    const dsl = `---
title: "测试游戏"
---
# start
\`\`\`audio-gen
type: background_music
prompt: epic battle music with orchestral instruments
url: https://example.com/music.mp3
\`\`\`
开始战斗！
* [继续] -> next
`;
    const result = parse(dsl);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const playable = toPlayableGame(result.data);
    const startScene = playable.scenes['start'];
    const audioNode = startScene!.nodes.find((n) => n.type === 'ai_audio');

    expect(audioNode).toBeDefined();
    expect((audioNode as Record<string, unknown>)['prompt']).toBeUndefined();
    if (audioNode && 'audioType' in audioNode) {
      expect(audioNode.audioType).toBe('background_music');
    }
    if (audioNode && 'url' in audioNode) {
      expect(audioNode.url).toBe('https://example.com/music.mp3');
    }
  });
});
