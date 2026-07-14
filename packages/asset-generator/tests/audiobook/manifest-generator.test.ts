import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Game } from '@mui-gamebook/parser';
import { checkFfmpeg } from '../../src/lib/converter';
import { makeSilentWav } from './wav-test-helpers';

// vi.mock 会被 hoist 到文件顶部，工厂函数里直接引用（非嵌套闭包）的外部变量必须通过
// vi.hoisted 声明，否则会在初始化之前被访问（TDZ ReferenceError）
const { mockGenerateStorySpeech, mockCacheStore, mockUploadCalls, mockUploadToR2, mockSegmentText } = vi.hoisted(() => {
  const mockUploadCalls: Array<{ fileName: string; type: string }> = [];
  return {
    mockGenerateStorySpeech: vi.fn(),
    mockCacheStore: new Map<string, Buffer>(),
    mockUploadCalls,
    mockUploadToR2: vi.fn(async (fileName: string, _body: Buffer, type = 'image/png') => {
      mockUploadCalls.push({ fileName, type });
      return `https://test.r2.dev/${fileName}`;
    }),
    mockSegmentText: vi.fn(),
  };
});

vi.mock('../../src/lib/tts', () => ({
  generateStorySpeech: mockGenerateStorySpeech,
}));

// resolveVoiceForSpeaker（真实实现，未 mock）内部依赖 cache.ts 的 simpleHash，
// 用 importOriginal 保留真实 simpleHash（以及其它未特意覆盖的导出），只覆盖需要控制的四个函数
vi.mock('../../src/lib/cache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/cache')>();
  return {
    ...actual,
    generateCacheFileName: vi.fn(
      (sceneId: string, nodeIndex: number, nodeType: string, text: string, _format: string, ttsStyle?: string) =>
        `${sceneId}-${nodeType}-${nodeIndex}-${text.length}-${ttsStyle ?? 'novoice'}.wav`,
    ),
    cacheExists: vi.fn((gameSlug: string, fileName: string) => mockCacheStore.has(`${gameSlug}/${fileName}`)),
    readCache: vi.fn((gameSlug: string, fileName: string) => mockCacheStore.get(`${gameSlug}/${fileName}`) ?? null),
    writeCache: vi.fn((gameSlug: string, fileName: string, data: Buffer) => {
      mockCacheStore.set(`${gameSlug}/${fileName}`, data);
    }),
  };
});

vi.mock('../../src/lib/uploader', () => ({
  uploadToR2: mockUploadToR2,
}));

vi.mock('../../src/lib/audiobook/segmentation', () => ({
  segmentText: mockSegmentText,
}));

// Import after mocks. concatenateWavFiles/wavToMp3（转 MP3）都是真实实现，未 mock——
// 这两步本质是本地 ffmpeg 调用，仓库把 child_process 的 mock 拦截不住（根 vitest.config.ts
// 默认 jsdom 环境），索性像 audio-concat.test.ts 一样直接用真实 ffmpeg 验证，
// ffmpeg 不可用的环境（比如 CI）用 skipIf 跳过这部分测试。
import { generateAudiobook } from '../../src/lib/audiobook/manifest-generator';

const SIMPLE_NARRATION = '妈妈把一个装满点心的篮子交给你。';
const MOM_LINE = '妈妈把一个装满点心的篮子交给你。"外婆生病了，"她说，"把这个带给她。"';

function makeGame(startText: string = SIMPLE_NARRATION): Game {
  return {
    slug: 'lrrh-test',
    title: '小红帽',
    initialState: {},
    ai: {
      characters: {
        mom: { name: '妈妈' },
        wolf: { name: '大灰狼' },
      },
    },
    scenes: {
      start: {
        id: 'start',
        nodes: [
          { type: 'text', content: startText },
          { type: 'choice', text: '直接去外婆家', nextSceneId: 'forest_path_start' },
        ],
      },
      forest_path_start: {
        id: 'forest_path_start',
        nodes: [
          { type: 'text', content: '你走在通往外婆家的森林小径上，阳光透过树叶洒下来。' },
          { type: 'choice', text: '继续前进', nextSceneId: 'end' },
        ],
      },
      dynamic_scene: {
        id: 'dynamic_scene',
        nodes: [{ type: 'text', content: '你现在有 {{gold}} 金币。' }],
      },
      end: { id: 'end', nodes: [] },
    },
  };
}

function runOptions(
  overrides: Partial<{ force: boolean; dryRun: boolean; segmentsOnly: boolean; verbose: boolean }> = {},
) {
  return {
    gameSlug: 'lrrh-test',
    force: false,
    dryRun: false,
    segmentsOnly: false,
    verbose: false,
    ...overrides,
  };
}

/** 验证一个章节的 cue 序列首尾相接、无重叠/无空隙，且总时长与最后一个 cue 的结束时间一致 */
function expectSequentialCues(cues: Array<{ startMs: number; endMs: number }>, chapterDurationMs: number) {
  expect(cues[0].startMs).toBe(0);
  for (let i = 1; i < cues.length; i++) {
    expect(cues[i].startMs).toBe(cues[i - 1].endMs);
  }
  for (const cue of cues) {
    expect(cue.endMs).toBeGreaterThan(cue.startMs);
  }
  expect(chapterDurationMs).toBe(cues[cues.length - 1].endMs);
}

describe('generateAudiobook (no ffmpeg required: dry-run / segments-only)', () => {
  beforeEach(() => {
    mockSegmentText.mockReset();
    mockSegmentText.mockImplementation(async (content: string) => [{ speaker: 'narrator', text: content }]);
  });

  it('does not upload manifest or call TTS/segmentText in --dry-run mode', async () => {
    const game = makeGame();
    const result = await generateAudiobook(game, runOptions({ dryRun: true }));

    expect(mockSegmentText).not.toHaveBeenCalled();
    expect(mockUploadToR2).not.toHaveBeenCalled();
    expect(result.manifestUrl).toBeUndefined();
    expect(result.manifest.chapters).toEqual({});
    expect(result.stats.totalNodes).toBeGreaterThan(0);
  });

  it('runs segmentation but skips TTS/concatenation/upload in --segments-only mode', async () => {
    const game = makeGame();
    const result = await generateAudiobook(game, runOptions({ segmentsOnly: true }));

    expect(mockSegmentText).toHaveBeenCalled();
    expect(mockUploadToR2).not.toHaveBeenCalled();
    expect(result.manifestUrl).toBeUndefined();
    expect(result.manifest.chapters).toEqual({});
    expect(Object.keys(result.manifest.voices).length).toBeGreaterThan(0);
  });

  it('skips nodes containing {{...}} and never calls segmentText for them', async () => {
    const game = makeGame();
    const result = await generateAudiobook(game, runOptions({ segmentsOnly: true }));

    for (const call of mockSegmentText.mock.calls) {
      expect(call[0] as string).not.toContain('{{');
    }
    expect(result.stats.skippedDynamic).toBe(1);
  });
});

describe.skipIf(!checkFfmpeg())('generateAudiobook (full run, requires real ffmpeg)', () => {
  beforeEach(() => {
    mockGenerateStorySpeech.mockReset();
    mockGenerateStorySpeech.mockImplementation(async (text: string) => ({
      buffer: makeSilentWav(Math.max(text.length * 50, 50)),
      mimeType: 'audio/wav',
    }));
    mockCacheStore.clear();
    mockUploadCalls.length = 0;
    mockUploadToR2.mockClear();
    mockSegmentText.mockReset();
    mockSegmentText.mockImplementation(async (content: string) => [{ speaker: 'narrator', text: content }]);
  });

  it('produces one chapter per scene with sequential, non-overlapping cues', async () => {
    const game = makeGame();
    const result = await generateAudiobook(game, runOptions());

    const chapter = result.manifest.chapters.forest_path_start;
    expect(chapter).toBeDefined();
    expect(chapter.sceneId).toBe('forest_path_start');
    expect(chapter.mimeType).toBe('audio/mpeg');
    expect(chapter.cues.map((cue) => cue.nodeType)).toEqual(['text', 'choice']);
    expectSequentialCues(chapter.cues, chapter.durationMs);
  });

  it('produces multiple cues with correct per-speaker voices for a mixed narration+dialogue node', async () => {
    mockSegmentText.mockImplementation(async (content: string) => {
      if (content === MOM_LINE) {
        return [
          { speaker: 'narrator', text: '妈妈把一个装满点心的篮子交给你。' },
          { speaker: 'mom', text: '外婆生病了，把这个带给她。' },
        ];
      }
      return [{ speaker: 'narrator', text: content }];
    });

    const game = makeGame(MOM_LINE);
    const result = await generateAudiobook(game, runOptions());

    const chapter = result.manifest.chapters.start;
    // 2 句（narrator + mom）来自文本节点，加上 choice 节点自己的 1 句 narrator
    expect(chapter.cues).toHaveLength(3);
    expect(chapter.cues[0]).toMatchObject({ speaker: 'narrator', voice: 'mimo_default' });
    expect(chapter.cues[1].speaker).toBe('mom');
    expect(chapter.cues[1].voice).not.toBe('mimo_default');
    expect(chapter.cues[2]).toMatchObject({
      speaker: 'narrator',
      nodeType: 'choice',
      nextSceneId: 'forest_path_start',
    });
    expectSequentialCues(chapter.cues, chapter.durationMs);
    expect(mockUploadCalls.some((call) => call.fileName === 'audiobook/lrrh-test/chapters/start.mp3')).toBe(true);
  });

  it('gives choice nodes their own cue (with nextSceneId) without calling segmentText for them', async () => {
    const game = makeGame();
    const result = await generateAudiobook(game, runOptions());

    const chapter = result.manifest.chapters.start;
    const choiceCue = chapter.cues.find((cue) => cue.nodeType === 'choice');
    expect(choiceCue).toMatchObject({ speaker: 'narrator', text: '直接去外婆家', nextSceneId: 'forest_path_start' });

    // segmentText 只应该因为 text 节点被调用：两个场景各有一个非动态 text 节点
    expect(mockSegmentText).toHaveBeenCalledTimes(2);
  });

  it('produces no chapter for a scene whose only content is dynamic ({{...}})', async () => {
    const game = makeGame();
    const result = await generateAudiobook(game, runOptions());

    expect(result.manifest.chapters.dynamic_scene).toBeUndefined();
    expect(result.stats.skippedDynamic).toBe(1);
  });

  it('uploads the manifest exactly once per run even when every sentence is a cache hit', async () => {
    const game = makeGame();
    await generateAudiobook(game, runOptions());

    const manifestUploadsBefore = mockUploadCalls.filter((c) => c.fileName.endsWith('manifest.json')).length;
    expect(manifestUploadsBefore).toBe(1);

    // 第二次运行：cacheStore 未清空，所有句子都应命中缓存，但 manifest 仍应重新上传一次
    const result = await generateAudiobook(game, runOptions());
    const manifestUploadsAfter = mockUploadCalls.filter((c) => c.fileName.endsWith('manifest.json')).length;

    expect(manifestUploadsAfter).toBe(2);
    expect(result.manifestUrl).toBeDefined();
  });

  it('does not call generateStorySpeech again on a second force:false run (per-sentence cache hit)', async () => {
    const game = makeGame();
    await generateAudiobook(game, runOptions());

    mockGenerateStorySpeech.mockClear();
    await generateAudiobook(game, runOptions());

    expect(mockGenerateStorySpeech).not.toHaveBeenCalled();
  });
});
