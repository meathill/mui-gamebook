import { describe, it, expect } from 'vitest';
import { parse, stringify } from '../src/index';
import type { VariableMeta } from '../src/types';

describe('Variable Metadata', () => {
  it('should parse simple state variables', () => {
    const source = `---
title: Test Game
state:
  gold: 10
  has_key: false
  name: Hero
---

# start

Welcome!
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.initialState.gold).toBe(10);
      expect(result.data.initialState.has_key).toBe(false);
      expect(result.data.initialState.name).toBe('Hero');
    }
  });

  it('should parse variable metadata with visibility', () => {
    const source = `---
title: Test Game
state:
  health:
    value: 100
    visible: true
    display: progress
    max: 100
    label: 生命值
---

# start

Welcome!
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      const health = result.data.initialState.health as VariableMeta;
      expect(health.value).toBe(100);
      expect(health.visible).toBe(true);
      expect(health.display).toBe('progress');
      expect(health.max).toBe(100);
      expect(health.label).toBe('生命值');
    }
  });

  it('should parse variable with trigger', () => {
    const source = `---
title: Test Game
state:
  health:
    value: 100
    visible: true
    display: progress
    max: 100
    trigger:
      condition: "<= 0"
      scene: game_over
---

# start

Welcome!

---

# game_over

Game Over!
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      const health = result.data.initialState.health as VariableMeta;
      expect(health.trigger).toBeDefined();
      expect(health.trigger?.condition).toBe('<= 0');
      expect(health.trigger?.scene).toBe('game_over');
    }
  });

  it('should stringify simple state correctly', () => {
    const source = `---
title: Test Game
state:
  gold: 10
  has_key: false
---

# start

Welcome!
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      const output = stringify(result.data);
      expect(output).toContain('state:');
      expect(output).toContain('gold: 10');
      expect(output).toContain('has_key: false');
    }
  });

  it('should stringify variable metadata correctly', () => {
    const source = `---
title: Test Game
state:
  health:
    value: 100
    visible: true
    display: progress
    max: 100
    label: 生命值
---

# start

Welcome!
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      const output = stringify(result.data);
      expect(output).toContain('health:');
      expect(output).toContain('value: 100');
      expect(output).toContain('visible: true');
      expect(output).toContain('display: progress');
      expect(output).toContain('max: 100');
      expect(output).toContain('label: 生命值');
    }
  });

  it('should stringify trigger correctly', () => {
    const source = `---
title: Test Game
state:
  health:
    value: 100
    trigger:
      condition: "<= 0"
      scene: game_over
---

# start

Welcome!

---

# game_over

Game Over!
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      const output = stringify(result.data);
      expect(output).toContain('trigger:');
      expect(output).toContain('condition:');
      expect(output).toContain('scene: game_over');
    }
  });

  it('should handle mixed simple and metadata variables', () => {
    const source = `---
title: Test Game
state:
  gold: 50
  health:
    value: 100
    visible: true
    display: progress
    max: 100
  has_key: false
---

# start

Welcome!
`;
    const result = parse(source);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.initialState.gold).toBe(50);
      expect(result.data.initialState.has_key).toBe(false);
      
      const health = result.data.initialState.health as VariableMeta;
      expect(health.value).toBe(100);
      expect(health.visible).toBe(true);
    }
  });
});
