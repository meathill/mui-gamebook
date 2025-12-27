import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Game } from '@mui-gamebook/parser';

// Mock all dependencies - these need to be self-contained
vi.mock('../src/lib/config', () => ({
  getAiProvider: vi.fn(() => ({
    generateImage: vi.fn().mockResolvedValue({
      buffer: Buffer.from('test'),
      type: 'image/png',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }),
    generateMiniGame: vi.fn().mockResolvedValue({
      code: 'console.log("test")',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }),
  })),
  s3Client: { send: vi.fn() },
  R2_BUCKET: 'test-bucket',
  R2_PUBLIC_URL: 'https://test.r2.dev',
  DEFAULT_TTS_VOICE: 'Aoede',
}));

vi.mock('../src/lib/usage', () => ({
  addUsage: vi.fn(),
}));

vi.mock('../src/lib/tts', () => ({
  generateStorySpeech: vi.fn().mockResolvedValue({
    buffer: Buffer.from('audio'),
    mimeType: 'audio/wav',
  }),
}));

// Import after mocks
import { processGame } from '../src/lib/generator';
import * as tts from '../src/lib/tts';

describe('processGame TTS options', () => {
  const mockGame: Game = {
    slug: 'test-game',
    title: 'Test Game',
    initialState: {},
    ai: { characters: {} },
    scenes: {
      start: {
        id: 'start',
        nodes: [
          { type: 'text', content: 'Hello world' },
          { type: 'choice', text: 'Go next', nextSceneId: 'next' },
        ],
      },
    },
  };

  beforeEach(() => {
    vi.mocked(tts.generateStorySpeech).mockClear();
  });

  it('should NOT process TTS when tts option is not provided', async () => {
    await processGame(mockGame, false);
    expect(tts.generateStorySpeech).not.toHaveBeenCalled();
  });

  it('should NOT process TTS when tts option is empty object', async () => {
    await processGame(mockGame, false, { tts: {} });
    expect(tts.generateStorySpeech).not.toHaveBeenCalled();
  });

  it('should process scene text TTS when tts.sceneText is true', async () => {
    await processGame(mockGame, false, { tts: { sceneText: true } });
    expect(tts.generateStorySpeech).toHaveBeenCalledTimes(1);
  });

  it('should process choice TTS when tts.choices is true', async () => {
    await processGame(mockGame, false, { tts: { choices: true } });
    expect(tts.generateStorySpeech).toHaveBeenCalledTimes(1);
  });
});
