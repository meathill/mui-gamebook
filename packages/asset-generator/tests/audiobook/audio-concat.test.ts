import { describe, it, expect } from 'vitest';
import { checkFfmpeg } from '../../src/lib/converter';
import { getWavDurationMs, concatenateWavFiles } from '../../src/lib/audiobook/audio-concat';
import { buildWavBuffer } from './wav-test-helpers';

describe('getWavDurationMs', () => {
  it('computes exact duration from a standard 16-bit mono WAV header', () => {
    const buffer = buildWavBuffer({ sampleRate: 24000, channels: 1, bitsPerSample: 16, durationMs: 2000 });
    expect(getWavDurationMs(buffer)).toBeCloseTo(2000, 0);
  });

  it('computes duration correctly for stereo audio', () => {
    const buffer = buildWavBuffer({ sampleRate: 44100, channels: 2, bitsPerSample: 16, durationMs: 500 });
    expect(getWavDurationMs(buffer)).toBeCloseTo(500, 0);
  });

  it('throws for a buffer without a valid RIFF/WAVE header', () => {
    expect(() => getWavDurationMs(Buffer.from('not a wav file'))).toThrow();
  });

  it('throws when fmt or data chunk is missing', () => {
    const truncated = Buffer.alloc(20);
    truncated.write('RIFF', 0, 'ascii');
    truncated.writeUInt32LE(12, 4);
    truncated.write('WAVE', 8, 'ascii');
    expect(() => getWavDurationMs(truncated)).toThrow();
  });
});

describe('concatenateWavFiles', () => {
  it('returns the single buffer unchanged without invoking ffmpeg', () => {
    const buffer = buildWavBuffer({ sampleRate: 24000, channels: 1, bitsPerSample: 16, durationMs: 100 });
    expect(concatenateWavFiles([buffer])).toBe(buffer);
  });

  it('throws for an empty input array', () => {
    expect(() => concatenateWavFiles([])).toThrow();
  });

  // 真实调用 ffmpeg（不 mock）：这个仓库把 child_process 的 mock 拦截不住（根 vitest.config.ts
  // 默认 jsdom 环境，Node 内置模块似乎会绕过 vi.mock），且 converter.test.ts 里对 ffmpeg 依赖的
  // 既有约定就是"能跑真实 ffmpeg 就跑，环境没装就跳过"——这里直接验证拼接结果的时长是否正确，
  // 比单纯断言 ffmpeg 命令字符串更有实际意义。
  it.skipIf(!checkFfmpeg())(
    'concatenates multiple WAV buffers into one whose duration is approximately the sum of the inputs',
    () => {
      const buffers = [
        buildWavBuffer({ sampleRate: 24000, channels: 1, bitsPerSample: 16, durationMs: 300 }),
        buildWavBuffer({ sampleRate: 24000, channels: 1, bitsPerSample: 16, durationMs: 500 }),
        buildWavBuffer({ sampleRate: 24000, channels: 1, bitsPerSample: 16, durationMs: 200 }),
      ];

      const result = concatenateWavFiles(buffers);
      const durationMs = getWavDurationMs(result);

      // 允许一定误差（重新编码/采样率转换可能带来的微小舍入），核心是拼接后总时长
      // 约等于三段之和（1000ms），而不是只等于某一段
      expect(durationMs).toBeGreaterThan(900);
      expect(durationMs).toBeLessThan(1100);
    },
  );
});
