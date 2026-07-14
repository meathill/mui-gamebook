import { describe, expect, it } from 'vitest';
import { parse, stringify } from '../src/index';
import { unescapeTemplateSpans } from '../src/utils';

/**
 * 模板段转义污染回归测试（DSL_V2_DESIGN §2.5）
 * remark-stringify 会把文本节点里的词内 _ 转义成 \_，落在 {{...}} 模板表达式内
 * 会污染变量名（HP4 存量出现过 11 处 ron\_friendship 等）。
 */
describe('模板段转义污染', () => {
  const src = `---
title: "测试"
state:
  ron_friendship: 80
  ball_partner: "luna"
---

# start

{{ if ron_friendship >= 40 }}罗恩大喊。{{ else }}有人大喊。{{ /if }}你有 {{ron_friendship}} 点友情。

* [继续] -> next

# next

结束。
`;

  it('stringify 不在 {{}} 模板段内产出 \\_', () => {
    const result = parse(src);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const out = stringify(result.data);
    expect(out).not.toContain('\\_');
    expect(out).toContain('{{ if ron_friendship >= 40 }}');
    expect(out).toContain('{{ron_friendship}}');
  });

  it('存量污染内容 parse 后自动还原（CommonMark 转义语义）', () => {
    const polluted = src
      .replace('{{ if ron_friendship >= 40 }}', '{{ if ron\\_friendship >= 40 }}')
      .replace('{{ron_friendship}}', '{{ron\\_friendship}}');
    const result = parse(polluted);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const textNode = result.data.scenes.start.nodes.find((n) => n.type === 'text');
    expect(textNode).toBeDefined();
    if (textNode?.type !== 'text') return;
    expect(textNode.content).toContain('ron_friendship');
    expect(textNode.content).not.toContain('\\_');
  });

  it('污染内容一次往返即被清洗，且往返稳定', () => {
    const polluted = src.replace('{{ if ron_friendship >= 40 }}', '{{ if ron\\_friendship >= 40 }}');
    const r1 = parse(polluted);
    expect(r1.success).toBe(true);
    if (!r1.success) return;

    const out1 = stringify(r1.data);
    expect(out1).not.toContain('\\_');

    const r2 = parse(out1);
    expect(r2.success).toBe(true);
    if (!r2.success) return;
    expect(stringify(r2.data)).toBe(out1);
  });

  it('unescapeTemplateSpans 只清洗模板段内的转义，段外不动', () => {
    expect(unescapeTemplateSpans('a\\_b {{x\\_y}} c\\_d')).toBe('a\\_b {{x_y}} c\\_d');
    expect(unescapeTemplateSpans('{{ if a\\_b == "x\\*y" }}文本{{ /if }}')).toBe('{{ if a_b == "x*y" }}文本{{ /if }}');
    expect(unescapeTemplateSpans('无模板段的 \\_ 保持原样')).toBe('无模板段的 \\_ 保持原样');
  });
});
