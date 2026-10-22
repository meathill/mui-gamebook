import { parseProseBlock, parseTemplate, validateExpression, isReferenceableSceneId } from '@roudanio/parser';
import { createDslDraft, type DslDraft, type DslToolKind } from './types';
import { readClauseSpans, updateClauses } from './clauses';
import { findConditionalSpans } from './conditional-spans';

export const CHOICE_FRAGMENT = /^\[([\s\S]*)\]\s*->\s*([\p{L}\p{N}_-]+)([\s\S]*)$/u;
export const REDIRECT_FRAGMENT = /^->\s*([\p{L}\p{N}_-]+)([\s\S]*)$/u;
export const VARIABLE_FRAGMENT = /^\{\{\s*([\p{L}_][\p{L}\p{N}_]*)\s*\}\}$/u;

export function readDslFragment(kind: DslToolKind, text: string, characters: string[] = []): DslDraft {
  const draft = createDslDraft(kind);
  if (kind === 'scene') draft.name = text.trim();
  if (kind === 'choice' || kind === 'redirect') {
    const match = text.match(kind === 'choice' ? CHOICE_FRAGMENT : REDIRECT_FRAGMENT);
    if (!match) throw new Error('无法完整识别这段跳转，请先直接修改原文');
    draft.text = kind === 'choice' ? match[1] : '';
    draft.target = match[kind === 'choice' ? 2 : 1];
    const clauses = readClauseSpans(match[kind === 'choice' ? 3 : 2]);
    for (const key of ['if', 'set']) {
      if (clauses.filter((item) => item.key === key).length > 1) throw new Error('存在重复的 ' + key + ' 子句');
    }
    draft.condition = clauses.find((item) => item.key === 'if')?.value ?? '';
    draft.stateChange = clauses.find((item) => item.key === 'set')?.value ?? '';
  }
  if (kind === 'dialogue') {
    const nodes = parseProseBlock(text, new Set(characters));
    const node = nodes[0];
    if (nodes.length !== 1 || node.type !== 'dialogue') throw new Error('请先在角色面板定义这位角色，或修正对话语法');
    draft.speaker = node.speaker;
    draft.emotion = node.emotion ?? '';
    draft.text = node.content;
  }
  if (kind === 'variable') {
    const match = text.match(VARIABLE_FRAGMENT);
    if (!match) throw new Error('无法识别变量引用');
    draft.variable = match[1];
  }
  if (kind === 'conditional') {
    const parsed = parseTemplate(text);
    if (parsed.diagnostics.length) throw new Error('条件文本未完整配对，请先直接修改原文');
    const span = findConditionalSpans(text).find((item) => item.from === 0 && item.to === text.length);
    if (!span) throw new Error('无法完整识别条件文本');
    Object.assign(draft, {
      condition: span.condition,
      thenText: span.thenText,
      elseText: span.elseText,
      hasElse: span.hasElse,
    });
  }
  return draft;
}

function checkExpression(value: string, mode: 'condition' | 'statements') {
  if (!value.trim()) return;
  const validation = validateExpression(value, mode);
  if (!validation.ok) throw new Error('表达式有误：' + validation.error);
  if (/[\r\n]/.test(value)) throw new Error('表达式不能跨行');
}

export function writeDslFragment(draft: DslDraft, original = ''): string {
  checkExpression(draft.condition, 'condition');
  checkExpression(draft.stateChange, 'statements');
  switch (draft.kind) {
    case 'scene':
      if (!isReferenceableSceneId(draft.name)) throw new Error('场景名称只能包含中文、字母、数字、下划线和连字符');
      return draft.name;
    case 'choice':
    case 'redirect': {
      if (!isReferenceableSceneId(draft.target)) throw new Error('请选择有效的目标场景');
      if (draft.kind === 'choice' && (!draft.text.trim() || /[\r\n]/.test(draft.text)))
        throw new Error('选项文字不能为空或跨行');
      const match = original.match(draft.kind === 'choice' ? CHOICE_FRAGMENT : REDIRECT_FRAGMENT);
      const tail = match?.[draft.kind === 'choice' ? 3 : 2] ?? '';
      const prefix = draft.kind === 'choice' ? '[' + draft.text + '] -> ' : '-> ';
      return prefix + draft.target + updateClauses(tail, { if: draft.condition, set: draft.stateChange });
    }
    case 'dialogue':
      if (!draft.speaker || !draft.text.trim()) throw new Error('请选择角色并填写台词');
      if (/[\r\n]/.test(draft.text) || /[()（）\r\n]/.test(draft.emotion))
        throw new Error('单条对话不能跨行，语气不能包含括号');
      return '@' + draft.speaker + (draft.emotion ? ' (' + draft.emotion + ')' : '') + ': ' + draft.text;
    case 'variable':
      if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(draft.variable)) throw new Error('请选择有效变量');
      return '{{' + draft.variable + '}}';
    case 'conditional': {
      if (!draft.condition.trim() || draft.condition.includes('}}')) throw new Error('请填写有效条件');
      const text =
        '{{ if ' +
        draft.condition +
        ' }}' +
        draft.thenText +
        (draft.hasElse ? '{{ else }}' + draft.elseText : '') +
        '{{ /if }}';
      if (/\n\s*\n/.test(text)) throw new Error('条件文本不能包含空行，请使用单次换行');
      if (parseTemplate(text).diagnostics.length) throw new Error('条件文本的嵌套标记未正确配对');
      return text;
    }
    default:
      throw new Error('素材请使用元数据表单');
  }
}
