import { describe, it, expect } from 'vitest';
import { parse } from '../src';

describe('scene parser', () => {
  it('should parse a document with a single scene', () => {
    const source = `---
title: "Scene Test"
---
# first_scene
This is the first scene.
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.scenes.size).toBe(1);
    expect(result.data.scenes.has('first_scene')).toBe(true);

    const scene = result.data.scenes.get('first_scene');
    expect(scene?.id).toBe('first_scene');
    expect(scene?.nodes.length).toBe(1);
    expect(scene?.nodes[0]).toEqual({ type: 'text', content: 'This is the first scene.' });
  });

  it('should parse a document with multiple scenes', () => {
    const source = `---
title: "Multi-Scene Test"
---
# scene1
Content of scene 1.

---

# scene2
Content of scene 2.
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.scenes.size).toBe(2);
    expect(result.data.scenes.has('scene1')).toBe(true);
    expect(result.data.scenes.has('scene2')).toBe(true);

    const scene2 = result.data.scenes.get('scene2');
    expect(scene2?.nodes[0]).toEqual({ type: 'text', content: 'Content of scene 2.' });
  });

  it('should correctly trim whitespace around scene content', () => {
    const source = `---
title: "Whitespace Test"
---

# a_scene

  Some content with spaces.  

`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const scene = result.data.scenes.get('a_scene');
    expect(scene?.nodes[0]).toEqual({ type: 'text', content: 'Some content with spaces.' });
  });

  it('should handle scenes with no content', () => {
    const source = `---
title: "Empty Scene"
---
# empty_scene
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const scene = result.data.scenes.get('empty_scene');
    expect(scene).toBeDefined();
    expect(scene?.nodes.length).toBe(0);
  });
});
