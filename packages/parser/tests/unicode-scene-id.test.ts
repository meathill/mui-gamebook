import { describe, expect, it } from 'vitest';
import { validateGameLogic } from '../../../scripts/validate-game-script';
import { isReferenceableSceneId, parse, stringify } from '../src/index';

function makeSource(body: string): string {
  return `---\ntitle: "测试"\n---\n\n# start\n\n${body}\n`;
}

describe('Unicode 场景 ID 引用（issue #8：能定义、不能引用的不对称）', () => {
  it('选项可以引用中文场景，不再降级为 ignored-list-item', () => {
    const src = makeSource('* [走进舞会] -> 中文场景\n\n# 中文场景\n\n你来了。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const choice = r.data.scenes.start.nodes.find((n) => n.type === 'choice');
    expect(choice?.nextSceneId).toBe('中文场景');
    expect(r.diagnostics.some((d) => d.code === 'ignored-list-item')).toBe(false);
    expect(r.data.scenes['中文场景']).toBeDefined();
  });

  it('重定向可以指向中文场景，不再退化成普通文本', () => {
    const src = makeSource('-> 中文场景\n\n# 中文场景\n\n你来了。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const redirect = r.data.scenes.start.nodes.find((n) => n.type === 'redirect');
    expect(redirect).toBeDefined();
    expect(redirect?.type === 'redirect' && redirect.nextSceneId).toBe('中文场景');
  });

  it('混合形态（连字符、数字、下划线）的场景 ID 均可引用', () => {
    const src = makeSource('* [甲] -> 场景-2\n* [乙] -> 第2章_序\n\n# 场景-2\n\n甲。\n\n# 第2章_序\n\n乙。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const targets = r.data.scenes.start.nodes.filter((n) => n.type === 'choice').map((n) => n.nextSceneId);
    expect(targets).toEqual(['场景-2', '第2章_序']);
  });

  it('中文目标后跟子句时正常分界', () => {
    const src = makeSource('* [走] -> 中文场景 (if: gold > 0) (set: gold = gold - 1)\n\n# 中文场景\n\n到了。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const choice = r.data.scenes.start.nodes.find((n) => n.type === 'choice');
    expect(choice?.nextSceneId).toBe('中文场景');
    expect(choice?.type === 'choice' && choice.condition).toBe('gold > 0');
    expect(choice?.type === 'choice' && choice.set).toBe('gold = gold - 1');
  });

  it('stringify → parse 往返保留中文场景与引用', () => {
    const src = makeSource('* [走] -> 中文场景\n\n# 中文场景\n\n-> 场景-2\n\n# 场景-2\n\n结束。');
    const r1 = parse(src);
    expect(r1.success).toBe(true);
    if (!r1.success) return;

    const r2 = parse(stringify(r1.data));
    expect(r2.success).toBe(true);
    if (!r2.success) return;

    expect(Object.keys(r2.data.scenes)).toEqual(Object.keys(r1.data.scenes));
    const choice = r2.data.scenes.start.nodes.find((n) => n.type === 'choice');
    expect(choice?.nextSceneId).toBe('中文场景');
    const redirect = r2.data.scenes['中文场景'].nodes.find((n) => n.type === 'redirect');
    expect(redirect?.type === 'redirect' && redirect.nextSceneId).toBe('场景-2');
  });

  it('validateGameLogic 对被引用的中文场景不报未定义/孤儿', () => {
    const src = makeSource('* [走] -> 中文场景\n\n# 中文场景\n\n到了。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const issues = validateGameLogic(r.data);
    expect(issues.some((i) => i.includes('中文场景'))).toBe(false);
  });
});

describe('unreferenceable-scene-id 警告（标题含引用字符集之外的字符）', () => {
  it('含空格的标题触发警告，带 code/severity/sceneId/行号', () => {
    const src = makeSource('正文。\n\n# My Scene\n\n无法被引用。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const d = r.diagnostics.find((diag) => diag.code === 'unreferenceable-scene-id');
    expect(d?.severity).toBe('warning');
    expect(d?.sceneId).toBe('My Scene');
    expect(typeof d?.line).toBe('number');
    // 兼容字符串 warnings 同步落一份
    expect(r.warnings.some((w) => w.includes('My Scene'))).toBe(true);
  });

  it('含标点的标题触发警告', () => {
    const src = makeSource('正文。\n\n# 场景：开始\n\n无法被引用。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.diagnostics.some((d) => d.code === 'unreferenceable-scene-id')).toBe(true);
  });

  it('纯中文与纯 ASCII 标题均不触发警告', () => {
    const src = makeSource('正文。\n\n# 中文场景\n\n甲。\n\n# scene_2-b\n\n乙。');
    const r = parse(src);
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.diagnostics.some((d) => d.code === 'unreferenceable-scene-id')).toBe(false);
  });

  it('isReferenceableSceneId 的口径与引用正则一致', () => {
    expect(isReferenceableSceneId('中文场景')).toBe(true);
    expect(isReferenceableSceneId('scene_2-b')).toBe(true);
    expect(isReferenceableSceneId('My Scene')).toBe(false);
    expect(isReferenceableSceneId('场景：开始')).toBe(false);
  });
});
