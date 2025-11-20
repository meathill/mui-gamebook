import { describe, it, expect } from 'vitest';
import { parse } from './index';

describe('choice parser', () => {
  it('should parse a simple choice', () => {
    const source = `---
title: "Choice Test"
---
# scene1
Some text.
* [Go to scene 2] -> scene2
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const scene = result.data.scenes.get('scene1');
    expect(scene?.nodes.length).toBe(2);
    expect(scene?.nodes[1]).toEqual({
      type: 'choice',
      text: 'Go to scene 2',
      nextSceneId: 'scene2',
    });
  });

  it('should parse a choice with an (if) condition', () => {
    const source = `---
title: "If Test"
---
# start
* [Use the key] -> unlocked (if: has_key == true)
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const choiceNode = result.data.scenes.get('start')?.nodes[0];
    expect(choiceNode?.type).toBe('choice');
    if (choiceNode?.type !== 'choice') return;

    expect(choiceNode.condition).toBe('has_key == true');
  });

  it('should parse a choice with a (set) modification', () => {
    const source = `---
title: "Set Test"
---
# start
* [Take the key] -> room (set: has_key = true, gold = gold-1)
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const choiceNode = result.data.scenes.get('start')?.nodes[0];
    expect(choiceNode?.type).toBe('choice');
    if (choiceNode?.type !== 'choice') return;

    expect(choiceNode.set).toBe('has_key = true, gold = gold-1');
  });

  it('should parse a choice with both (if) and (set) clauses', () => {
    const source = `---
title: "Complex Test"
---
# start
* [Open the chest] -> treasure (if: has_key == true) (set: has_key = false)
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const choiceNode = result.data.scenes.get('start')?.nodes[0];
    expect(choiceNode?.type).toBe('choice');
    if (choiceNode?.type !== 'choice') return;

    expect(choiceNode.condition).toBe('has_key == true');
    expect(choiceNode.set).toBe('has_key = false');
  });

  it('should maintain the correct order of text and choices', () => {
    const source = `---
title: "Order Test"
---
# a_scene
Text before choice.
* [The Choice] -> somewhere
Text after choice.
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const scene = result.data.scenes.get('a_scene');
    expect(scene?.nodes.length).toBe(3);
    expect(scene?.nodes[0].type).toBe('text');
    expect(scene?.nodes[1].type).toBe('choice');
    expect(scene?.nodes[2].type).toBe('text');
    expect((scene?.nodes[1] as any).text).toBe('The Choice');
  });
});
