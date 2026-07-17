import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NARRATOR_SPEAKER_ID } from '@mui-gamebook/core/lib/audiobook/types';
import {
  printVoiceTable,
  printSegmentsPreview,
  describeAudiobookMode,
  printAudiobookSummary,
} from '../../src/lib/audiobook/report';
import type { AudiobookGenerationResult, SegmentPreviewEntry } from '../../src/lib/audiobook/types';

describe('report', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  function loggedText(): string {
    return logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
  }

  describe('printVoiceTable', () => {
    it('旁白排在最前，其余角色按 ID 字母序', () => {
      printVoiceTable({
        wolf: '冰糖',
        [NARRATOR_SPEAKER_ID]: 'mimo_default',
        alice: '茉莉',
      });

      const text = loggedText();
      const narratorIdx = text.indexOf(NARRATOR_SPEAKER_ID);
      const aliceIdx = text.indexOf('alice');
      const wolfIdx = text.indexOf('wolf');
      expect(narratorIdx).toBeGreaterThanOrEqual(0);
      expect(narratorIdx).toBeLessThan(aliceIdx);
      expect(aliceIdx).toBeLessThan(wolfIdx);
    });
  });

  describe('printSegmentsPreview', () => {
    const entries: SegmentPreviewEntry[] = [
      { sceneId: 'start', nodeIndex: 0, segments: [{ speaker: NARRATOR_SPEAKER_ID, text: '旁白句子' }] },
      {
        sceneId: 'hall',
        nodeIndex: 1,
        segments: [
          { speaker: NARRATOR_SPEAKER_ID, text: '旁白' },
          { speaker: 'wolf', text: '你好' },
        ],
      },
    ];

    it('非 verbose 模式下，单一旁白节点只显示折叠计数，不展开正文', () => {
      printSegmentsPreview(entries, false);

      const text = loggedText();
      expect(text).toContain('场景 hall 节点 #1');
      expect(text).not.toContain('场景 start 节点 #0');
      expect(text).toContain('另有 1 个单一旁白节点');
    });

    it('verbose 模式下，单一旁白节点也展开正文', () => {
      printSegmentsPreview(entries, true);

      const text = loggedText();
      expect(text).toContain('场景 start 节点 #0');
      expect(text).toContain('旁白句子');
    });
  });

  describe('describeAudiobookMode', () => {
    it('dryRun 优先于其它选项', () => {
      expect(describeAudiobookMode({ force: false, dryRun: true, segmentsOnly: true, verbose: false })).toBe(
        '预览统计（不调用 AI）',
      );
    });

    it('segmentsOnly 无 dryRun 时返回仅分段', () => {
      expect(describeAudiobookMode({ force: false, dryRun: false, segmentsOnly: true, verbose: false })).toBe(
        '仅分段（跳过 TTS）',
      );
    });

    it('两者都没有时返回完整生成', () => {
      expect(describeAudiobookMode({ force: false, dryRun: false, segmentsOnly: false, verbose: false })).toBe(
        '完整生成',
      );
    });
  });

  describe('printAudiobookSummary', () => {
    const baseStats = {
      totalNodes: 10,
      textNodes: 8,
      choiceNodes: 2,
      skippedDynamic: 1,
      segmentedNodes: 3,
      singleSegmentNodes: 5,
      totalSentences: 20,
      chaptersWithAudio: 4,
      ttsCalls: 20,
    };

    it('有 manifestUrl 时打印上传地址', () => {
      const result = {
        manifest: {},
        manifestUrl: 'https://example.com/manifest.json',
        stats: baseStats,
      } as unknown as AudiobookGenerationResult;

      printAudiobookSummary(result);

      expect(loggedText()).toContain('https://example.com/manifest.json');
    });

    it('没有 manifestUrl 时说明是 dry-run 或 segments-only', () => {
      const result = { manifest: {}, stats: baseStats } as unknown as AudiobookGenerationResult;

      printAudiobookSummary(result);

      expect(loggedText()).toContain('未上传 manifest');
    });
  });
});
