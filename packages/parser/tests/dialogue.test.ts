import { describe, expect, it } from 'vitest';
import { parse, stringify, toPlayableGame } from '../src/index';

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

describe('对话行语法 @角色ID: 台词（DSL v2 Phase 2）', () => {
  it('基本对话行解析为 dialogue 节点', () => {
    const r = parse(makeSource('@zhang: 你终于来了。'));
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.data.scenes.start.nodes).toEqual([{ type: 'dialogue', speaker: 'zhang', content: '你终于来了。' }]);
  });

  it('表情是括号内的自由文本，支持全角/半角括号与冒号', () => {
    const r = parse(makeSource('@zhang (angry): 站住！\n@lrrh（低声）：奶奶……你的耳朵怎么这么大？\n@zhang：不说话。'));
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.data.scenes.start.nodes).toEqual([
      { type: 'dialogue', speaker: 'zhang', emotion: 'angry', content: '站住！' },
      { type: 'dialogue', speaker: 'lrrh', emotion: '低声', content: '奶奶……你的耳朵怎么这么大？' },
      { type: 'dialogue', speaker: 'zhang', content: '不说话。' },
    ]);
  });

  it('对话与旁白混排：同一段落内按行拆分，旁白照常是 text 节点', () => {
    const r = parse(makeSource('森林深处传来脚步声。\n@zhang: 谁在那里？\n没有人回答。'));
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.data.scenes.start.nodes).toEqual([
      { type: 'text', content: '森林深处传来脚步声。' },
      { type: 'dialogue', speaker: 'zhang', content: '谁在那里？' },
      { type: 'text', content: '没有人回答。' },
    ]);
  });

  it('未注册角色按普通文本处理并发 unregistered-speaker 警告', () => {
    const r = parse(makeSource('@stranger: 我是谁？'));
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.data.scenes.start.nodes).toEqual([{ type: 'text', content: '@stranger: 我是谁？' }]);
    expect(r.diagnostics.some((d) => d.code === 'unregistered-speaker')).toBe(true);
  });

  it('没有注册任何角色时 @xx: 行为纯文本（零歧义回退）', () => {
    const src = `---\ntitle: "无角色"\n---\n\n# start\n\n@someone: 你好。\n`;
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.scenes.start.nodes[0]).toEqual({ type: 'text', content: '@someone: 你好。' });
  });

  it('正文里非行首的 @角色 引用不受影响', () => {
    const r = parse(makeSource('她看着 @zhang 的背影，说不出话。'));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.scenes.start.nodes[0].type).toBe('text');
  });

  it('序列化：dialogue → @id (表情): 台词，往返稳定', () => {
    const src = makeSource('@zhang (angry): 站住！\n\n@lrrh: 别追了！');
    const r1 = parse(src);
    expect(r1.success).toBe(true);
    if (!r1.success) return;

    const out1 = stringify(r1.data);
    expect(out1).toContain('@zhang (angry): 站住！');
    expect(out1).toContain('@lrrh: 别追了！');

    const r2 = parse(out1);
    expect(r2.success).toBe(true);
    if (!r2.success) return;
    expect(r2.data.scenes.start.nodes).toEqual(r1.data.scenes.start.nodes);
    expect(stringify(r2.data)).toBe(out1);
  });

  it('块级 audio 注释可以附加到对话节点', () => {
    const r = parse(makeSource('@zhang: 你终于来了。\n\n<!-- audio: https://example.com/a.wav -->'));
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.data.scenes.start.nodes[0]).toEqual({
      type: 'dialogue',
      speaker: 'zhang',
      content: '你终于来了。',
      audio_url: 'https://example.com/a.wav',
    });
  });

  it('toPlayableGame 透传 dialogue 并替换台词内的 @mention', () => {
    const r = parse(makeSource('@zhang (急切): 快去找 @lrrh！'));
    expect(r.success).toBe(true);
    if (!r.success) return;

    const playable = toPlayableGame(r.data);
    expect(playable.scenes.start.nodes[0]).toEqual({
      type: 'dialogue',
      speaker: 'zhang',
      emotion: '急切',
      content: '快去找 小红帽！',
      audio_url: undefined,
    });
  });

  it('硬换行不再把英文两行粘成一个词（break 节点补 \\n）', () => {
    const r = parse(makeSource('line one  \nline two'));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.scenes.start.nodes[0]).toEqual({ type: 'text', content: 'line one\nline two' });
  });
});
