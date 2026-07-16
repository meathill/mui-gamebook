import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { buildPublicUrl, stripTimestampPrefix } from '../src/lib/utils';

describe('filename utils regression test', () => {
  const cleanFilename = (filePath: string) => {
    return stripTimestampPrefix(path.basename(filePath, '.png'));
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

describe('buildPublicUrl - R2 key → 公开 URL（issue #8：Unicode 场景 ID）', () => {
  const base = 'https://assets.example.com';

  it('纯 ASCII key 恒等，不影响存量 URL', () => {
    expect(buildPublicUrl(base, 'audio/hp4/ball_dance-text-0-a1b2c3d4.mp3')).toBe(
      `${base}/audio/hp4/ball_dance-text-0-a1b2c3d4.mp3`,
    );
  });

  it('含中文的 key 做 percent-encode，且保留路径分隔符', () => {
    const url = buildPublicUrl(base, 'audio/hp4/中文场景-text-0-a1b2c3d4.mp3');
    expect(url).toBe(`${base}/audio/hp4/${encodeURIComponent('中文场景')}-text-0-a1b2c3d4.mp3`);
  });
});
