/**
 * DSL 语法匹配器 —— 纯函数，不依赖 TipTap/ProseMirror
 * 用于 Decoration 插件和单元测试
 */

// 选项语法正则
const CHOICE_RE = /\[(.*?)\]\s*->\s*([\w-]+)\s*(.*?)$/;
const IF_CLAUSE_RE = /\(if:\s*(.*?)\)/g;
const SET_CLAUSE_RE = /\(set:\s*(.*?)\)/g;
const AUDIO_CLAUSE_RE = /\(audio:\s*(.*?)\)/g;

// 变量语法正则
const VARIABLE_RE = /\{\{(\w+)\}\}/g;

export interface ChoiceMatch {
  from: number;
  to: number;
  type: 'choice-text' | 'choice-arrow' | 'choice-target' | 'choice-clause';
}

export interface VariableMatch {
  from: number;
  to: number;
  name: string;
}

/**
 * 从文本中找到所有选项语法匹配
 */
export function findChoiceMatches(text: string): ChoiceMatch[] {
  const matches: ChoiceMatch[] = [];
  const m = CHOICE_RE.exec(text);
  if (!m) return matches;

  const matchStart = m.index;

  // [text] 部分
  const bracketStart = matchStart;
  const bracketEnd = bracketStart + m[1].length + 2;
  matches.push({ from: bracketStart, to: bracketEnd, type: 'choice-text' });

  // -> 部分
  const afterBracket = text.indexOf('->', bracketEnd);
  if (afterBracket >= 0) {
    matches.push({ from: afterBracket, to: afterBracket + 2, type: 'choice-arrow' });
  }

  // target 部分
  const targetStart = text.indexOf(m[2], bracketEnd);
  if (targetStart >= 0) {
    matches.push({ from: targetStart, to: targetStart + m[2].length, type: 'choice-target' });
  }

  // clause 部分
  const clauseStr = m[3];
  if (clauseStr) {
    const clauseStart = text.indexOf(clauseStr, targetStart + m[2].length);
    for (const re of [IF_CLAUSE_RE, SET_CLAUSE_RE, AUDIO_CLAUSE_RE]) {
      re.lastIndex = 0;
      let cm: RegExpExecArray | null;
      while ((cm = re.exec(clauseStr)) !== null) {
        const from = clauseStart + cm.index;
        matches.push({ from, to: from + cm[0].length, type: 'choice-clause' });
      }
    }
  }

  return matches;
}

/**
 * 从文本中找到所有 {{variable}} 匹配
 */
export function findVariableMatches(text: string): VariableMatch[] {
  const matches: VariableMatch[] = [];
  VARIABLE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = VARIABLE_RE.exec(text)) !== null) {
    matches.push({
      from: m.index,
      to: m.index + m[0].length,
      name: m[1],
    });
  }
  return matches;
}
