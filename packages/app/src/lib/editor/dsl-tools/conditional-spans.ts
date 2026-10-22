export interface ConditionalSpan {
  from: number;
  to: number;
  markerTo: number;
  condition: string;
  thenText: string;
  elseText: string;
  hasElse: boolean;
}

export function findConditionalSpans(text: string): ConditionalSpan[] {
  const tags = /\{\{\s*if\s+(.+?)\s*\}\}|\{\{\s*else\s*\}\}|\{\{\s*\/if\s*\}\}/gi;
  const stack: Array<{ from: number; markerTo: number; condition: string; elseFrom?: number; elseTo?: number }> = [];
  const spans: ConditionalSpan[] = [];
  for (const match of text.matchAll(tags)) {
    const from = match.index;
    const to = from + match[0].length;
    if (match[1] !== undefined) {
      stack.push({ from, markerTo: to, condition: match[1].trim() });
    } else if (/^\{\{\s*else/i.test(match[0])) {
      const top = stack.at(-1);
      if (!top || top.elseFrom !== undefined) throw new Error('条件文本的 else 没有对应的 if');
      top.elseFrom = from;
      top.elseTo = to;
    } else {
      const top = stack.pop();
      if (!top) throw new Error('条件文本的结束标记没有对应的 if');
      spans.push({
        from: top.from,
        to,
        markerTo: top.markerTo,
        condition: top.condition,
        thenText: text.slice(top.markerTo, top.elseFrom ?? from),
        elseText: top.elseTo === undefined ? '' : text.slice(top.elseTo, from),
        hasElse: top.elseTo !== undefined,
      });
    }
  }
  if (stack.length) throw new Error('条件文本尚未闭合，请补齐 {{ /if }}');
  return spans.sort((a, b) => a.from - b.from);
}
