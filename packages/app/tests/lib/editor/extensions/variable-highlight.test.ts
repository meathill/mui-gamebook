import { describe, it, expect } from 'vitest';
import { findVariableMatches } from '@/lib/editor/extensions/matchers';

describe('findVariableMatches', () => {
  it('匹配单个变量', () => {
    const text = '你有 {{gold}} 金币';
    const matches = findVariableMatches(text);
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('gold');
    expect(text.slice(matches[0].from, matches[0].to)).toBe('{{gold}}');
  });

  it('匹配多个变量', () => {
    const text = '生命值 {{health}}，金币 {{gold}}';
    const matches = findVariableMatches(text);
    expect(matches).toHaveLength(2);
    expect(matches[0].name).toBe('health');
    expect(matches[1].name).toBe('gold');
  });

  it('匹配含下划线的变量名', () => {
    const text = '{{player_name}} 你好';
    const matches = findVariableMatches(text);
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('player_name');
  });

  it('不匹配空变量', () => {
    const text = '这是 {{}} 空的';
    const matches = findVariableMatches(text);
    expect(matches).toHaveLength(0);
  });

  it('不匹配单层大括号', () => {
    const text = '这是 {gold} 单层';
    const matches = findVariableMatches(text);
    expect(matches).toHaveLength(0);
  });

  it('不匹配三层大括号', () => {
    const text = '这是 {{{gold}}} 三层';
    const matches = findVariableMatches(text);
    // 应该匹配内层的 {{gold}}
    expect(matches).toHaveLength(1);
    expect(matches[0].name).toBe('gold');
  });

  it('不匹配含空格的变量名', () => {
    const text = '这是 {{my var}} 有空格';
    const matches = findVariableMatches(text);
    expect(matches).toHaveLength(0);
  });

  it('匹配位于行首的变量', () => {
    const text = '{{health}} 是你的生命值';
    const matches = findVariableMatches(text);
    expect(matches).toHaveLength(1);
    expect(matches[0].from).toBe(0);
  });

  it('匹配位于行尾的变量', () => {
    const text = '当前金币：{{gold}}';
    const matches = findVariableMatches(text);
    expect(matches).toHaveLength(1);
    expect(matches[0].to).toBe(text.length);
  });

  it('纯文本无匹配返回空数组', () => {
    const text = '这是普通文本，没有变量';
    const matches = findVariableMatches(text);
    expect(matches).toHaveLength(0);
  });
});
