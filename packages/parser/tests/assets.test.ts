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

    const node = result.data.scenes['start']?.nodes[0] as SceneNode;
    expect(node.type).toBe('static_image');
    if (node.type !== 'static_image') return;

    expect(node.alt).toBe('A beautiful forest');
    expect(node.url).toBe('https://example.com/forest.jpg');
  });

  it('should parse an ai-image from scene metadata', () => {
    const source = `---
title: "AI Image"
---
# start
\`\`\`yaml
image:
  prompt: A castle in the clouds
  character: lrrh
  url: https://some.url/image.png
\`\`\`
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    // AI 节点应该被插入到场景节点列表的最前面
    const node = result.data.scenes['start']?.nodes[0] as SceneNode;
    expect(node.type).toBe('ai_image');
    if (node.type !== 'ai_image') return;

    expect(node.prompt).toBe('A castle in the clouds');
    expect(node.character).toBe('lrrh');
    expect(node.url).toBe('https://some.url/image.png');
  });

  it('should parse an ai-image with multiple characters from metadata', () => {
    const source = `---
title: "Multi Char AI Image"
---
# start
\`\`\`yaml
image:
  prompt: Little Red Riding Hood meeting the Wolf
  characters: [lrrh, wolf]
\`\`\`
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const node = result.data.scenes['start']?.nodes[0] as SceneNode;
    expect(node.type).toBe('ai_image');
    if (node.type !== 'ai_image') return;

    expect(node.characters).toEqual(['lrrh', 'wolf']);
  });

  it('should parse an ai-audio from metadata', () => {
    const source = `---
title: "AI Audio"
---
# start
\`\`\`yaml
audio:
  type: background_music
  prompt: tense battle music
\`\`\`
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const node = result.data.scenes['start']?.nodes[0] as SceneNode;
    expect(node.type).toBe('ai_audio');
    if (node.type !== 'ai_audio') return;

    expect(node.audioType).toBe('background_music');
    expect(node.prompt).toBe('tense battle music');
  });

  it('should parse mixed content with metadata in correct order', () => {
    // 即使 metadata 写在最前面，解析出来的节点也应该在最前面
    const source = `---
title: "Mixed Content"
---
# start
\`\`\`yaml
image:
  prompt: something else
\`\`\`

Welcome to the scene.
![alt text](url)

* [A choice] -> next
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const nodes = result.data.scenes['start']?.nodes;
    expect(nodes?.length).toBe(4);
    expect(nodes?.[0].type).toBe('ai_image');
    expect(nodes?.[1].type).toBe('text');
    expect(nodes?.[2].type).toBe('static_image');
    expect(nodes?.[3].type).toBe('choice');
  });

  it('should attach audio comment on its own line to the preceding text node (issue #6)', () => {
    const source = `---
title: "Text Audio"
published: true
---

# start
欢迎，这段话带有旁白语音。
<!-- audio: https://example.com/a.mp3 -->
* [继续] -> next
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const node = result.data.scenes['start']?.nodes[0] as SceneNode;
    expect(node).toEqual({
      type: 'text',
      content: '欢迎，这段话带有旁白语音。',
      audio_url: 'https://example.com/a.mp3',
    });
  });

  it('should attach audio comment separated by a blank line to the preceding text node', () => {
    const source = `---
title: "Text Audio"
---
# start
这是场景的描述性文本。

<!-- audio: https://assets.example.com/audio/scene-text.wav -->

第二段没有语音。
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const nodes = result.data.scenes['start']?.nodes;
    expect(nodes?.[0]).toEqual({
      type: 'text',
      content: '这是场景的描述性文本。',
      audio_url: 'https://assets.example.com/audio/scene-text.wav',
    });
    expect(nodes?.[1]).toEqual({ type: 'text', content: '第二段没有语音。' });
  });

  it('should recover legacy same-line format <!-- audio: URL -->text without losing content', () => {
    // 旧版 stringify 把注释放在文本前面同一行，整行会被 CommonMark 吞成一个 html 块，
    // 解析时必须还原出文本内容和 audio_url，兼容已存盘的历史内容
    const source = `---
title: "Legacy Audio"
---
# start
<!-- audio: https://example.com/audio.wav -->妈妈说了一些话。

没有语音的文本。
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const nodes = result.data.scenes['start']?.nodes;
    expect(nodes?.[0]).toEqual({
      type: 'text',
      content: '妈妈说了一些话。',
      audio_url: 'https://example.com/audio.wav',
    });
    expect(nodes?.[1]).toEqual({ type: 'text', content: '没有语音的文本。' });
  });

  it('should ignore an audio comment with no preceding text node', () => {
    const source = `---
title: "Orphan Audio"
---
# start
<!-- audio: https://example.com/orphan.mp3 -->

正文在注释之后。
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const nodes = result.data.scenes['start']?.nodes;
    expect(nodes?.length).toBe(1);
    expect(nodes?.[0]).toEqual({ type: 'text', content: '正文在注释之后。' });
  });

  it('should parse choice (audio: URL) clause, also combined with if/set', () => {
    const source = `---
title: "Choice Audio"
---
# start
选择一个选项。

* [继续冒险] -> next_scene (audio: https://example.com/choice.wav)
* [购买药水] -> shop (if: gold > 10) (set: gold = gold - 10) (audio: https://example.com/buy.wav)
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const nodes = result.data.scenes['start']?.nodes;
    expect(nodes?.[1]).toEqual({
      type: 'choice',
      text: '继续冒险',
      nextSceneId: 'next_scene',
      audio_url: 'https://example.com/choice.wav',
    });
    expect(nodes?.[2]).toEqual({
      type: 'choice',
      text: '购买药水',
      nextSceneId: 'shop',
      condition: 'gold > 10',
      set: 'gold = gold - 10',
      audio_url: 'https://example.com/buy.wav',
    });
  });

  it('should parse a minigame from metadata', () => {
    const source = `---
title: "Minigame Test"
---
# start
\`\`\`yaml
minigame:
  prompt: 创建一个点击金色飞贼的游戏
  variables:
    snitch_caught: 捕获的飞贼数量
  url: https://example.com/minigames/1
\`\`\`
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const node = result.data.scenes['start']?.nodes[0] as SceneNode;
    expect(node.type).toBe('minigame');
    if (node.type !== 'minigame') return;

    expect(node.prompt).toBe('创建一个点击金色飞贼的游戏');
    expect(node.variables).toEqual({ snitch_caught: '捕获的飞贼数量' });
    expect(node.url).toBe('https://example.com/minigames/1');
  });
});
