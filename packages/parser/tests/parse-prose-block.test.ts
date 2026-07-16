import { describe, expect, it } from 'vitest';
import { parse, parseProseBlock } from '../src/index';
import type { Diagnostic } from '../src/types';

/**
 * parseProseBlock 的行扫描语义（issue #9）：
 * 空行分段 + <!-- audio --> 注释行归属，须与 mdast 全量解析（parse）保持一致，
 * 编辑器才能把整段 content 无损还原为 prose 节点。
 */

const CHARACTER_IDS: ReadonlySet<string> = new Set(['zhang', 'lrrh']);

const FRONT_MATTER = `---
title: "测试"
ai:
  characters:
    zhang:
      name: "张大侠"
    lrrh:
      name: "小红帽"
---`;

function makeSource(body: string): string {
  return `${FRONT_MATTER}\n\n# start\n\n${body}\n`;
}

describe('parseProseBlock 空行分段', () => {
  it('空行分隔的两段是两个 text 节点', () => {
    expect(parseProseBlock('第一段。\n\n第二段。')).toEqual([
      { type: 'text', content: '第一段。' },
      { type: 'text', content: '第二段。' },
    ]);
  });

  it('软换行（单个换行）仍是一个节点', () => {
    expect(parseProseBlock('第一行\n第二行')).toEqual([{ type: 'text', content: '第一行\n第二行' }]);
  });

  it('仅含空白的行也按段落分隔（与落盘重解析语义一致）', () => {
    expect(parseProseBlock('A\n  \nB')).toEqual([
      { type: 'text', content: 'A' },
      { type: 'text', content: 'B' },
    ]);
  });
});

describe('parseProseBlock 语音注释行', () => {
  it('注释附着到前一个 text 节点', () => {
    expect(parseProseBlock('旁白文字。\n\n<!-- audio: https://cdn.x.com/a.mp3 -->')).toEqual([
      { type: 'text', content: '旁白文字。', audio_url: 'https://cdn.x.com/a.mp3' },
    ]);
  });

  it('注释附着到前一个 dialogue 节点（含表情）', () => {
    expect(parseProseBlock('@zhang (angry): 站住！\n\n<!-- audio: https://cdn.x.com/b.mp3 -->', CHARACTER_IDS)).toEqual(
      [
        {
          type: 'dialogue',
          speaker: 'zhang',
          emotion: 'angry',
          content: '站住！',
          audio_url: 'https://cdn.x.com/b.mp3',
        },
      ],
    );
  });

  it('注释无空行紧跟正文也附着（与 CommonMark html block 可中断段落一致）', () => {
    expect(parseProseBlock('旁白文字。\n<!-- audio: https://cdn.x.com/a.mp3 -->')).toEqual([
      { type: 'text', content: '旁白文字。', audio_url: 'https://cdn.x.com/a.mp3' },
    ]);
  });

  it('多节点各带语音互不覆盖（issue #9 核心场景）', () => {
    const content = [
      '第一段旁白。',
      '<!-- audio: https://cdn.x.com/1.mp3 -->',
      '@zhang: 你终于来了。',
      '<!-- audio: https://cdn.x.com/2.mp3 -->',
      '没有人回答。',
      '<!-- audio: https://cdn.x.com/3.mp3 -->',
    ].join('\n\n');
    expect(parseProseBlock(content, CHARACTER_IDS)).toEqual([
      { type: 'text', content: '第一段旁白。', audio_url: 'https://cdn.x.com/1.mp3' },
      { type: 'dialogue', speaker: 'zhang', content: '你终于来了。', audio_url: 'https://cdn.x.com/2.mp3' },
      { type: 'text', content: '没有人回答。', audio_url: 'https://cdn.x.com/3.mp3' },
    ]);
  });

  it('legacy 同行尾随文本形态还原为带语音的 text 节点', () => {
    expect(parseProseBlock('<!-- audio: https://cdn.x.com/a.mp3 -->真相大白。')).toEqual([
      { type: 'text', content: '真相大白。', audio_url: 'https://cdn.x.com/a.mp3' },
    ]);
  });

  it('连续两条注释后者覆盖前者（与 mdast 路径一致）', () => {
    expect(parseProseBlock('旁白。\n\n<!-- audio: https://a/1.mp3 -->\n\n<!-- audio: https://a/2.mp3 -->')).toEqual([
      { type: 'text', content: '旁白。', audio_url: 'https://a/2.mp3' },
    ]);
  });

  it('孤儿注释（前面没有可挂载节点）被丢弃并发 orphan-audio 警告', () => {
    const diagnostics: Diagnostic[] = [];
    expect(parseProseBlock('<!-- audio: https://a/1.mp3 -->\n\n正文。', undefined, (d) => diagnostics.push(d))).toEqual(
      [{ type: 'text', content: '正文。' }],
    );
    expect(diagnostics.some((d) => d.code === 'orphan-audio')).toBe(true);
  });

  it('前一个节点是重定向时注释同样按孤儿处理', () => {
    const diagnostics: Diagnostic[] = [];
    const nodes = parseProseBlock('-> next\n\n<!-- audio: https://a/1.mp3 -->', undefined, (d) => diagnostics.push(d));
    expect(nodes).toEqual([{ type: 'redirect', nextSceneId: 'next' }]);
    expect(diagnostics.some((d) => d.code === 'orphan-audio')).toBe(true);
  });
});

describe('parseProseBlock 与 mdast 全量解析的双路径 conformance', () => {
  it('同一混合样本两条路径产出相同节点序列', () => {
    const body = [
      '第一段旁白。',
      '<!-- audio: https://cdn.x.com/1.mp3 -->',
      '@zhang (angry): 你终于来了。\n@lrrh: 别追了！',
      '<!-- audio: https://cdn.x.com/2.mp3 -->',
      '没有人回答。\n-> next (if: gold > 1)',
    ].join('\n\n');

    const r = parse(makeSource(body));
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(parseProseBlock(body, CHARACTER_IDS)).toEqual(r.data.scenes.start.nodes);
  });
});
