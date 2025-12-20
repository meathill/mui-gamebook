import { describe, it, expect } from 'vitest';
import { parse } from '../src';

describe('scene parser', () => {
  it('should parse a document with a single scene', () => {
    const source = `---
title: "Scene Test"
---
# start
This is the first scene.
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.keys(result.data.scenes).length).toBe(1);
    expect(result.data.scenes['start']).toBeDefined();

    const scene = result.data.scenes['start'];
    expect(scene?.id).toBe('start');
    expect(scene?.nodes.length).toBe(1);
    expect(scene?.nodes[0]).toEqual({ type: 'text', content: 'This is the first scene.' });
  });

  it('should parse a document with multiple scenes', () => {
    const source = `---
title: "Multi-Scene Test"
---
# start
Content of scene 1.

---

# scene2
Content of scene 2.
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.keys(result.data.scenes).length).toBe(2);
    expect(result.data.scenes['start']).toBeDefined();
    expect(result.data.scenes['scene2']).toBeDefined();

    const scene2 = result.data.scenes['scene2'];
    expect(scene2?.nodes[0]).toEqual({ type: 'text', content: 'Content of scene 2.' });
  });

  it('should correctly trim whitespace around scene content', () => {
    const source = `---
title: "Whitespace Test"
---

# start

  Some content with spaces.  

`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const scene = result.data.scenes['start'];
    expect(scene?.nodes[0]).toEqual({ type: 'text', content: 'Some content with spaces.' });
  });

  it('should handle scenes with no content', () => {
    const source = `---
title: "Empty Scene"
---
# start
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const scene = result.data.scenes['start'];
    expect(scene).toBeDefined();
    expect(scene?.nodes.length).toBe(0);
  });
});
