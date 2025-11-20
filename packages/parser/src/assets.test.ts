import { describe, it, expect } from 'vitest';
import { parse } from './index';
import { SceneNode } from './types';

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
\
  prompt: A castle in the clouds
  character: lrrh
  url: https://some.url/image.png
\
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

  it('should parse an ai-audio generation block', () => {
    const source = `--- 
title: "AI Audio"
---
# start
\
  type: background_music
  prompt: tense battle music
\
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
Welcome to the scene.
![alt text](url)
* [A choice] -> next
\
  prompt: something else
\
Final text.
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const nodes = result.data.scenes.get('start')?.nodes;
    expect(nodes?.length).toBe(5);
    expect(nodes?.[0].type).toBe('text');
    expect(nodes?.[1].type).toBe('static_image');
    expect(nodes?.[2].type).toBe('choice');
    expect(nodes?.[3].type).toBe('ai_image');
    expect(nodes?.[4].type).toBe('text');
  });
});
