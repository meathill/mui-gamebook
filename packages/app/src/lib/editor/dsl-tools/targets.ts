import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { findConditionalSpans } from './conditional-spans';
import { type DslEditTarget, type DslToolKind, isAssetTool } from './types';

export function textblockContent(node: ProseMirrorNode): string {
  return node.textBetween(0, node.content.size, '', '\n');
}

export function findDslTargets(doc: ProseMirrorNode): DslEditTarget[] {
  const targets: DslEditTarget[] = [];
  doc.descendants((node, position, parent) => {
    if (!node.isTextblock) return;
    const text = textblockContent(node);
    const base = position + 1;
    function add(kind: DslToolKind, from: number, to: number, markerFrom = from, markerTo = to) {
      targets.push({
        kind,
        text: text.slice(from, to),
        from: base + from,
        to: base + to,
        markerFrom: base + markerFrom,
        markerTo: base + markerTo,
        blockFrom: position,
      });
    }
    if (node.type.name === 'heading' && node.attrs.level === 1) {
      add('scene', 0, text.length);
      return false;
    }
    if (node.type.name === 'codeBlock') {
      if (node.attrs.language === 'yaml') {
        for (const match of text.matchAll(/^(image|audio|video|minigame):/gm)) {
          add(match[1] as DslToolKind, 0, text.length, match.index, match.index + match[0].length);
        }
      }
      return false;
    }
    if (node.type.name !== 'paragraph') return false;
    const choice = text.match(/^\[([\s\S]*)\]\s*->/);
    if (parent?.type.name === 'listItem' && choice)
      add(
        'choice',
        0,
        text.length,
        0,
        text.lastIndexOf('] ->') >= 0 ? text.lastIndexOf('] ->') + 1 : choice[0].indexOf('->'),
      );
    let offset = 0;
    for (const line of text.split('\n')) {
      const arrow = line.match(/^\s*->/);
      if (arrow) add('redirect', offset, offset + line.length, offset + line.indexOf('->'), offset + arrow[0].length);
      const dialogue = line.match(/^\s*@[^\s:：(（]+(?:\s*[(（].*?[)）])?\s*[:：]/);
      if (dialogue) add('dialogue', offset, offset + line.length, offset, offset + dialogue[0].length);
      offset += line.length + 1;
    }
    for (const match of text.matchAll(/\{\{\s*[\p{L}_][\p{L}\p{N}_]*\s*\}\}/gu)) {
      if (/^\{\{\s*else\s*\}\}$/i.test(match[0])) continue;
      add('variable', match.index, match.index + match[0].length);
    }
    try {
      for (const span of findConditionalSpans(text)) add('conditional', span.from, span.to, span.from, span.markerTo);
    } catch {
      // 残缺条件也提供入口，由表单显示原文诊断而不是静默覆盖。
      for (const match of text.matchAll(/\{\{\s*if\b[^}]*\}\}/gi))
        add('conditional', match.index, text.length, match.index, match.index + match[0].length);
    }
    return false;
  });
  return targets;
}

export function findDslTarget(doc: ProseMirrorNode, kind: DslToolKind, position: number): DslEditTarget | undefined {
  return findDslTargets(doc)
    .filter((target) => target.kind === kind && position >= target.from - 1 && position <= target.to + 1)
    .sort((a, b) => a.to - a.from - (b.to - b.from))[0];
}

export function findSceneRange(doc: ProseMirrorNode, position: number) {
  const headings: Array<{ id: string; from: number; contentFrom: number; to: number }> = [];
  doc.forEach((node, offset) => {
    if (node.type.name === 'heading' && node.attrs.level === 1)
      headings.push({
        id: node.textContent.trim(),
        from: offset,
        contentFrom: offset + node.nodeSize,
        to: doc.content.size,
      });
  });
  for (let index = 0; index < headings.length - 1; index++) headings[index].to = headings[index + 1].from;
  return (
    headings.find((heading) => position >= heading.from && position < heading.to) ??
    (position === doc.content.size ? headings.at(-1) : undefined)
  );
}

export function findSceneAsset(doc: ProseMirrorNode, kind: DslToolKind, position: number): DslEditTarget | undefined {
  if (!isAssetTool(kind)) return;
  const scene = findSceneRange(doc, position);
  if (!scene) return;
  let result: DslEditTarget | undefined;
  doc.nodesBetween(scene.contentFrom, scene.to, (node, pos) => {
    if (result || node.type.name !== 'codeBlock' || node.attrs.language !== 'yaml') return false;
    result = {
      kind,
      from: pos + 1,
      to: pos + node.nodeSize - 1,
      text: node.textContent,
      blockFrom: pos,
      markerFrom: pos + 1,
      markerTo: pos + 1,
    };
    return false;
  });
  return result;
}
