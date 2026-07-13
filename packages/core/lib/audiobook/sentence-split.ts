/**
 * 句子级切分
 *
 * 在说话人分段（segmentation.ts）的基础上进一步按句切分，让每句话都有自己的
 * TTS 片段和时间戳/播放边界，粒度精确到"每念完一句"，用于视觉/听觉同步。
 * 纯规则切分，不调用 LLM——这一步不需要理解语义，只需要识别句末标点，而且
 * 此时文本已经过说话人分段，同一次切分内不会跨越旁白/角色的边界。
 */
import type { RawSegment } from './types';

/**
 * 中文句末标点（含省略号）及常见 ASCII 感叹号/问号，紧跟其后的一个右引号/右括号
 * 会被保留在句尾（不单独切开）。不含 ASCII 句号 `.`，避免把小数/缩写误切开。
 */
const SENTENCE_END_PATTERN = /[^。！？…!?]*[。！？…!?]+[""''」』)）]?/g;

/**
 * 把一段文本切分成句子列表
 * 找不到任何句末标点时，整段原样作为一个"句子"返回（比如没有标点的选项文本）
 */
export function splitIntoSentences(text: string): string[] {
  const matches = text.match(SENTENCE_END_PATTERN) || [];
  const consumedLength = matches.join('').length;
  const remainder = text.slice(consumedLength).trim();

  const sentences = matches.map((sentence) => sentence.trim()).filter(Boolean);
  if (remainder) {
    sentences.push(remainder);
  }

  return sentences.length > 0 ? sentences : [text];
}

/**
 * 把说话人分段列表进一步炸开成句子级列表，每个句子沿用原分段的 speaker
 */
export function explodeSegmentsToSentences(segments: RawSegment[]): RawSegment[] {
  return segments.flatMap((segment) =>
    splitIntoSentences(segment.text).map((text) => ({ speaker: segment.speaker, text })),
  );
}
