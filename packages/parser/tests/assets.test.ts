import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import { SceneNode } from '../src/types';

describe('assets parser', () => {
  it('should parse a static markdown image', () => {
    const source = `---
title: "Static Image"
---
# start
![A beautiful forest](https://example.com/forest.jpg)
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const node = result.data.scenes.get('start')?.nodes[0] as SceneNode;
    expect(node.type).toBe('static_image');
    if (node.type !== 'static_image') return;

    expect(node.alt).toBe('A beautiful forest');
    expect(node.url).toBe('https://example.com/forest.jpg');
  });

  it('should parse an ai-image generation block', () => {
    const source = `---
title: "AI Image"
---
# start
\`\`\`image-gen
  prompt: A castle in the clouds
  character: lrrh
  url: https://some.url/image.png
\`\`\`
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const node = result.data.scenes.get('start')?.nodes[0] as SceneNode;
    expect(node.type).toBe('ai_image');
    if (node.type !== 'ai_image') return;

    expect(node.prompt).toBe('A castle in the clouds');
    expect(node.character).toBe('lrrh');
    expect(node.url).toBe('https://some.url/image.png');
  });

  it('should parse an ai-image generation block with multiple characters', () => {
    const source = `---
title: "Multi Char AI Image"
---
# start
\`\`\`image-gen
prompt: Little Red Riding Hood meeting the Wolf
characters: [lrrh, wolf]
\`\`\`
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const node = result.data.scenes.get('start')?.nodes[0] as SceneNode;
    expect(node.type).toBe('ai_image');
    if (node.type !== 'ai_image') return;

    expect(node.characters).toEqual(['lrrh', 'wolf']);
  });

  it('should parse an ai-audio generation block', () => {
    const source = `--- 
title: "AI Audio"
---
# start
\`\`\`audio-gen
  type: background_music
  prompt: tense battle music
\`\`\`
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const node = result.data.scenes.get('start')?.nodes[0] as SceneNode;
    expect(node.type).toBe('ai_audio');
    if (node.type !== 'ai_audio') return;

    expect(node.audioType).toBe('background_music');
    expect(node.prompt).toBe('tense battle music');
  });

  it('should parse mixed content in order', () => {
    const source = `--- 
title: "Mixed Content"
---
# start
\`\`\`image-gen
  prompt: something else
\`\`\`

Welcome to the scene.
![alt text](url)

* [A choice] -> next
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const nodes = result.data.scenes.get('start')?.nodes;
    expect(nodes?.length).toBe(4);
    expect(nodes?.[0].type).toBe('ai_image');
    expect(nodes?.[1].type).toBe('text');
    expect(nodes?.[2].type).toBe('static_image');
    expect(nodes?.[3].type).toBe('choice');
  });

  it('should parse a minigame-gen block', () => {
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

    const node = result.data.scenes.get('start')?.nodes[0] as SceneNode;
    expect(node.type).toBe('minigame');
    if (node.type !== 'minigame') return;

    expect(node.prompt).toBe('创建一个点击金色飞贼的游戏');
    expect(node.variables).toEqual({ snitch_caught: '捕获的飞贼数量' });
    expect(node.url).toBe('https://example.com/minigames/1');
  });

  it('should parse a minigame-gen block with object-style variables', () => {
    const source = `---
title: "Minigame Object Vars"
---
# start
\`\`\`minigame-gen
prompt: 记忆配对游戏
variables:
  score: 得分
  time_left: 剩余时间
\`\`\`
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const node = result.data.scenes.get('start')?.nodes[0] as SceneNode;
    expect(node.type).toBe('minigame');
    if (node.type !== 'minigame') return;

    expect(node.prompt).toBe('记忆配对游戏');
    expect(node.variables).toEqual({ score: '得分', time_left: '剩余时间' });
  });
});
