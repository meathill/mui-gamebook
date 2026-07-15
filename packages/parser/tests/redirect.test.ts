import { describe, expect, it } from 'vitest';
import { parse, stringify } from '../src/index';

function makeSource(body: string): string {
  return `---\ntitle: "测试"\n---\n\n# start\n\n${body}\n\n# role_a\n\n甲。\n\n# role_b\n\n乙。\n`;
}

describe('块级重定向 -> target (if:) (set:)（DSL v2 Phase 3）', () => {
  it('纯路由场景：多条重定向按序解析', () => {
    const r = parse(makeSource('-> role_a (if: score_a > score_b)\n-> role_b (set: fallback = true)'));
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.data.scenes.start.nodes).toEqual([
      { type: 'redirect', nextSceneId: 'role_a', condition: 'score_a > score_b' },
      { type: 'redirect', nextSceneId: 'role_b', set: 'fallback = true' },
    ]);
  });

  it('与正文混排：读完后由「继续」求值路由', () => {
    const r = parse(makeSource('你走到了岔路口。\n\n-> role_a (if: brave)\n-> role_b'));
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.data.scenes.start.nodes.map((n) => n.type)).toEqual(['text', 'redirect', 'redirect']);
  });

  it('条件可用 or/括号（平衡子句扫描）', () => {
    const r = parse(makeSource('-> role_a (if: (a or b) and c)'));
    expect(r.success).toBe(true);
    if (!r.success) return;

    const node = r.data.scenes.start.nodes[0];
    expect(node).toEqual({ type: 'redirect', nextSceneId: 'role_a', condition: '(a or b) and c' });
  });

  it('未知子句透传', () => {
    const r = parse(makeSource('-> role_a (delay: 3)'));
    expect(r.success).toBe(true);
    if (!r.success) return;
    const node = r.data.scenes.start.nodes[0];
    if (node.type !== 'redirect') return;
    expect(node.clauses).toEqual({ delay: '3' });
  });

  it('序列化与往返稳定', () => {
    const src = makeSource('-> role_a (if: score_a > score_b) (set: seen = true)\n-> role_b');
    const r1 = parse(src);
    expect(r1.success).toBe(true);
    if (!r1.success) return;

    const out1 = stringify(r1.data);
    expect(out1).toContain('-> role_a (if: score_a > score_b) (set: seen = true)');
    expect(out1).toContain('-> role_b');

    const r2 = parse(out1);
    expect(r2.success).toBe(true);
    if (!r2.success) return;
    expect(r2.data.scenes.start.nodes).toEqual(r1.data.scenes.start.nodes);
    expect(stringify(r2.data)).toBe(out1);
  });

  it('正文行内的 -> 不受影响（仅行首触发）', () => {
    const r = parse(makeSource('他指了指路牌：A -> B 的方向。'));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.scenes.start.nodes[0].type).toBe('text');
  });
});
