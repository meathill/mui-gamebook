import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'node:path';
import { findAssets } from '../src/lib/upload/asset-finder';
import { processGame } from '../src/lib/upload/game-processor';
import fs from 'node:fs';

// Mocks
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock Parser
vi.mock('@mui-gamebook/parser', async () => {
  return {
    parse: vi.fn(),
    stringify: vi.fn(),
  };
});

describe('Upload Modules', () => {

  describe('findAssets', () => {
    it('should map assets correctly', () => {
      const mockDir = '/assets';
      (fs.existsSync as any).mockImplementation((p: string) => {
        // Mock directory exists, but mapping.json does not
        if (p === mockDir) return true;
        if (p.endsWith('mapping.json')) return false;
        return true;
      });

      const timestamp = '1767962947279';
      (fs.readdirSync as any).mockReturnValue([
        'cover.png',
        'hero_portrait.webp',
        'scene_01.png',
        `scene_02_${timestamp}.png`,
        'minigame.js'
      ]);
      (fs.statSync as any).mockReturnValue({ isDirectory: () => false });

      const result = findAssets(mockDir);

      expect(result.coverPath).toBe(path.join(mockDir, 'cover.png'));
      expect(result.portraits.get('hero')).toBe(path.join(mockDir, 'hero_portrait.webp'));
      expect(result.assets.get('scene_01')).toBe(path.join(mockDir, 'scene_01.png'));
      expect(result.assets.get('scene_02')).toBe(path.join(mockDir, `scene_02_${timestamp}.png`));
      // Minigames logic might need adjustment in finder if not explicitly tested yet
      // Current finder expects explicit mapping logic for minigame suffix, let's verify
    });
  });

  // More tests can be added here
});
