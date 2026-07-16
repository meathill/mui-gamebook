import { describe, expect, it } from 'vitest';
import {
  getPrimaryAudioUrl,
  proseNodesToContent,
  setPrimaryAudioUrl,
  stripAudioCommentLines,
  stripAudioComments,
} from '@/lib/editor/prose-audio';

const MULTI_AUDIO_CONTENT = [
  '第一段旁白。',
  '<!-- audio: https://cdn.x.com/1.mp3 -->',
  '@zhang: 你终于来了。',
  '<!-- audio: https://cdn.x.com/2.mp3 -->',
  '没有配音的段落。',
].join('\n\n');

describe('proseNodesToContent', () => {
  it('带语音的节点后内联注释行，redirect 行照常序列化', () => {
    expect(
      proseNodesToContent([
        { type: 'text', content: '旁白。', audio_url: 'https://a/1.mp3' },
        { type: 'dialogue', speaker: 'zhang', emotion: 'angry', content: '站住！' },
        { type: 'redirect', nextSceneId: 'next', condition: 'gold > 1' },
      ]),
    ).toBe('旁白。\n\n<!-- audio: https://a/1.mp3 -->\n\n@zhang (angry): 站住！\n\n-> next (if: gold > 1)');
  });

  it('忽略 prose 流以外的节点类型', () => {
    expect(
      proseNodesToContent([
        { type: 'ai_image', prompt: '森林' },
        { type: 'text', content: '进入森林' },
      ]),
    ).toBe('进入森林');
  });
});

describe('getPrimaryAudioUrl', () => {
  it('取第一条语音注释', () => {
    expect(getPrimaryAudioUrl(MULTI_AUDIO_CONTENT)).toBe('https://cdn.x.com/1.mp3');
  });

  it('无注释返回 undefined', () => {
    expect(getPrimaryAudioUrl('普通文本。\n\n第二段。')).toBeUndefined();
  });

  it('legacy 同行形态也能取到', () => {
    expect(getPrimaryAudioUrl('<!-- audio: https://a/1.mp3 -->真相大白。')).toBe('https://a/1.mp3');
  });
});

describe('stripAudioComments', () => {
  it('清掉全部语音注释，正文与对话行保持', () => {
    expect(stripAudioComments(MULTI_AUDIO_CONTENT)).toBe('第一段旁白。\n\n@zhang: 你终于来了。\n\n没有配音的段落。');
  });

  it('无注释时内容不变（空行归一为双换行）', () => {
    expect(stripAudioComments('A\n\nB')).toBe('A\n\nB');
  });
});

describe('setPrimaryAudioUrl', () => {
  it('清掉旧注释并把新语音挂到第一个 prose 节点', () => {
    expect(setPrimaryAudioUrl(MULTI_AUDIO_CONTENT, 'https://cdn.x.com/new.mp3')).toBe(
      ['第一段旁白。', '<!-- audio: https://cdn.x.com/new.mp3 -->', '@zhang: 你终于来了。', '没有配音的段落。'].join(
        '\n\n',
      ),
    );
  });

  it('第一个节点是重定向行时挂到其后第一个 prose 节点', () => {
    expect(setPrimaryAudioUrl('-> next\n\n正文。', 'https://a/1.mp3')).toBe(
      '-> next\n\n正文。\n\n<!-- audio: https://a/1.mp3 -->',
    );
  });

  it('无可挂载节点时原样返回', () => {
    expect(setPrimaryAudioUrl('-> next (if: gold > 1)', 'https://a/1.mp3')).toBe('-> next (if: gold > 1)');
    expect(setPrimaryAudioUrl('', 'https://a/1.mp3')).toBe('');
  });

  it('写回后 getPrimaryAudioUrl 能读回（往返稳定）', () => {
    const next = setPrimaryAudioUrl(MULTI_AUDIO_CONTENT, 'https://cdn.x.com/new.mp3');
    expect(getPrimaryAudioUrl(next)).toBe('https://cdn.x.com/new.mp3');
    expect(setPrimaryAudioUrl(next, 'https://cdn.x.com/new.mp3')).toBe(next);
  });
});

describe('stripAudioCommentLines（行过滤版预览）', () => {
  it('剥掉注释行并压缩多余空行', () => {
    expect(stripAudioCommentLines(MULTI_AUDIO_CONTENT)).toBe(
      '第一段旁白。\n\n@zhang: 你终于来了。\n\n没有配音的段落。',
    );
  });

  it('普通文本不受影响', () => {
    expect(stripAudioCommentLines('A\n\nB')).toBe('A\n\nB');
  });
});
