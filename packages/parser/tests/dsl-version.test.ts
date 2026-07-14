import { describe, expect, it } from 'vitest';
import { parse, stringify } from '../src/index';

const BODY = `
# start

你好。
`;

describe('dsl_version 版本字段', () => {
  it('解析 dsl_version 并往返保留', () => {
    const src = `---\ndsl_version: 2\ntitle: "测试"\n---\n${BODY}`;
    const result = parse(src);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.dsl_version).toBe(2);

    const out = stringify(result.data);
    expect(out).toMatch(/^---\ndsl_version: 2\n/);

    const again = parse(out);
    expect(again.success).toBe(true);
    if (!again.success) return;
    expect(again.data.dsl_version).toBe(2);
  });

  it('缺省时为 undefined（按 v1 处理），且 stringify 不写出该字段', () => {
    const src = `---\ntitle: "测试"\n---\n${BODY}`;
    const result = parse(src);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.dsl_version).toBeUndefined();
    expect(stringify(result.data)).not.toContain('dsl_version');
  });

  it('非数字值告警并忽略，不影响解析', () => {
    const src = `---\ndsl_version: "two"\ntitle: "测试"\n---\n${BODY}`;
    const result = parse(src);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.dsl_version).toBeUndefined();
    expect(result.warnings.some((w) => w.includes('dsl_version'))).toBe(true);
  });
});
