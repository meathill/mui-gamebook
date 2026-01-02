/**
 * prompt-generator 模块测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Game } from '@mui-gamebook/parser';
import { findScenesWithoutImages, buildAIContext, insertImageNodes } from '../src/lib/prompt-generator';

// Mock AI provider
vi.mock('../src/lib/config', () => ({
  getAiProvider: vi.fn(() => ({
    type: 'google',
    chatWithTools: vi.fn(),
  })),
}));

describe('findScenesWithoutImages', () => {
  it('should find scenes without images', () => {
    const game = {
      title: 'Test Game',
      scenes: {
        start: {
          id: 'start',
          nodes: [{ type: 'text', content: 'Hello world' }],
        },
        withImage: {
          id: 'withImage',
          nodes: [
            { type: 'ai_image', prompt: 'test prompt', url: 'https://example.com/image.png' },
            { type: 'text', content: 'Scene with image' },
          ],
        },
        noImage: {
          id: 'noImage',
          nodes: [{ type: 'text', content: 'No image here' }],
        },
      },
      ai: {},
    } as unknown as Game;

    const result = findScenesWithoutImages(game);

    expect(result).toHaveLength(3);
    expect(result.find((s) => s.sceneId === 'start')?.hasImage).toBe(false);
    expect(result.find((s) => s.sceneId === 'withImage')?.hasImage).toBe(true);
    expect(result.find((s) => s.sceneId === 'noImage')?.hasImage).toBe(false);
  });

  it('should detect static_image as having image', () => {
    const game = {
      title: 'Test Game',
      scenes: {
        scene1: {
          id: 'scene1',
          nodes: [{ type: 'static_image', url: 'https://example.com/static.png' }],
        },
      },
      ai: {},
    } as unknown as Game;

    const result = findScenesWithoutImages(game);

    expect(result[0].hasImage).toBe(true);
  });

  it('should collect text content from scenes', () => {
    const game = {
      title: 'Test Game',
      scenes: {
        scene1: {
          id: 'scene1',
          nodes: [
            { type: 'text', content: 'First paragraph' },
            { type: 'text', content: 'Second paragraph' },
          ],
        },
      },
      ai: {},
    } as unknown as Game;

    const result = findScenesWithoutImages(game);

    expect(result[0].textContent).toBe('First paragraph\nSecond paragraph');
  });
});

describe('buildAIContext', () => {
  it('should build context with game info', () => {
    const game = {
      title: 'Test Game',
      slug: 'test-game',
      ai: {},
      scenes: {},
    } as unknown as Game;

    const context = buildAIContext(game, []);

    expect(context).toContain('Test Game');
    expect(context).toContain('test-game');
  });

  it('should include image style if present', () => {
    const game = {
      title: 'Test Game',
      ai: { style: { image: 'anime style, vibrant colors' } },
      scenes: {},
    } as unknown as Game;

    const context = buildAIContext(game, []);

    expect(context).toContain('anime style, vibrant colors');
  });

  it('should include character definitions', () => {
    const game = {
      title: 'Test Game',
      ai: {
        characters: {
          hero: { name: 'Hero', description: 'The protagonist' },
          villain: { name: 'Villain', image_prompt: 'dark figure' },
        },
      },
      scenes: {},
    } as unknown as Game;

    const context = buildAIContext(game, []);

    expect(context).toContain('hero');
    expect(context).toContain('Hero');
    expect(context).toContain('The protagonist');
    expect(context).toContain('villain');
    expect(context).toContain('dark figure');
  });

  it('should include scenes without images', () => {
    const game = {
      title: 'Test Game',
      ai: {},
      scenes: {},
    } as unknown as Game;

    const scenesWithoutImages = [
      { sceneId: 'intro', hasImage: false, textContent: 'Welcome to the game' },
      { sceneId: 'ending', hasImage: false, textContent: 'The End' },
    ];

    const context = buildAIContext(game, scenesWithoutImages);

    expect(context).toContain('intro');
    expect(context).toContain('Welcome to the game');
    expect(context).toContain('ending');
    expect(context).toContain('The End');
  });
});

describe('insertImageNodes', () => {
  it('should insert ai_image nodes at the beginning of scenes', () => {
    const game = {
      title: 'Test Game',
      scenes: {
        scene1: {
          id: 'scene1',
          nodes: [{ type: 'text', content: 'Hello' }],
        },
      },
      ai: {},
    } as unknown as Game;

    const prompts = [{ sceneId: 'scene1', imagePrompt: 'beautiful landscape' }];

    const result = insertImageNodes(game, prompts);

    expect(result.scenes.scene1.nodes).toHaveLength(2);
    expect(result.scenes.scene1.nodes[0].type).toBe('ai_image');
    expect((result.scenes.scene1.nodes[0] as { prompt: string }).prompt).toBe('beautiful landscape');
  });

  it('should not modify original game object', () => {
    const game = {
      title: 'Test Game',
      scenes: {
        scene1: {
          id: 'scene1',
          nodes: [{ type: 'text', content: 'Hello' }],
        },
      },
      ai: {},
    } as unknown as Game;

    const prompts = [{ sceneId: 'scene1', imagePrompt: 'test' }];

    insertImageNodes(game, prompts);

    expect(game.scenes.scene1.nodes).toHaveLength(1);
  });

  it('should skip scenes that already have images', () => {
    const game = {
      title: 'Test Game',
      scenes: {
        scene1: {
          id: 'scene1',
          nodes: [
            { type: 'ai_image', prompt: 'existing', url: 'https://example.com' },
            { type: 'text', content: 'Hello' },
          ],
        },
      },
      ai: {},
    } as unknown as Game;

    const prompts = [{ sceneId: 'scene1', imagePrompt: 'new prompt' }];

    const result = insertImageNodes(game, prompts);

    expect(result.scenes.scene1.nodes).toHaveLength(2);
    expect((result.scenes.scene1.nodes[0] as { prompt: string }).prompt).toBe('existing');
  });

  it('should skip non-existent scenes', () => {
    const game = {
      title: 'Test Game',
      scenes: {},
      ai: {},
    } as unknown as Game;

    const prompts = [{ sceneId: 'nonexistent', imagePrompt: 'test' }];

    // Should not throw
    const result = insertImageNodes(game, prompts);

    expect(Object.keys(result.scenes)).toHaveLength(0);
  });
});
