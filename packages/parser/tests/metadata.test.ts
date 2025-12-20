import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import { Game } from '../src/types';

describe('metadata parser', () => {
  it('should correctly parse the YAML front matter', () => {
    const source = `---
title: "测试游戏"
description: "这是一个测试描述。"
tags: ["测试", "演示"]
state:
  health: 100
  has_key: false
ai:
  style:
    image: "fantasy"
---

# start
Must have a start scene.
`;

    const result = parse(source);

    // Expect success
    expect(result.success).toBe(true);
    const game = (result as { success: true; data: Game }).data;

    // Check metadata
    expect(game.title).toBe('测试游戏');
    expect(game.description).toBe('这是一个测试描述。');
    expect(game.tags).toEqual(['测试', '演示']);
    expect(game.published).toBe(false); // Default value

    // Check initial state
    expect(game.initialState).toEqual({ health: 100, has_key: false });

    // Check AI config
    expect(game.ai.style?.image).toBe('fantasy');

    // Check that scenes are empty
    expect(Object.keys(game.scenes).length).toBe(1);
  });

  it('should correctly parse published status', () => {
    const source = `---
title: "Published Game"
published: true
---
# start
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.published).toBe(true);
    }
  });

  it('should correctly parse backgroundStory (camelCase)', () => {
    const source = `---
title: "带背景故事的游戏"
description: "简短描述"
backgroundStory: |
  # 第一章：起源
  
  很久很久以前，在一个遥远的王国里...
  
  勇士踏上了冒险的旅程。
---
# start
游戏开始。
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.backgroundStory).toContain('第一章：起源');
      expect(result.data.backgroundStory).toContain('很久很久以前');
    }
  });

  it('should correctly parse background_story (snake_case for backward compatibility)', () => {
    const source = `---
title: "旧格式背景故事"
background_story: "这是一个使用旧格式的背景故事。"
---
# start
游戏开始。
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.backgroundStory).toBe('这是一个使用旧格式的背景故事。');
    }
  });

  it('should return an error if title is missing', () => {
    const source = `---
description: "没有标题"
---`;
    const result = parse(source);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('Title is required');
  });

  it('should handle documents without a YAML block', () => {
    const source = `# start`;
    const result = parse(source);
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('YAML front matter is missing or invalid');
  });
});
