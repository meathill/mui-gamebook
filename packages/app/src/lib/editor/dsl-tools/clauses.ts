import { scanClauses } from '@roudanio/parser';

export interface DslClauseSpan {
  key: string;
  value: string;
  from: number;
  to: number;
}

// 位置仅用于局部修改；实际子句含义仍交给 parser。
export function readClauseSpans(source: string): DslClauseSpan[] {
  const spans: DslClauseSpan[] = [];
  let index = 0;
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index++;
      continue;
    }
    const from = index;
    if (source[index] !== '(') throw new Error('子句中有无法识别的文字，请先直接修改原文');
    let depth = 0;
    let quote = '';
    for (; index < source.length; index++) {
      const char = source[index];
      if (quote) {
        if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '(') depth++;
      if (char === ')' && --depth === 0) {
        index++;
        break;
      }
    }
    if (depth !== 0 || quote) throw new Error('子句的括号或引号未闭合，请先直接修改原文');
    const parsed = scanClauses(source.slice(from, index));
    if (parsed.length !== 1) throw new Error('无法完整识别该子句，请先直接修改原文');
    spans.push({ ...parsed[0], from, to: index });
  }
  return spans;
}

export function updateClauses(source: string, updates: Record<string, string>): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const clause of readClauseSpans(source)) {
    if (!(clause.key in updates)) {
      parts.push(source.slice(clause.from, clause.to));
      continue;
    }
    if (seen.has(clause.key)) throw new Error('存在重复的 ' + clause.key + ' 子句，请先直接修改原文');
    seen.add(clause.key);
    if (updates[clause.key].trim()) parts.push('(' + clause.key + ': ' + updates[clause.key].trim() + ')');
  }
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key) && value.trim()) parts.push('(' + key + ': ' + value.trim() + ')');
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}
