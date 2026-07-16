import { describe, expect, it } from 'vitest';
import { interpolateTemplate, parseTemplate } from '../src/template';

/**
 * 条件文本模板引擎 conformance（issue #10）。
 * 树解析替换单趟正则后：嵌套是新能力，其余行为与旧实现逐字节对拍锁定
 * （大小写/空白容忍、孤儿标签字面保留、变量趟跑在分支拼接结果上）。
 */

describe('平铺条件文本（存量语法兼容）', () => {
  it('if / else 两分支', () => {
    const text = '{{ if gold >= 10 }}买得起{{ else }}买不起{{ /if }}';
    expect(interpolateTemplate(text, { gold: 15 })).toBe('买得起');
    expect(interpolateTemplate(text, { gold: 5 })).toBe('买不起');
  });

  it('无 else 时条件不满足输出空串', () => {
    const text = '开头{{ if has_key }}你有钥匙{{ /if }}结尾';
    expect(interpolateTemplate(text, { has_key: true })).toBe('开头你有钥匙结尾');
    expect(interpolateTemplate(text, { has_key: false })).toBe('开头结尾');
  });

  it('空分支合法', () => {
    expect(interpolateTemplate('A{{ if x }}{{ else }}B{{ /if }}C', { x: 0 })).toBe('ABC');
    expect(interpolateTemplate('A{{ if x }}{{ /if }}C', { x: 1 })).toBe('AC');
  });

  it('块内容可跨行', () => {
    const text = '{{ if x }}第一行\n第二行{{ else }}其他\n内容{{ /if }}';
    expect(interpolateTemplate(text, { x: 1 })).toBe('第一行\n第二行');
    expect(interpolateTemplate(text, { x: 0 })).toBe('其他\n内容');
  });

  it('并列多块互不影响（HP4 拍平形态）', () => {
    const text =
      '勇士们领舞。{{ if p == "parvati" }}你挽着帕瓦蒂{{ /if }}{{ if p == "luna" }}你和卢娜{{ /if }}{{ if p != "parvati" && p != "luna" }}你独自一人{{ /if }}走到舞池中央。';
    expect(interpolateTemplate(text, { p: 'luna' })).toBe('勇士们领舞。你和卢娜走到舞池中央。');
    expect(interpolateTemplate(text, { p: 'none' })).toBe('勇士们领舞。你独自一人走到舞池中央。');
  });

  it('条件支持 or 表达式（v2 表达式引擎）', () => {
    const text = '{{ if p == "alice" or p == "luna" }}有伴{{ else }}独行{{ /if }}';
    expect(interpolateTemplate(text, { p: 'luna' })).toBe('有伴');
    expect(interpolateTemplate(text, { p: 'none' })).toBe('独行');
  });
});

describe('嵌套条件文本（issue #10 新能力）', () => {
  it('两层嵌套', () => {
    const text = '{{ if a }}外{{ if b }}内真{{ else }}内假{{ /if }}层{{ else }}否{{ /if }}';
    expect(interpolateTemplate(text, { a: 1, b: 1 })).toBe('外内真层');
    expect(interpolateTemplate(text, { a: 1, b: 0 })).toBe('外内假层');
    expect(interpolateTemplate(text, { a: 0, b: 1 })).toBe('否');
  });

  it('三层嵌套（else 分支里继续嵌套）', () => {
    const text = '{{ if a }}A{{ else }}{{ if b }}B{{ else }}{{ if c }}C{{ else }}D{{ /if }}{{ /if }}{{ /if }}';
    expect(interpolateTemplate(text, { a: 1, b: 0, c: 0 })).toBe('A');
    expect(interpolateTemplate(text, { a: 0, b: 1, c: 0 })).toBe('B');
    expect(interpolateTemplate(text, { a: 0, b: 0, c: 1 })).toBe('C');
    expect(interpolateTemplate(text, { a: 0, b: 0, c: 0 })).toBe('D');
  });

  it('HP4:2059 原始嵌套形态三取值渲染正确、无裸标签', () => {
    const text =
      '{{ if ball_partner == "parvati" }}帕瓦蒂{{ else }}{{ if ball_partner == "luna" }}卢娜{{ else }}你独自一人{{ /if }}{{ /if }}';
    expect(interpolateTemplate(text, { ball_partner: 'parvati' })).toBe('帕瓦蒂');
    expect(interpolateTemplate(text, { ball_partner: 'luna' })).toBe('卢娜');
    expect(interpolateTemplate(text, { ball_partner: 'cho' })).toBe('你独自一人');
  });

  it('else 绑定最近未闭合 if', () => {
    const text = '{{ if a }}{{ if b }}X{{ else }}Y{{ /if }}{{ /if }}';
    expect(interpolateTemplate(text, { a: 1, b: 0 })).toBe('Y');
    expect(interpolateTemplate(text, { a: 0, b: 0 })).toBe('');
  });

  it('嵌套块解析出正确的树结构且无诊断', () => {
    const { nodes, diagnostics } = parseTemplate('{{ if a }}x{{ if b }}y{{ /if }}z{{ /if }}');
    expect(diagnostics).toEqual([]);
    expect(nodes).toEqual([
      {
        type: 'if',
        condition: 'a',
        then: [
          { type: 'text', value: 'x' },
          { type: 'if', condition: 'b', then: [{ type: 'text', value: 'y' }] },
          { type: 'text', value: 'z' },
        ],
      },
    ]);
  });
});

describe('大小写与空白容忍（与旧正则一致）', () => {
  it('关键字大小写不敏感', () => {
    const text = '{{ IF gold > 1 }}富{{ Else }}穷{{ /IF }}';
    expect(interpolateTemplate(text, { gold: 5 })).toBe('富');
    expect(interpolateTemplate(text, { gold: 0 })).toBe('穷');
  });

  it('标签内空白可省略或加多', () => {
    const text = '{{if a}}X{{  else  }}Y{{/if}}';
    expect(interpolateTemplate(text, { a: 1 })).toBe('X');
    expect(interpolateTemplate(text, { a: 0 })).toBe('Y');
  });

  it('{{ifx}} 不误触发条件语法，按变量插值处理', () => {
    expect(interpolateTemplate('{{ifx}}', { ifx: 7 })).toBe('7');
    expect(interpolateTemplate('{{ iffy }}', {})).toBe('{{ iffy }}');
  });

  it('{{ if }} 空条件是病态输入：输出原样保留（与旧实现一致），校验器可见诊断', () => {
    // 懒惰 .+? 会把 `}}X{{ /if` 吞成垃圾条件，形成未闭合帧后整体降级还原
    const text = '{{ if }}X{{ /if }}';
    expect(interpolateTemplate(text, {})).toBe(text);
    expect(parseTemplate(text).diagnostics.some((d) => d.code === 'unclosed-if')).toBe(true);
  });
});

describe('条件表达式边界', () => {
  it('条件含引号字符串', () => {
    const text = '{{ if name == "小 红" }}是{{ else }}否{{ /if }}';
    expect(interpolateTemplate(text, { name: '小 红' })).toBe('是');
  });

  it('条件字符串里允许单个 }（懒惰匹配只被 }} 终止）', () => {
    const text = '{{ if mark == "}" }}Q{{ /if }}';
    expect(interpolateTemplate(text, { mark: '}' })).toBe('Q');
    expect(interpolateTemplate(text, { mark: 'x' })).toBe('');
  });

  it('条件解析失败按 false 处理（引擎容错），不漏裸标签', () => {
    expect(interpolateTemplate('{{ if @@bad@@ }}X{{ else }}Y{{ /if }}', {})).toBe('Y');
  });
});

describe('未配平标签降级为字面文本 + diagnostics', () => {
  it('孤儿 {{ else }} 原样保留', () => {
    expect(interpolateTemplate('{{ else }}', {})).toBe('{{ else }}');
    expect(parseTemplate('{{ else }}').diagnostics).toEqual([{ code: 'orphan-else', tag: '{{ else }}', index: 0 }]);
  });

  it('孤儿 {{ /if }} 原样保留', () => {
    expect(interpolateTemplate('A{{ /if }}B', {})).toBe('A{{ /if }}B');
    expect(parseTemplate('A{{ /if }}B').diagnostics).toEqual([{ code: 'orphan-endif', tag: '{{ /if }}', index: 1 }]);
  });

  it('未闭合 if：开标签字面保留，已解析子内容按原顺序输出', () => {
    const text = '{{ if a }}x{{ if b }}y{{ /if }}z';
    expect(interpolateTemplate(text, { a: 1, b: 1 })).toBe('{{ if a }}xyz');
    expect(parseTemplate(text).diagnostics).toEqual([{ code: 'unclosed-if', tag: '{{ if a }}', index: 0 }]);
  });

  it('未闭合 if 带 else：else 标签也字面保留', () => {
    const text = '{{ if a }}x{{ else }}y';
    expect(interpolateTemplate(text, { a: 1 })).toBe('{{ if a }}x{{ else }}y');
    expect(parseTemplate(text).diagnostics).toEqual([{ code: 'unclosed-if', tag: '{{ if a }}', index: 0 }]);
  });

  it('连续 else：第二个按字面文本进当前分支（对拍旧实现）', () => {
    const text = '{{if a}}X{{else}}Y{{else}}Z{{/if}}';
    expect(interpolateTemplate(text, { a: 1 })).toBe('X');
    expect(interpolateTemplate(text, { a: 0 })).toBe('Y{{else}}Z');
    expect(parseTemplate(text).diagnostics).toEqual([{ code: 'duplicate-else', tag: '{{else}}', index: 18 }]);
  });

  it('超过嵌套深度上限的 if 标签降级为字面文本', () => {
    const open = Array.from({ length: 33 }, (_, i) => `{{ if v${i} }}`).join('');
    const close = '{{ /if }}'.repeat(33);
    const { diagnostics } = parseTemplate(`${open}core${close}`);
    // 第 33 层开标签降级 → 其配对 /if 在收尾处成为孤儿
    expect(diagnostics.some((d) => d.code === 'depth-exceeded')).toBe(true);
    expect(diagnostics.some((d) => d.code === 'orphan-endif')).toBe(true);
  });
});

describe('变量插值趟（跑在分支拼接结果上）', () => {
  it('分支拼接形成的 {{var}} 也会被替换（旧实现行为锁定）', () => {
    expect(interpolateTemplate('{{ if a }}{{ gol{{ /if }}d }}', { a: 1, gold: 5 })).toBe('5');
  });

  it('纯变量文本等价旧变量趟', () => {
    expect(interpolateTemplate('你有 {{ gold }} 金币和 {{silver}} 银币', { gold: 100 })).toBe(
      '你有 100 金币和 {{silver}} 银币',
    );
    expect(interpolateTemplate('生命：{{ 生命值 }}', { 生命值: 80 })).toBe('生命：80');
  });

  it('未取分支里的变量不参与插值', () => {
    expect(interpolateTemplate('{{ if a }}{{ gold }}{{ else }}无{{ /if }}', { a: 0, gold: 5 })).toBe('无');
  });

  it('纯文本与空串直通', () => {
    expect(interpolateTemplate('', {})).toBe('');
    expect(interpolateTemplate('普通文本', {})).toBe('普通文本');
  });
});
