import { describe, it, expect } from 'vitest';
import { formatDate, formatLongDate, formatDateTime, formatShortDateTime } from '../src/utils/date-format';

const sample = new Date(2026, 6, 17, 14, 30); // 本地时间 2026-07-17 14:30

describe('date-format', () => {
  it('formatDate 输出短数字日期', () => {
    expect(formatDate(sample)).toBe('2026/7/17');
  });

  it('formatLongDate 输出长文字日期', () => {
    expect(formatLongDate(sample)).toBe('2026年7月17日');
  });

  it('formatDateTime 输出短日期 + 短时间', () => {
    expect(formatDateTime(sample)).toBe('2026/7/17 14:30');
  });

  it('formatShortDateTime 输出月日 + 时分，不含年份', () => {
    expect(formatShortDateTime(sample)).toBe('07/17 14:30');
  });

  it('接受时间戳（number）与 ISO 字符串作为输入', () => {
    expect(formatDate(sample.getTime())).toBe('2026/7/17');
    expect(formatDate(sample.toISOString())).toBe(formatDate(sample));
  });
});
