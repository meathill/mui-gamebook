import { describe, expect, it } from 'vitest';
import { servedModel } from '../lib/ai-provider';

describe('servedModel', () => {
  it('响应里的模型 ID 优先', () => {
    expect(servedModel('gemini-2.5-flash-001', 'gemini-2.5-flash')).toBe('gemini-2.5-flash-001');
  });

  it('没有响应模型时用本次请求的模型', () => {
    expect(servedModel(undefined, 'mimo-v2.6-flash')).toBe('mimo-v2.6-flash');
  });

  it('空白响应不算有效模型 ID', () => {
    expect(servedModel('   ', 'claude-sonnet-5')).toBe('claude-sonnet-5');
    expect(servedModel('', 'gpt-4o')).toBe('gpt-4o');
  });
});
