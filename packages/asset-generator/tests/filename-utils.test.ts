import { describe, it, expect } from 'vitest';
import path from 'node:path';

describe('filename utils regression test', () => {
  // Logic copied from upload-game.ts for verification
  // const cleanBasename = path.basename(filePath, '.png').replace(/^\d+-/, '');

  const cleanFilename = (filePath: string) => {
    return path.basename(filePath, '.png').replace(/^\d+-/, '');
  };

  it('should strip existing timestamp from filename', () => {
    const input = '/path/to/1768371908430-hp4_priori_incantatem.png';
    const result = cleanFilename(input);
    expect(result).toBe('hp4_priori_incantatem');
  });

  it('should not strip if no timestamp', () => {
    const input = '/path/to/hp4_scene.png';
    const result = cleanFilename(input);
    expect(result).toBe('hp4_scene');
  });

  it('should handle multiple timestamp-looking prefixes (only first one usually handled by logic, but let see requirement)', () => {
    // Current logic is ^\d+-
    // If filename is 123-456-name.png, it strips 123-. Result 456-name. This is expected behavior (strip one level).
    const input = '123-456-name.png';
    const result = cleanFilename(input);
    expect(result).toBe('456-name');
  });
});
