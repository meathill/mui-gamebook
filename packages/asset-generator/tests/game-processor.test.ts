
import { describe, it, expect, vi } from 'vitest';
import { processGame } from '../src/lib/upload/game-processor';
import fs from 'node:fs';

vi.mock('node:fs');

describe('game-processor', () => {
  it('should match scene_ prefixed assets to scene ids', async () => {
    const mockMarkdown = `---
title: Test Game
description: Test description
---
# start
\`\`\`image-gen
prompt: Start scene
\`\`\`
**Start**
`;
    vi.spyOn(fs, 'readFileSync').mockReturnValue(mockMarkdown);

    const keyMap = new Map<string, string>();
    keyMap.set('scene_start', '/tmp/scene_start.webp'); // Simulating asset-finder output

    const portraits = new Map<string, string>();
    const uploadFn = vi.fn().mockResolvedValue('https://example.com/start.webp');

    const result = await processGame(
      'dummy.md',
      keyMap,
      portraits,
      null,
      uploadFn
    );

    // Expect the markdown to contain the URL
    expect(result.markdown).toContain('url: https://example.com/start.webp');
  });
});
