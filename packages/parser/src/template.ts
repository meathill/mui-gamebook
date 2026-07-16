/**
 * 条件文本模板引擎（issue #10）：{{ if }} / {{ else }} / {{ /if }} + {{变量}} 插值。
 * 树解析替换旧的单趟非递归正则，支持任意嵌套（深度上限 MAX_TEMPLATE_DEPTH）。
 *
 * 语法与旧实现逐字节兼容：关键字大小写不敏感、空白容忍、条件单行且不含 `}}`
 * （懒惰 `.+?` 只被 `}}` 终止，条件里允许出现单个 `}`）；变量插值跑在
 * 树求值拼接后的完整字符串上——分支拼接形成的 {{var}} 也会被替换，
 * 孤儿 {{ else }} 等字面标签不会被变量趟误吞。
 *
 * 未配平标签（未闭合 if / 孤儿 else / 孤儿 /if / 重复 else / 超深度）一律降级为
 * 字面文本并记入 diagnostics：运行时对 diagnostics 静默（渲染循环不刷 warn），
 * 报告职责归校验器（scripts/validate-game-script.ts）。
 * 暂不做解析缓存（与旧实现同为每次重扫，量级不变）；如需缓存请对齐
 * expression/index.ts 的 cached Map 模式。
 */
import { evaluateCondition } from './expression';
import type { RuntimeState } from './types';

export type TemplateNode = { type: 'text'; value: string } | TemplateIfNode;

export interface TemplateIfNode {
  type: 'if';
  condition: string;
  then: TemplateNode[];
  else?: TemplateNode[];
}

export type TemplateDiagnosticCode =
  | 'unclosed-if'
  | 'orphan-else'
  | 'duplicate-else'
  | 'orphan-endif'
  | 'depth-exceeded';

export interface TemplateDiagnostic {
  code: TemplateDiagnosticCode;
  /** 标签原文，如 `{{ if a > 1 }}` */
  tag: string;
  /** 标签在原文中的字符偏移 */
  index: number;
}

export interface ParsedTemplate {
  nodes: TemplateNode[];
  diagnostics: TemplateDiagnostic[];
}

/** 嵌套深度上限，呼应表达式引擎 parse.ts 的 MAX_DEPTH */
const MAX_TEMPLATE_DEPTH = 32;

// 三个子模式逐字节沿用旧单趟正则：match[1] 有值 = if 开标签，match[2] 有值 = /if，否则 = else
const TEMPLATE_TAG_REGEX = /\{\{\s*if\s+(.+?)\s*\}\}|\{\{\s*else\s*\}\}|\{\{\s*(\/if)\s*\}\}/gi;

const VARIABLE_REGEX = /\{\{\s*([\p{L}_][\p{L}\p{N}_]*)\s*\}\}/gu;

interface Frame {
  /** 开标签原文（未闭合时降级还原用） */
  raw: string;
  index: number;
  condition: string;
  then: TemplateNode[];
  elseRaw?: string;
  else?: TemplateNode[];
}

/** 条件文本解析为块树；未配平标签降级为字面文本（运行时不炸），diagnostics 供校验器报错 */
export function parseTemplate(text: string): ParsedTemplate {
  const root: TemplateNode[] = [];
  const diagnostics: TemplateDiagnostic[] = [];
  const stack: Frame[] = [];

  // 当前写入目标：栈顶帧的 else（若已出现）或 then 分支，栈空时是顶层
  const sink = (): TemplateNode[] => {
    const top = stack[stack.length - 1];
    if (!top) return root;
    return top.else ?? top.then;
  };

  const pushText = (value: string) => {
    if (value) sink().push({ type: 'text', value });
  };

  let lastIndex = 0;
  for (const match of text.matchAll(TEMPLATE_TAG_REGEX)) {
    const tag = match[0];
    pushText(text.slice(lastIndex, match.index));
    lastIndex = match.index + tag.length;

    const condition = match[1];
    if (condition !== undefined) {
      if (stack.length >= MAX_TEMPLATE_DEPTH) {
        diagnostics.push({ code: 'depth-exceeded', tag, index: match.index });
        pushText(tag);
      } else {
        stack.push({ raw: tag, index: match.index, condition, then: [] });
      }
    } else if (match[2] !== undefined) {
      // {{ /if }}
      const frame = stack.pop();
      if (!frame) {
        diagnostics.push({ code: 'orphan-endif', tag, index: match.index });
        pushText(tag);
      } else {
        const node: TemplateIfNode = { type: 'if', condition: frame.condition, then: frame.then };
        if (frame.else) node.else = frame.else;
        sink().push(node);
      }
    } else {
      // {{ else }}：绑定最近未闭合 if
      const top = stack[stack.length - 1];
      if (!top) {
        diagnostics.push({ code: 'orphan-else', tag, index: match.index });
        pushText(tag);
      } else if (top.else) {
        diagnostics.push({ code: 'duplicate-else', tag, index: match.index });
        pushText(tag);
      } else {
        top.elseRaw = tag;
        top.else = [];
      }
    }
  }
  pushText(text.slice(lastIndex));

  // EOF 未闭合帧自栈顶 unwind：开/else 标签还原为字面文本，已解析的子内容按原顺序落回父级
  while (stack.length > 0) {
    const frame = stack.pop() as Frame;
    diagnostics.push({ code: 'unclosed-if', tag: frame.raw, index: frame.index });
    const target = sink();
    target.push({ type: 'text', value: frame.raw }, ...frame.then);
    if (frame.elseRaw) {
      target.push({ type: 'text', value: frame.elseRaw }, ...(frame.else ?? []));
    }
  }

  return { nodes: root, diagnostics };
}

function renderNodes(nodes: TemplateNode[], state: RuntimeState): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') {
      out += node.value;
    } else {
      out += renderNodes(evaluateCondition(node.condition, state) ? node.then : (node.else ?? []), state);
    }
  }
  return out;
}

/**
 * 运行时入口：条件文本求值 + 变量插值。
 * {{变量}}（Unicode 标识符，两侧空格可选）未声明时原样保留。
 */
export function interpolateTemplate(text: string, state: RuntimeState): string {
  if (!text) return text;

  const { nodes } = parseTemplate(text);
  const resolved = renderNodes(nodes, state);

  return resolved.replace(VARIABLE_REGEX, (match, varName: string) => {
    if (Object.prototype.hasOwnProperty.call(state, varName)) {
      return String(state[varName]);
    }
    return match;
  });
}
