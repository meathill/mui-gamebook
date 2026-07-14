import { describe, expect, it, vi } from 'vitest';
import { parse, stringify } from '../src/index';
import { scanClauses } from '../src/parse-choice';

function makeSource(body: string, frontMatter = 'title: "测试"'): string {
  return `---\n${frontMatter}\n---\n\n# start\n\n${body}\n`;
}

describe('未知键透传（DSL v2 Phase 1 批次 4）', () => {
  it('全局 front matter 未知键进 game.extra 并往返保留', () => {
    const src = makeSource('你好。', 'title: "测试"\nmy_custom_field: 42\nwishing_wall:\n  enabled: true');
    const r1 = parse(src);
    expect(r1.success).toBe(true);
    if (!r1.success) return;

    expect(r1.data.extra).toEqual({ my_custom_field: 42, wishing_wall: { enabled: true } });

    const out = stringify(r1.data);
    expect(out).toContain('my_custom_field: 42');
    const r2 = parse(out);
    expect(r2.success).toBe(true);
    if (!r2.success) return;
    expect(r2.data.extra).toEqual(r1.data.extra);
  });

  it('场景元数据未知键进 scene.extra 并往返保留', () => {
    const src = makeSource('```yaml\nimage:\n  prompt: 森林\nmeta:\n  chapter: 第一章\n```\n\n你好。');
    const r1 = parse(src);
    expect(r1.success).toBe(true);
    if (!r1.success) return;

    const scene = r1.data.scenes.start;
    expect(scene.extra).toEqual({ meta: { chapter: '第一章' } });
    expect(scene.nodes.some((n) => n.type === 'ai_image')).toBe(true);

    const out = stringify(r1.data);
    const r2 = parse(out);
    expect(r2.success).toBe(true);
    if (!r2.success) return;
    expect(r2.data.scenes.start.extra).toEqual(scene.extra);
  });

  it('场景首个 yaml 块即使没有四大素材键也是元数据（不再被静默丢弃）', () => {
    const src = makeSource('```yaml\nmeta:\n  chapter: 序章\n```\n\n正文。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.data.scenes.start.extra).toEqual({ meta: { chapter: '序章' } });
    // yaml 块被消费为元数据，正文只剩 text
    expect(r.data.scenes.start.nodes.map((n) => n.type)).toEqual(['text']);
  });

  it('选项未知子句进 clauses 并往返保留', () => {
    const src = makeSource('* [快跑] -> escape (if: courage > 10) (timer: 10)\n\n# escape\n\n逃出。');
    const r1 = parse(src);
    expect(r1.success).toBe(true);
    if (!r1.success) return;

    const choice = r1.data.scenes.start.nodes.find((n) => n.type === 'choice');
    expect(choice?.type).toBe('choice');
    if (choice?.type !== 'choice') return;
    expect(choice.condition).toBe('courage > 10');
    expect(choice.clauses).toEqual({ timer: '10' });

    const out = stringify(r1.data);
    expect(out).toContain('(timer: 10)');
    const r2 = parse(out);
    expect(r2.success).toBe(true);
    if (!r2.success) return;
    const choice2 = r2.data.scenes.start.nodes.find((n) => n.type === 'choice');
    if (choice2?.type !== 'choice') return;
    expect(choice2.clauses).toEqual({ timer: '10' });
  });
});

describe('选项行健壮化', () => {
  it('子句值可以包含括号（表达式与 URL）', () => {
    const src = makeSource(
      '* [进门] -> room (if: (a or b) and c) (audio: https://cdn.example.com/a(1).mp3)\n\n# room\n\n房间。',
    );
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const choice = r.data.scenes.start.nodes.find((n) => n.type === 'choice');
    if (choice?.type !== 'choice') return;
    expect(choice.condition).toBe('(a or b) and c');
    expect(choice.audio_url).toBe('https://cdn.example.com/a(1).mp3');
  });

  it('选项文本可以包含 ]', () => {
    const src = makeSource('* [拾取 [木剑] 武器] -> next\n\n# next\n\n好。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const choice = r.data.scenes.start.nodes.find((n) => n.type === 'choice');
    if (choice?.type !== 'choice') return;
    expect(choice.text).toBe('拾取 [木剑] 武器');
    expect(choice.nextSceneId).toBe('next');
  });

  it('子句内引号中的括号不干扰配对', () => {
    expect(scanClauses('(if: name == "a)b") (set: x = 1)')).toEqual([
      { key: 'if', value: 'name == "a)b"' },
      { key: 'set', value: 'x = 1' },
    ]);
  });

  it('正文中不是选项语法的无序列表项报 ignored-list-item 警告', () => {
    const src = makeSource('* 只是一条普通列表\n\n你好。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.diagnostics.some((d) => d.code === 'ignored-list-item')).toBe(true);
  });
});

describe('结构化诊断（宁可报错不可静默丢）', () => {
  it('废弃围栏语法报 error 级 legacy-fence 诊断', () => {
    const src = makeSource('```minigame-gen\nprompt: 点击金色飞贼\n```\n\n正文。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const d = r.diagnostics.find((d) => d.code === 'legacy-fence');
    expect(d?.severity).toBe('error');
    expect(d?.sceneId).toBe('start');
  });

  it('front matter 与首个场景标题之间的游离内容报 stray-content', () => {
    const src = `---\ntitle: "测试"\n---\n\n这段会被丢弃。\n\n# start\n\n你好。\n`;
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.diagnostics.some((d) => d.code === 'stray-content')).toBe(true);
  });

  it('被忽略的块类（二级标题/引用块）报 ignored-block 并带行号', () => {
    const src = makeSource('## 小标题\n\n> 引用一段\n\n正文。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const ignored = r.diagnostics.filter((d) => d.code === 'ignored-block');
    expect(ignored.length).toBe(2);
    expect(ignored[0].line).toBeGreaterThan(0);
  });

  it('孤儿 audio 注释报 orphan-audio', () => {
    const src = makeSource('<!-- audio: https://example.com/a.wav -->\n\n正文在注释之后。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.diagnostics.some((d) => d.code === 'orphan-audio')).toBe(true);
  });

  it('重复场景 ID 的诊断保留原有警告文本', () => {
    const src = `---\ntitle: "测试"\n---\n\n# start\n\n一。\n\n# start\n\n二。\n`;
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.diagnostics.some((d) => d.code === 'duplicate-scene-id')).toBe(true);
    expect(r.warnings.some((w) => w.includes('Duplicate scene ID'))).toBe(true);
  });
});

describe('音频类型一致性', () => {
  it('bgm 别名归一为 background_music', () => {
    const src = makeSource('```yaml\naudio:\n  type: bgm\n  prompt: 紧张的音乐\n```\n\n正文。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const audio = r.data.scenes.start.nodes.find((n) => n.type === 'ai_audio');
    if (audio?.type !== 'ai_audio') return;
    expect(audio.audioType).toBe('background_music');
  });

  it('正文中的 yaml 音频块不再被 type 键覆盖节点类型（历史隐藏 bug）', () => {
    const src = makeSource('正文先行。\n\n```yaml\naudio:\n  type: sfx\n  prompt: 爆炸声\n```');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const audio = r.data.scenes.start.nodes.find((n) => n.type === 'ai_audio');
    expect(audio?.type).toBe('ai_audio');
    if (audio?.type !== 'ai_audio') return;
    expect(audio.audioType).toBe('sfx');
  });

  it('同类多素材节点序列化时告警而非静默丢', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const src = makeSource('```yaml\nimage:\n  prompt: 一\n```\n\n正文。\n\n```yaml\nimage:\n  prompt: 二\n```');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    stringify(r.data);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ai_image'));
    warn.mockRestore();
  });
});
