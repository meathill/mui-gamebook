import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';

describe('parser edge cases', () => {
  it('should handle duplicate scene IDs by overwriting (last one wins)', () => {
    const source = `---
title: "Duplicate ID Test"
---
# start
First start scene.

---

# start
Second start scene.
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      const scene = result.data.scenes['start'];
      expect(scene?.nodes[0].content).toBe('Second start scene.');
    }
  });

  it('should correctly parse scene IDs with hyphens, underscores, and numbers', () => {
    const source = `---
title: "Complex ID Test"
---
# start
Go to complex scenes.
* [Go] -> scene-123
* [Go] -> scene_abc
* [Go] -> 123scene

---

# scene-123
Hyphen scene.

---

# scene_abc
Underscore scene.

---

# 123scene
Number start scene.
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scenes['scene-123'] !== undefined).toBe(true);
      expect(result.data.scenes['scene_abc'] !== undefined).toBe(true);
      expect(result.data.scenes['123scene'] !== undefined).toBe(true);
    }
  });

  it('should handle empty scenes', () => {
    const source = `---
title: "Empty Scene Test"
---
# start
Text.

---

# empty_one

---

# empty_two
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      const emptyOne = result.data.scenes['empty_one'];
      const emptyTwo = result.data.scenes['empty_two'];
      expect(emptyOne).toBeDefined();
      expect(emptyOne?.nodes.length).toBe(0);
      expect(emptyTwo).toBeDefined();
      expect(emptyTwo?.nodes.length).toBe(0);
    }
  });

  it('should fail gracefully on malformed YAML', () => {
    const source = `---
title: "Bad YAML"
  description: Indentation error
---
# start
`;
    const result = parse(source);
    expect(result.success).toBe(false);
    expect((result as any).error).toContain('YAML parsing failed');
  });

  it('should fail if the start scene is missing', () => {
    const source = `---
title: "No Start"
---
# intro
This is not start.
`;
    const result = parse(source);
    expect(result.success).toBe(false);
    expect((result as any).error).toBe("Game must contain a 'start' scene.");
  });
});
