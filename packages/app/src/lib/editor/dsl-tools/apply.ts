import type { Editor } from '@tiptap/core';
import { Fragment, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import { extractSceneIds } from '../extensions/matchers';
import { writeAssetDraft } from './assets';
import { writeDslFragment } from './fragments';
import { renameSceneReferences } from './rename-scene';
import { assertSessionCurrent, type DslEditSession } from './session';
import { findSceneRange } from './targets';
import { isAssetTool, type DslDraft } from './types';

export function inlineText(schema: Schema, text: string): Fragment {
  const nodes: ProseMirrorNode[] = [];
  for (const [index, line] of text.split('\n').entries()) {
    if (index) nodes.push(schema.nodes.hardBreak.create());
    if (line) nodes.push(schema.text(line));
  }
  return Fragment.from(nodes);
}

function newScene(schema: Schema, name: string) {
  return Fragment.from([schema.nodes.heading.create({ level: 1 }, schema.text(name)), schema.nodes.paragraph.create()]);
}

export function applyDslEdit(
  editor: Editor,
  session: DslEditSession,
  draft: DslDraft,
  context: { characters: string[]; variables: string[] },
) {
  assertSessionCurrent(editor, session);
  const ids = extractSceneIds(editor.state.doc);
  const oldName = session.target?.text.trim();
  if (draft.kind === 'scene') {
    if (oldName === 'start' && draft.name !== 'start') throw new Error('起始场景 start 不能改名');
    if (ids.includes(draft.name) && oldName !== draft.name) throw new Error('场景名称已存在');
  }
  if (draft.kind === 'choice' || draft.kind === 'redirect') {
    if (draft.createTarget && ids.includes(draft.target)) throw new Error('目标场景已经存在，请直接选择');
    if (!draft.createTarget && !ids.includes(draft.target)) throw new Error('目标场景不存在，请选择或新建目标');
  }
  if (draft.kind === 'dialogue' && !context.characters.includes(draft.speaker))
    throw new Error('角色已不存在，请重新选择');
  if (draft.kind === 'variable' && !context.variables.includes(draft.variable))
    throw new Error('变量已不存在，请重新选择');
  const original = session.target?.text ?? '';
  const text = isAssetTool(draft.kind) ? writeAssetDraft(draft, original) : writeDslFragment(draft, original);
  const { schema } = editor.state;
  const tr = closeHistory(editor.state.tr);
  if (session.slashRange) tr.delete(session.slashRange.from, session.slashRange.to);
  const anchor = tr.mapping.map(session.anchor);
  const scene = findSceneRange(tr.doc, anchor);
  if (!scene && draft.kind !== 'scene') throw new Error('请先新建场景，再添加剧情内容');
  let focus = anchor;
  if (session.target) {
    const from = tr.mapping.map(session.target.from);
    const to = tr.mapping.map(session.target.to);
    tr.replaceWith(
      from,
      to,
      isAssetTool(draft.kind) || draft.kind === 'scene'
        ? text
          ? schema.text(text)
          : Fragment.empty
        : inlineText(schema, text),
    );
    focus = from + text.length;
    if (draft.kind === 'scene' && oldName !== draft.name) renameSceneReferences(tr, oldName!, draft.name);
  } else if (draft.kind === 'variable') {
    const from = tr.mapping.map(session.selection.from);
    const to = tr.mapping.map(session.selection.to);
    tr.insertText(text, from, to);
    focus = from + text.length;
  } else if (draft.kind === 'scene') {
    const position = scene?.to ?? tr.doc.content.size;
    tr.insert(position, newScene(schema, text));
    focus = position + text.length + 3;
  } else if (draft.kind === 'choice' || draft.kind === 'redirect') {
    const paragraph = schema.nodes.paragraph.create(null, inlineText(schema, text));
    const node =
      draft.kind === 'choice'
        ? schema.nodes.bulletList.create(null, schema.nodes.listItem.create(null, paragraph))
        : paragraph;
    const position = scene!.to;
    tr.insert(position, node);
    focus = position + (draft.kind === 'choice' ? 3 : 1);
  } else if (isAssetTool(draft.kind)) {
    const position = scene!.contentFrom;
    tr.insert(position, schema.nodes.codeBlock.create({ language: 'yaml' }, schema.text(text)));
    focus = position + 1;
  } else {
    const resolved = tr.doc.resolve(anchor);
    const position = resolved.depth ? resolved.after(1) : anchor;
    tr.insert(position, schema.nodes.paragraph.create(null, inlineText(schema, text)));
    focus = position + 1;
  }
  if ((draft.kind === 'choice' || draft.kind === 'redirect') && draft.createTarget) {
    const position = tr.doc.content.size;
    tr.insert(position, newScene(schema, draft.target));
  }
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(focus, tr.doc.content.size))));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.dispatch(closeHistory(editor.state.tr));
  editor.view.focus();
}
