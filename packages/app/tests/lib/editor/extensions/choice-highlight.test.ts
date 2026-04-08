import { describe, it, expect } from 'vitest';
import { findChoiceMatches } from '@/lib/editor/extensions/matchers';

describe('findChoiceMatches', () => {
  it('匹配基本选项语法', () => {
    const text = '[向左走] -> forest_path';
    const matches = findChoiceMatches(text);
    expect(matches.length).toBeGreaterThanOrEqual(3);
    expect(matches.find((m) => m.type === 'choice-text')).toEqual({ from: 0, to: 5, type: 'choice-text' });
    expect(matches.find((m) => m.type === 'choice-arrow')).toBeDefined();
    expect(matches.find((m) => m.type === 'choice-target')?.to).toBe(text.length);
  });

  it('匹配带 if 条件的选项', () => {
    const text = '[开门] -> treasure_room (if: has_key == true)';
    const matches = findChoiceMatches(text);
    const clauses = matches.filter((m) => m.type === 'choice-clause');
    expect(clauses).toHaveLength(1);
    expect(text.slice(clauses[0].from, clauses[0].to)).toBe('(if: has_key == true)');
  });

  it('匹配带 set 的选项', () => {
    const text = '[拾取钥匙] -> room (set: has_key = true, gold = gold + 5)';
    const matches = findChoiceMatches(text);
    const clauses = matches.filter((m) => m.type === 'choice-clause');
    expect(clauses).toHaveLength(1);
    expect(text.slice(clauses[0].from, clauses[0].to)).toContain('set:');
  });

  it('匹配带多个 clause 的选项', () => {
    const text = '[买药水] -> shop (if: gold >= 10) (set: gold = gold - 10) (audio: https://a.com/buy.wav)';
    const matches = findChoiceMatches(text);
    const clauses = matches.filter((m) => m.type === 'choice-clause');
    expect(clauses).toHaveLength(3);
  });

  it('不匹配普通列表项', () => {
    const text = '这是一个普通的列表项';
    const matches = findChoiceMatches(text);
    expect(matches).toHaveLength(0);
  });

  it('不匹配没有箭头的方括号文本', () => {
    const text = '[这只是普通的方括号]';
    const matches = findChoiceMatches(text);
    expect(matches).toHaveLength(0);
  });

  it('匹配中文选项文本', () => {
    const text = '[先吃饭再说] -> car_ride (set: empathy = empathy + 5)';
    const matches = findChoiceMatches(text);
    expect(matches.find((m) => m.type === 'choice-text')).toBeDefined();
    expect(matches.find((m) => m.type === 'choice-target')).toBeDefined();
  });

  it('正确识别 target 中的连字符', () => {
    const text = '[进入] -> dark-castle';
    const matches = findChoiceMatches(text);
    const target = matches.find((m) => m.type === 'choice-target');
    expect(target).toBeDefined();
    expect(text.slice(target!.from, target!.to)).toBe('dark-castle');
  });
});
