import { describe, it, expect } from 'vitest';
import { splitIntoSentences, explodeSegmentsToSentences } from '../../src/lib/audiobook/sentence-split';

describe('splitIntoSentences', () => {
  it('splits a paragraph with multiple sentence-ending punctuation marks', () => {
    expect(splitIntoSentences('我是一个句子。你好吗？我很好！')).toEqual(['我是一个句子。', '你好吗？', '我很好！']);
  });

  it('returns the whole text as one sentence when there is no ending punctuation', () => {
    expect(splitIntoSentences('继续前进')).toEqual(['继续前进']);
  });

  it('keeps a trailing closing quote attached to the preceding punctuation', () => {
    expect(splitIntoSentences('"你好吗？"他问。')).toEqual(['"你好吗？"', '他问。']);
  });

  it('captures trailing text with no ending punctuation as a final sentence', () => {
    expect(splitIntoSentences('第一句。剩下没有标点的部分')).toEqual(['第一句。', '剩下没有标点的部分']);
  });

  it('treats a run of ellipsis characters as one terminator, not several empty splits', () => {
    expect(splitIntoSentences('她愣住了……然后笑了。')).toEqual(['她愣住了……', '然后笑了。']);
  });

  it('does not split on ASCII periods (avoids breaking decimals/abbreviations)', () => {
    expect(splitIntoSentences('版本 v0.10.5 已发布')).toEqual(['版本 v0.10.5 已发布']);
  });
});

describe('explodeSegmentsToSentences', () => {
  it('splits each segment into sentence-level units while preserving its speaker', () => {
    const result = explodeSegmentsToSentences([
      { speaker: 'narrator', text: '天色渐暗。风声渐起。' },
      { speaker: 'wolf', text: '你——又躲在里面了。' },
    ]);
    expect(result).toEqual([
      { speaker: 'narrator', text: '天色渐暗。' },
      { speaker: 'narrator', text: '风声渐起。' },
      { speaker: 'wolf', text: '你——又躲在里面了。' },
    ]);
  });

  it('returns an empty array for an empty input', () => {
    expect(explodeSegmentsToSentences([])).toEqual([]);
  });
});
