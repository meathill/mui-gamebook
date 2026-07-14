import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Game } from '@mui-gamebook/parser';

// vi.mock 会被 hoist 到文件顶部，工厂函数里直接引用（非嵌套闭包）的外部变量必须通过
// vi.hoisted 声明，否则会在初始化之前被访问（TDZ ReferenceError）
const { mockChatWithTools, mockCacheStore } = vi.hoisted(() => ({
  mockChatWithTools: vi.fn(),
  mockCacheStore: new Map<string, Buffer>(),
}));

vi.mock('../../src/lib/config', () => ({
  getAiProvider: vi.fn(() => ({
    type: 'mimo',
    chatWithTools: mockChatWithTools,
  })),
}));

vi.mock('../../src/lib/cache', () => ({
  generateCacheFileName: vi.fn(
    (sceneId: string, nodeIndex: number, nodeType: string, text: string) =>
      `${sceneId}-${nodeType}-${nodeIndex}-${text.length}.json`,
  ),
  cacheExists: vi.fn((gameSlug: string, fileName: string) => mockCacheStore.has(`${gameSlug}/${fileName}`)),
  readCache: vi.fn((gameSlug: string, fileName: string) => mockCacheStore.get(`${gameSlug}/${fileName}`) ?? null),
  writeCache: vi.fn((gameSlug: string, fileName: string, data: Buffer) => {
    mockCacheStore.set(`${gameSlug}/${fileName}`, data);
  }),
}));

// Import after mocks
import { validateSegments, segmentText } from '../../src/lib/audiobook/segmentation';

function makeGame(characters?: Game['ai']['characters']): Game {
  return {
    slug: 'test-game',
    title: 'Test Game',
    initialState: {},
    ai: { characters },
    scenes: {},
  };
}

describe('validateSegments', () => {
  const rosterIds = ['wolf', 'grandma'];

  it('accepts a single narrator segment that reconstructs the original text exactly', () => {
    const original = '妈妈把一个装满点心的篮子交给你。';
    const raw = { segments: [{ speaker: 'narrator', text: original }] };
    expect(validateSegments(raw, rosterIds, original)).toEqual([{ speaker: 'narrator', text: original }]);
  });

  it('accepts segments returned as a JSON-encoded string (observed MiMo mimo-v2.5-pro quirk)', () => {
    const original = '妈妈把一个装满点心的篮子交给你。';
    const raw = { segments: JSON.stringify([{ speaker: 'narrator', text: original }]) };
    expect(validateSegments(raw, rosterIds, original)).toEqual([{ speaker: 'narrator', text: original }]);
  });

  it('rejects a segments string that is not valid JSON', () => {
    expect(validateSegments({ segments: 'not json at all' }, rosterIds, '原文')).toBeNull();
  });

  it('accepts multiple segments whose concatenation reconstructs the original text', () => {
    const original = '"外婆生病了，"她说，"把这个带给她。"';
    const raw = {
      segments: [
        { speaker: 'narrator', text: '"' },
        { speaker: 'wolf', text: '外婆生病了，' },
        { speaker: 'narrator', text: '"她说，"' },
        { speaker: 'wolf', text: '把这个带给她。' },
        { speaker: 'narrator', text: '"' },
      ],
    };
    expect(validateSegments(raw, rosterIds, original)).not.toBeNull();
  });

  it('tolerates whitespace differences when reconstructing the original text', () => {
    const original = '"你好呀"\n他说。';
    const raw = {
      segments: [
        { speaker: 'wolf', text: '"你好呀" ' },
        { speaker: 'narrator', text: '他说。' },
      ],
    };
    expect(validateSegments(raw, rosterIds, original)).not.toBeNull();
  });

  it('rejects a payload with no segments field', () => {
    expect(validateSegments({}, rosterIds, '原文')).toBeNull();
  });

  it('rejects a non-array segments field', () => {
    expect(validateSegments({ segments: 'not-an-array' }, rosterIds, '原文')).toBeNull();
  });

  it('rejects an empty segments array', () => {
    expect(validateSegments({ segments: [] }, rosterIds, '原文')).toBeNull();
  });

  it('rejects more than 30 segments (model splitting too finely)', () => {
    const original = 'a'.repeat(40);
    const segments = original.split('').map((char) => ({ speaker: 'narrator', text: char }));
    expect(validateSegments({ segments }, rosterIds, original)).toBeNull();
  });

  it('rejects a segment missing speaker or text', () => {
    expect(validateSegments({ segments: [{ speaker: 'narrator' }] }, rosterIds, '原文')).toBeNull();
    expect(validateSegments({ segments: [{ text: '原文' }] }, rosterIds, '原文')).toBeNull();
  });

  it('rejects a speaker not in the narrator/roster list', () => {
    const original = '原文';
    expect(
      validateSegments({ segments: [{ speaker: 'unknown_char', text: original }] }, rosterIds, original),
    ).toBeNull();
  });

  it('rejects when concatenated segments do not reconstruct the original text', () => {
    const original = '原文一二三';
    expect(validateSegments({ segments: [{ speaker: 'narrator', text: '原文一二' }] }, rosterIds, original)).toBeNull();
  });
});

describe('segmentText', () => {
  beforeEach(() => {
    mockChatWithTools.mockReset();
    mockCacheStore.clear();
  });

  it('returns a single narrator segment without calling the AI provider when there are no quote characters', async () => {
    const content = '你走在通往外婆家的森林小径上，阳光透过树叶洒下来。';
    const result = await segmentText(content, {
      game: makeGame(),
      sceneId: 'forest_path_start',
      nodeIndex: 0,
      precedingExcerpt: '',
    });
    expect(result).toEqual([{ speaker: 'narrator', text: content }]);
    expect(mockChatWithTools).not.toHaveBeenCalled();
  });

  it('calls chatWithTools and returns validated segments for quoted content', async () => {
    const content = '"外婆生病了，"她说。';
    mockChatWithTools.mockResolvedValue({
      functionCalls: [
        {
          name: 'submitSegments',
          args: {
            segments: [
              { speaker: 'mom', text: '"外婆生病了，"' },
              { speaker: 'narrator', text: '她说。' },
            ],
          },
        },
      ],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });

    const result = await segmentText(content, {
      game: makeGame({ mom: { name: '妈妈' } }),
      sceneId: 'start',
      nodeIndex: 0,
      precedingExcerpt: '',
    });

    expect(mockChatWithTools).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      { speaker: 'mom', text: '"外婆生病了，"' },
      { speaker: 'narrator', text: '她说。' },
    ]);
  });

  it('falls back to a single narrator segment when the model returns a malformed result', async () => {
    const content = '"你好"他说。';
    mockChatWithTools.mockResolvedValue({
      functionCalls: [{ name: 'submitSegments', args: { segments: [{ speaker: 'unknown_char', text: content }] } }],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });

    const result = await segmentText(content, {
      game: makeGame(),
      sceneId: 'start',
      nodeIndex: 0,
      precedingExcerpt: '',
    });

    expect(result).toEqual([{ speaker: 'narrator', text: content }]);
  });

  it('falls back to a single narrator segment when chatWithTools throws', async () => {
    const content = '"你好"他说。';
    mockChatWithTools.mockRejectedValue(new Error('network error'));

    const result = await segmentText(content, {
      game: makeGame(),
      sceneId: 'start',
      nodeIndex: 0,
      precedingExcerpt: '',
    });

    expect(result).toEqual([{ speaker: 'narrator', text: content }]);
  });

  it('reuses a cached validated result instead of calling the AI provider again', async () => {
    const content = '"你好"他说。';
    mockChatWithTools.mockResolvedValue({
      functionCalls: [{ name: 'submitSegments', args: { segments: [{ speaker: 'narrator', text: content }] } }],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });

    const context = { game: makeGame(), sceneId: 'start', nodeIndex: 0, precedingExcerpt: '' };
    await segmentText(content, context);
    await segmentText(content, context);

    expect(mockChatWithTools).toHaveBeenCalledTimes(1);
  });
});
