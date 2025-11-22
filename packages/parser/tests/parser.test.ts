import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';

describe('parser', () => {
  it('should successfully parse a minimal valid document', () => {
    const source = `---
title: "My Test Game"
---
# start
Welcome!`;
    const result = parse(source);
    // Ensure the parser now succeeds with a valid document
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('My Test Game');
    }
  });

  it('should fail to parse an empty string', () => {
    const source = '';
    const result = parse(source);
    expect(result.success).toBe(false);
  });
});
