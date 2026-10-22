import { describe, expect, it } from 'vitest';
import { parse } from '@roudanio/parser';
import { readDslFragment, writeDslFragment } from '@/lib/editor/dsl-tools/fragments';
import { findConditionalSpans } from '@/lib/editor/dsl-tools/conditional-spans';

describe('DSL 表单片段', () => {
  it('角色列表中不可用于对话的标识不会生成失效语法', () => {
    const draft = readDslFragment('dialogue', '@hero: 你好', ['hero']);
    expect(() => writeDslFragment({ ...draft, speaker: 'hero-alt' })).toThrow('角色标识');
  });
  it('修改选项只替换表单字段，保留语音和未知子句', () => {
    const text = '[看看 [里面]] -> 房间 (if: gold > (2 + 3)) (audio: https://a.test/(voice).mp3) (timer: 10)';
    const draft = readDslFragment('choice', text);
    expect(draft.condition).toBe('gold > (2 + 3)');
    draft.text = '开门';
    draft.target = '森林';
    expect(writeDslFragment(draft, text)).toBe(
      '[开门] -> 森林 (if: gold > (2 + 3)) (audio: https://a.test/(voice).mp3) (timer: 10)',
    );
  });

  it('读取引号内括号与逗号', () => {
    const draft = readDslFragment('redirect', '-> end (if: name == "a,)b") (set: score = score + 2)');
    expect(draft.condition).toBe('name == "a,)b"');
    expect(writeDslFragment(draft)).toContain('(if: name == "a,)b")');
  });

  it.each([
    '[开门] -> room (if: gold > (2)',
    '[开门] -> room 多余文字',
    '[开门] -> room (if: a) (if: b)',
  ])('残缺内容不进入可写表单：%s', (text) => {
    expect(() => readDslFragment('choice', text)).toThrow();
  });

  it('嵌套条件按点击的完整范围读写，保持文本空白', () => {
    const text = '{{ if a }}甲{{ if b }}乙{{ else }}丙{{ /if }}丁{{ else }}戊{{ /if }}';
    const spans = findConditionalSpans(text);
    expect(spans).toHaveLength(2);
    expect(writeDslFragment(readDslFragment('conditional', text))).toBe(text);
    const inner = spans[1];
    expect(readDslFragment('conditional', text.slice(inner.from, inner.to)).thenText).toBe('乙');
  });

  it('中文角色、变量和场景与解析器兼容', () => {
    expect(readDslFragment('variable', '{{ 金币 }}').variable).toBe('金币');
    const dialogue = readDslFragment('dialogue', '@主角（低声）：你好', ['主角']);
    expect(writeDslFragment(dialogue)).toBe('@主角 (低声): 你好');
    const choice = writeDslFragment({ ...readDslFragment('choice', '[走] -> 森林'), condition: '金币 > 0' });
    const result = parse('---\ntitle: 测试\n---\n\n# start\n\n* ' + choice + '\n\n# 森林\n\n到了');
    expect(result.success && result.data.scenes.start.nodes[0]).toMatchObject({
      type: 'choice',
      nextSceneId: '森林',
      condition: '金币 > 0',
    });
  });
});
