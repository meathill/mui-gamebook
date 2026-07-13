import { describe, it, expect, vi } from 'vitest';
import type { AiProvider, ChatWithToolsResult } from '../../lib/ai-provider';
import { hasQuoteLikeCharacters, validateSegments, segmentTextWithProvider } from '../../lib/audiobook/segmentation';
import type { CharacterRoster, SegmentationContext } from '../../lib/audiobook/types';

function makeContext(overrides: Partial<SegmentationContext> = {}): SegmentationContext {
  return { roster: {}, sceneId: 'start', nodeIndex: 0, precedingExcerpt: '', ...overrides };
}

function makeProvider(chatWithTools?: (...args: unknown[]) => Promise<ChatWithToolsResult>): AiProvider {
  return {
    type: 'mimo',
    generateText: vi.fn(),
    generateImage: vi.fn(),
    generateMiniGame: vi.fn(),
    chatWithTools: chatWithTools as AiProvider['chatWithTools'],
  };
}

describe('hasQuoteLikeCharacters', () => {
  it('detects CJK corner-bracket and curly quotes', () => {
    expect(hasQuoteLikeCharacters('「你好」')).toBe(true);
    expect(hasQuoteLikeCharacters('"你好"')).toBe(true);
    expect(hasQuoteLikeCharacters('普通叙述，没有引号')).toBe(false);
  });
});

describe('validateSegments', () => {
  const rosterIds = ['wolf', 'grandma'];

  it('accepts a single narrator segment that reconstructs the original text exactly', () => {
    const original = '妈妈把一个装满点心的篮子交给你。';
    expect(validateSegments({ segments: [{ speaker: 'narrator', text: original }] }, rosterIds, original)).toEqual([
      { speaker: 'narrator', text: original },
    ]);
  });

  it('accepts segments returned as a JSON-encoded string (observed MiMo mimo-v2.5-pro quirk)', () => {
    const original = '妈妈把一个装满点心的篮子交给你。';
    const raw = { segments: JSON.stringify([{ speaker: 'narrator', text: original }]) };
    expect(validateSegments(raw, rosterIds, original)).toEqual([{ speaker: 'narrator', text: original }]);
  });

  it('rejects a segments string that is not valid JSON', () => {
    expect(validateSegments({ segments: 'not json at all' }, rosterIds, '原文')).toBeNull();
  });

  it('rejects a payload with no segments field', () => {
    expect(validateSegments({}, rosterIds, '原文')).toBeNull();
  });

  it('rejects an empty segments array', () => {
    expect(validateSegments({ segments: [] }, rosterIds, '原文')).toBeNull();
  });

  it('rejects more than 30 segments (model splitting too finely)', () => {
    const original = 'a'.repeat(40);
    const segments = original.split('').map((char) => ({ speaker: 'narrator', text: char }));
    expect(validateSegments({ segments }, rosterIds, original)).toBeNull();
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

describe('segmentTextWithProvider', () => {
  it('falls back to a single narrator segment when the provider does not support chatWithTools', async () => {
    const provider = makeProvider(undefined);
    const result = await segmentTextWithProvider(provider, '"你好"他说。', makeContext());
    expect(result).toEqual({ segments: [{ speaker: 'narrator', text: '"你好"他说。' }], validated: false });
  });

  it('returns validated segments and usage for a successful call', async () => {
    const content = '"外婆生病了，"她说。';
    const roster: CharacterRoster = { mom: { name: '妈妈' } };
    const usage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };
    const provider = makeProvider(async () => ({
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
      usage,
    }));

    const result = await segmentTextWithProvider(provider, content, makeContext({ roster }));

    expect(result.validated).toBe(true);
    expect(result.usage).toEqual(usage);
    expect(result.segments).toEqual([
      { speaker: 'mom', text: '"外婆生病了，"' },
      { speaker: 'narrator', text: '她说。' },
    ]);
  });

  it('falls back but still reports usage when the model result fails validation', async () => {
    const content = '"你好"他说。';
    const usage = { promptTokens: 8, completionTokens: 3, totalTokens: 11 };
    const provider = makeProvider(async () => ({
      functionCalls: [{ name: 'submitSegments', args: { segments: [{ speaker: 'unknown_char', text: content }] } }],
      usage,
    }));

    const result = await segmentTextWithProvider(provider, content, makeContext());

    expect(result.validated).toBe(false);
    expect(result.usage).toEqual(usage);
    expect(result.segments).toEqual([{ speaker: 'narrator', text: content }]);
  });

  it('falls back without usage when the provider call throws', async () => {
    const content = '"你好"他说。';
    const provider = makeProvider(async () => {
      throw new Error('network error');
    });

    const result = await segmentTextWithProvider(provider, content, makeContext());

    expect(result).toEqual({ segments: [{ speaker: 'narrator', text: content }], validated: false });
  });

  it('falls back when the model never calls submitSegments', async () => {
    const content = '"你好"他说。';
    const usage = { promptTokens: 4, completionTokens: 1, totalTokens: 5 };
    const provider = makeProvider(async () => ({ functionCalls: [], usage }));

    const result = await segmentTextWithProvider(provider, content, makeContext());

    expect(result.validated).toBe(false);
    expect(result.usage).toEqual(usage);
    expect(result.segments).toEqual([{ speaker: 'narrator', text: content }]);
  });
});
