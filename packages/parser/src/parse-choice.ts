/**
 * 选项行解析（DSL_V2_DESIGN §4.6）。
 * 语法：`* [选项文本] -> SceneID (if: ...) (set: ...) (audio: ...) (自定义: ...)`
 *
 * 相比旧版非贪婪正则的两点健壮化：
 * 1. 选项文本贪婪匹配到最后一个 `] ->`，文本可以包含 `]`
 * 2. 子句用引号感知的括号深度扫描提取，值可以包含 `)`（URL、带括号的表达式）
 * 未知子句进 choice.clauses 原样透传，新增子句类型不需要动 parser。
 */
import type { List } from 'mdast';
import { toString } from 'mdast-util-to-string';
import type { Diagnostic, DiagnosticReporter, SceneChoiceNode, SceneNode } from './types';

// 选项文本贪婪匹配：允许文本内出现 ]，以最后一个 "] -> 场景ID" 为界
const CHOICE_LINE_REGEX = /^\[([\s\S]*)\]\s*->\s*([\w-]+)\s*(.*)$/;

/** 已知子句 → 节点字段的映射，其余子句透传 */
const KNOWN_CLAUSES = new Set(['if', 'set', 'audio']);

export interface Clause {
  key: string;
  value: string;
}

/**
 * 从子句串中扫描全部 `(key: value)`。
 * 括号按深度配对（值可含括号），单/双引号内的括号不计入深度。
 */
export function scanClauses(input: string): Clause[] {
  const clauses: Clause[] = [];
  let i = 0;

  while (i < input.length) {
    if (input[i] !== '(') {
      i++;
      continue;
    }

    let depth = 0;
    let quote: string | null = null;
    let j = i;
    for (; j < input.length; j++) {
      const ch = input[j];
      if (quote) {
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) break; // 括号不平衡，放弃剩余部分

    const inner = input.slice(i + 1, j);
    const colon = inner.indexOf(':');
    if (colon > 0) {
      const key = inner.slice(0, colon).trim();
      const value = inner.slice(colon + 1).trim();
      // 子句键必须是简单标识符，否则视为普通括号文本（如台词里的旁注）
      if (/^[a-z][\w-]*$/i.test(key)) {
        clauses.push({ key, value });
      }
    }
    i = j + 1;
  }

  return clauses;
}

export function parseChoices(list: List, report?: DiagnosticReporter, sceneId?: string): SceneNode[] {
  const nodes: SceneNode[] = [];

  if (list.ordered) return nodes;

  for (const item of list.children) {
    const firstChild = item.children[0];
    if (!firstChild || firstChild.type !== 'paragraph') continue;

    const textContent = toString(firstChild).trim();
    const match = textContent.match(CHOICE_LINE_REGEX);
    if (!match) {
      // 无序列表项不是选项语法：正文叙事里的普通列表会被丢弃，必须可见（P1）
      report?.({
        severity: 'warning',
        code: 'ignored-list-item',
        message: `List item is not a valid choice and will be dropped: "${textContent.slice(0, 40)}"`,
        sceneId,
        line: item.position?.start.line,
      } satisfies Diagnostic);
      continue;
    }

    const [, text, nextSceneId, clausesStr] = match;
    const choiceNode: SceneChoiceNode = { type: 'choice', text, nextSceneId };

    if (clausesStr) {
      for (const { key, value } of scanClauses(clausesStr)) {
        if (key === 'if' && choiceNode.condition === undefined) {
          choiceNode.condition = value;
        } else if (key === 'set' && choiceNode.set === undefined) {
          choiceNode.set = value;
        } else if (key === 'audio' && choiceNode.audio_url === undefined) {
          choiceNode.audio_url = value;
        } else if (!KNOWN_CLAUSES.has(key)) {
          choiceNode.clauses = choiceNode.clauses ?? {};
          if (!(key in choiceNode.clauses)) choiceNode.clauses[key] = value;
        }
      }
    }
    nodes.push(choiceNode);
  }
  return nodes;
}
