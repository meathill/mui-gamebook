/**
 * 有声书音频拼接
 * 把一个场景内按句切分、逐句生成的 WAV 片段拼接成一整段"章节"音频，
 * 并计算每句话在最终音频里的精确起止时间（供前端做视觉/听觉同步的 hook）。
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * 解析 WAV 文件头，计算精确时长（毫秒）
 * 直接读 RIFF/WAVE 的 fmt / data chunk，不依赖 ffprobe——章节可能有几十句话，
 * 每句都起一个 ffprobe 子进程开销不小，纯 JS 解析文件头更快也更简单。
 */
export function getWavDurationMs(buffer: Buffer): number {
  if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('不是合法的 WAV 文件（缺少 RIFF/WAVE 头）');
  }

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataLength = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(chunkDataStart + 2);
      sampleRate = buffer.readUInt32LE(chunkDataStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkDataStart + 14);
    } else if (chunkId === 'data') {
      dataLength = chunkSize;
    }

    // RIFF chunk 按偶数字节对齐，奇数长度要补一个 padding 字节
    offset = chunkDataStart + chunkSize + (chunkSize % 2);
  }

  if (!sampleRate || !channels || !bitsPerSample || !dataLength) {
    throw new Error('无法解析 WAV 时长：缺少 fmt 或 data chunk');
  }

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = dataLength / (bytesPerSample * channels);
  return (totalSamples / sampleRate) * 1000;
}

/**
 * 把多个 WAV 片段拼接成一个 WAV 文件
 *
 * 用 ffmpeg 的 concat filter（而不是 concat demuxer 的 -c copy）：不同音色的
 * TTS 输出理论上应该同规格，但 filter 会先解码到统一的原始采样再拼接、重新
 * 编码，即使个别片段编码参数有细微差异也能正确拼接，不会因为 -c copy 要求
 * 的流严格一致而失败。
 */
export function concatenateWavFiles(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) {
    throw new Error('concatenateWavFiles: 至少需要一个片段');
  }
  if (buffers.length === 1) {
    return buffers[0];
  }

  const tempDir = tmpdir();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inputPaths = buffers.map((buffer, index) => {
    const path = join(tempDir, `audiobook-concat-in-${stamp}-${index}.wav`);
    writeFileSync(path, buffer);
    return path;
  });
  const outputPath = join(tempDir, `audiobook-concat-out-${stamp}.wav`);

  try {
    const inputArgs = inputPaths.map((path) => `-i "${path}"`).join(' ');
    const filterInputs = inputPaths.map((_, index) => `[${index}:a]`).join('');
    const filterComplex = `${filterInputs}concat=n=${inputPaths.length}:v=0:a=1[out]`;
    execSync(`ffmpeg ${inputArgs} -filter_complex "${filterComplex}" -map "[out]" -y "${outputPath}"`, {
      stdio: 'pipe',
    });
    return readFileSync(outputPath);
  } finally {
    for (const path of [...inputPaths, outputPath]) {
      try {
        unlinkSync(path);
      } catch {
        // 忽略清理错误
      }
    }
  }
}
