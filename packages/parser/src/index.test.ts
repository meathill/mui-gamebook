import { describe, it, expect } from 'vitest';
import { parse } from './index';

describe('parser', () => {
  it('should successfully parse a non-empty string', () => {
    const source = '# start';
    const result = parse(source);
    expect(result.success).toBe(true);
  });

  it('should fail to parse an empty string', () => {
    const source = '';
    const result = parse(source);
    expect(result.success).toBe(false);
  });
});
