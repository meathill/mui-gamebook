import { describe, expect, it } from 'vitest';
import { parse } from '../src';

describe('parser cover frontmatter alias', () => {
  it('兼容使用 cover 作为 cover_image', () => {
    const md = `---
title: 测试游戏
cover: "https://example.com/cover.webp"
---

# start
游戏开始。

* [离开] -> exit
`;

    const result = parse(md);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cover_image).toBe('https://example.com/cover.webp');
    }
  });

  it('优先使用 cover_image', () => {
    const md = `---
title: 测试游戏
cover_image: "https://example.com/cover-main.webp"
cover: "https://example.com/cover-alt.webp"
---

# start
游戏开始。

* [离开] -> exit
`;

    const result = parse(md);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cover_image).toBe('https://example.com/cover-main.webp');
    }
  });
});
