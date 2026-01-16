import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processGame } from '../src/lib/upload/game-processor';
import fs from 'node:fs';

// Explicitly mock node:fs to ensure we control the mock functions
vi.mock('node:fs', () => {
  return {
    default: {
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    },
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

// Mock parser
vi.mock('@mui-gamebook/parser', () => ({
  parse: (src: string) => {
    if (src.includes('# start')) {
      return {
        success: true,
        data: {
          slug: 'test-game',
          scenes: {
            start: {
              id: 'start',
              nodes: [
                { type: 'ai_image', url: 'assets/local.png' }, // Local relative path
                { type: 'ai_image', url: 'https://remote.com/existing.webp' }, // Remote WebP (should skip)
                { type: 'ai_image', url: 'https://remote.com/legacy.png' }, // Remote PNG (should re-upload)
              ],
            },
          },
          ai: {
            characters: {
              hero: { image_url: 'assets/hero.png' }, // Local relative char
              villain: { image_url: 'https://remote.com/villain.png' }, // Remote PNG char
            },
          },
          cover_image: 'https://remote.com/cover.png', // Remote PNG cover
        },
      };
    }
    return { success: false, error: 'mock parse error' };
  },
  stringify: (game: any) => 'mock markdown',
}));

describe('game-processor regression tests', () => {
  const mockMdPath = '/project/game.md';
  // Note: we're mocking fs, so we don't care about real paths.

  beforeEach(() => {
    vi.resetAllMocks();
    // Default: files exist
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it('should resolve local relative paths for scene assets', async () => {
    const markdown = `# start`;
    vi.mocked(fs.readFileSync).mockReturnValue(markdown);

    const uploadFn = vi.fn().mockResolvedValue('https://uploaded.com/new.webp');

    // Setup fs mocks for existence check
    vi.mocked(fs.existsSync).mockImplementation((p: string | Buffer | URL) => {
      const pathStr = p.toString();
      // Logic from code: path.resolve(path.dirname(markdownPath), assetPath)
      // dirname('/project/game.md') -> '/project'
      // resolve('/project', 'assets/local.png') -> '/project/assets/local.png'
      if (pathStr === '/project/assets/local.png') return true;
      return false;
    });

    await processGame(mockMdPath, new Map(), new Map(), null, uploadFn);

    // Should upload local.png (resolved)
    expect(uploadFn).toHaveBeenCalledWith('/project/assets/local.png', 'image');
  });

  it('should skip existing remote WebP assets', async () => {
    const markdown = `# start`;
    vi.mocked(fs.readFileSync).mockReturnValue(markdown);
    const uploadFn = vi.fn().mockResolvedValue('https://uploaded.com/new.webp');

    await processGame(mockMdPath, new Map(), new Map(), null, uploadFn);

    const calls = uploadFn.mock.calls.map((c) => c[0]);
    // 'existing.webp' should NOT be uploaded
    expect(calls.some((arg) => arg.includes('existing.webp'))).toBe(false);
  });

  it('should re-upload remote PNG assets (Scene, Character, Cover) for WebP migration', async () => {
    const markdown = `# start`;
    vi.mocked(fs.readFileSync).mockReturnValue(markdown);
    const uploadFn = vi.fn().mockResolvedValue('https://uploaded.com/converted.webp');

    const portraits = new Map();
    portraits.set('villain', '/project/assets/villain_source.png');

    vi.mocked(fs.existsSync).mockImplementation((p: string | Buffer | URL) => {
      const pathStr = p.toString();
      if (pathStr === '/project/assets/legacy.png') return true;
      if (pathStr === '/project/assets/villain_source.png') return true;
      if (pathStr === '/project/assets/cover_source.png') return true;
      return false;
    });

    await processGame(mockMdPath, new Map(), portraits, '/project/assets/cover_source.png', uploadFn);

    // Expect uploads
    // Scene legacy
    expect(uploadFn).toHaveBeenCalledWith('/project/assets/legacy.png', 'image');
    // Character villain (sourced from portraits map)
    expect(uploadFn).toHaveBeenCalledWith('/project/assets/villain_source.png', 'image');
    // Cover
    expect(uploadFn).toHaveBeenCalledWith('/project/assets/cover_source.png', 'image');
  });

  it('should resolve local relative path for character images', async () => {
    // Hero has 'assets/hero.png' in AST
    const markdown = `# start`;
    vi.mocked(fs.readFileSync).mockReturnValue(markdown);
    const uploadFn = vi.fn().mockResolvedValue('https://ul.com/hero.webp');

    vi.mocked(fs.existsSync).mockImplementation((p: string | Buffer | URL) => {
      const pathStr = p.toString();
      if (pathStr === '/project/assets/hero.png') return true;
      return false;
    });

    await processGame(mockMdPath, new Map(), new Map(), null, uploadFn);

    expect(uploadFn).toHaveBeenCalledWith('/project/assets/hero.png', 'image');
  });
});
