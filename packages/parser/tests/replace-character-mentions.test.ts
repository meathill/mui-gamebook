import { describe, it, expect } from 'vitest';
import { replaceCharacterMentions } from '../src/replace-character-mentions';

describe('replaceCharacterMentions', () => {
  const characters = {
    lrrh: { name: '小红帽' },
    wolf: { name: '大灰狼' },
    grandma: { name: '外婆' },
  };

  it('should replace single character mention', () => {
    const text = '@lrrh 走在森林小路上';
    const result = replaceCharacterMentions(text, characters);
    expect(result).toBe('小红帽 走在森林小路上');
  });

  it('should replace multiple character mentions', () => {
    const text = '@lrrh 在森林里遇到了 @wolf';
    const result = replaceCharacterMentions(text, characters);
    expect(result).toBe('小红帽 在森林里遇到了 大灰狼');
  });

  it('should handle mention at end of text', () => {
    const text = '这是 @grandma';
    const result = replaceCharacterMentions(text, characters);
    expect(result).toBe('这是 外婆');
  });

  it('should keep original text if character not found', () => {
    const text = '@unknown 是一个未知角色';
    const result = replaceCharacterMentions(text, characters);
    expect(result).toBe('@unknown 是一个未知角色');
  });

  it('should return original text if no characters provided', () => {
    const text = '@lrrh 走在路上';
    expect(replaceCharacterMentions(text, undefined)).toBe(text);
    expect(replaceCharacterMentions(text, {})).toBe(text);
  });

  it('should handle text without any mentions', () => {
    const text = '这是一段普通文本';
    const result = replaceCharacterMentions(text, characters);
    expect(result).toBe('这是一段普通文本');
  });

  it('should handle multiple occurrences of same character', () => {
    const text = '@lrrh 说: "你好"，@lrrh 又说: "再见"';
    const result = replaceCharacterMentions(text, characters);
    expect(result).toBe('小红帽 说: "你好"，小红帽 又说: "再见"');
  });
});
