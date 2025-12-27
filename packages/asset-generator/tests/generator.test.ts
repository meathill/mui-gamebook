import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Game } from '@mui-gamebook/parser';

// 捕获上传调用的参数
let uploadCalls: Array<{ fileName: string; contentType: string }> = [];

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
  s3Client: {
    send: vi.fn().mockImplementation((cmd) => {
      // 从 PutObjectCommand 中提取 Key 和 ContentType
      if (cmd.input) {
        uploadCalls.push({
          fileName: cmd.input.Key,
          contentType: cmd.input.ContentType,
        });
      }
      return Promise.resolve();
    }),
  },
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

vi.mock('../src/lib/cache', () => ({
  generateCacheFileName: vi.fn().mockReturnValue('test-cache.wav'),
  generateImageCacheFileName: vi.fn().mockReturnValue('test-image.png'),
  cacheExists: vi.fn().mockReturnValue(false),
  readCache: vi.fn(),
  writeCache: vi.fn(),
  isUploaded: vi.fn().mockReturnValue(null),
  markAsUploaded: vi.fn(),
}));

vi.mock('../src/lib/converter', () => ({
  imageToWebp: vi.fn().mockImplementation((buffer) => buffer), // 返回相同 buffer
}));

// Import after mocks
import { processGame, processNode } from '../src/lib/generator';
import * as tts from '../src/lib/tts';
import * as converter from '../src/lib/converter';

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
    await processGame(mockGame, false, { gameSlug: 'test-game' });
    expect(tts.generateStorySpeech).not.toHaveBeenCalled();
  });

  it('should NOT process TTS when tts option is empty object', async () => {
    await processGame(mockGame, false, { gameSlug: 'test-game', tts: {} });
    expect(tts.generateStorySpeech).not.toHaveBeenCalled();
  });

  it('should process scene text TTS when tts.sceneText is true', async () => {
    await processGame(mockGame, false, { gameSlug: 'test-game', tts: { sceneText: true } });
    expect(tts.generateStorySpeech).toHaveBeenCalledTimes(1);
  });

  it('should process choice TTS when tts.choices is true', async () => {
    await processGame(mockGame, false, { gameSlug: 'test-game', tts: { choices: true } });
    expect(tts.generateStorySpeech).toHaveBeenCalledTimes(1);
  });
});

describe('Image path and format', () => {
  beforeEach(() => {
    uploadCalls = [];
    vi.mocked(converter.imageToWebp).mockClear();
  });

  it('should use slug for image path, not title (scene image)', async () => {
    const mockGame: Game = {
      slug: 'my-game-slug',
      title: '中文游戏标题', // 中文标题不应出现在路径中
      initialState: {},
      ai: {},
      scenes: {},
    };

    const node = {
      type: 'ai_image' as const,
      prompt: 'test prompt',
    };

    await processNode(node, mockGame, false, 'my-game-slug');

    // 验证路径使用 slug 而非 title
    expect(uploadCalls.length).toBeGreaterThan(0);
    const lastUpload = uploadCalls[uploadCalls.length - 1];
    expect(lastUpload.fileName).toContain('my-game-slug');
    expect(lastUpload.fileName).not.toContain('中文');
  });

  it('should convert images to webp format', async () => {
    const mockGame: Game = {
      slug: 'test-game',
      title: 'Test Game',
      initialState: {},
      ai: {},
      scenes: {},
    };

    const node = {
      type: 'ai_image' as const,
      prompt: 'test prompt',
    };

    await processNode(node, mockGame, false, 'test-game');

    // 验证调用了 webp 转换
    expect(converter.imageToWebp).toHaveBeenCalled();

    // 验证上传的是 webp 格式
    expect(uploadCalls.length).toBeGreaterThan(0);
    const lastUpload = uploadCalls[uploadCalls.length - 1];
    expect(lastUpload.fileName).toContain('.webp');
    expect(lastUpload.contentType).toBe('image/webp');
  });

  it('should use slug for minigame path', async () => {
    const mockGame: Game = {
      slug: 'my-game-slug',
      title: '中文游戏标题',
      initialState: {},
      ai: {},
      scenes: {},
    };

    const node = {
      type: 'minigame' as const,
      prompt: 'create a simple game',
    };

    await processNode(node, mockGame, false, 'my-game-slug');

    // 验证路径使用 slug 而非 title
    expect(uploadCalls.length).toBeGreaterThan(0);
    const lastUpload = uploadCalls[uploadCalls.length - 1];
    expect(lastUpload.fileName).toContain('my-game-slug');
    expect(lastUpload.fileName).not.toContain('中文');
  });
});
