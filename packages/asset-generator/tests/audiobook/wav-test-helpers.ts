/**
 * 测试专用：手工构造合法的最小 WAV 文件（PCM 静音数据），用于验证时长解析/拼接逻辑
 * 不是测试文件本身（不以 .test.ts 结尾），仅供本目录下的测试文件复用
 */
export interface WavOptions {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  durationMs: number;
}

export function buildWavBuffer({ sampleRate, channels, bitsPerSample, durationMs }: WavOptions): Buffer {
  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = Math.round((durationMs / 1000) * sampleRate);
  const dataLength = totalSamples * bytesPerSample * channels;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  header.writeUInt16LE(channels * bytesPerSample, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataLength, 40);

  const data = Buffer.alloc(dataLength); // 静音数据即可，只测时长解析/拼接逻辑
  return Buffer.concat([header, data]);
}

/** 默认规格（24kHz 单声道 16-bit，跟 MiMo TTS 输出的典型规格量级一致）的短小静音 WAV，供不关心具体规格的测试直接用 */
export function makeSilentWav(durationMs = 100): Buffer {
  return buildWavBuffer({ sampleRate: 24000, channels: 1, bitsPerSample: 16, durationMs });
}
