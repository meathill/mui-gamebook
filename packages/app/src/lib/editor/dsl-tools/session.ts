import type { Editor } from '@tiptap/core';
import type { Fragment } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import type { DslToolRequest } from '../extensions/dsl-tools';
import { readAssetDraft } from './assets';
import { readDslFragment } from './fragments';
import { findDslTarget, findSceneAsset, findSceneRange } from './targets';
import { createDslDraft, isAssetTool, type DslDraft, type DslEditTarget, type DslTextSpan } from './types';

export interface DslEditSession {
  id: string;
  draft: DslDraft;
  target?: DslEditTarget;
  original?: Fragment;
  selection: DslTextSpan;
  slashRange?: DslTextSpan;
  slashText?: string;
  anchor: number;
  sceneId?: string;
  error?: string;
}

export function beginDslSession(editor: Editor, request: DslToolRequest, characters: string[]): DslEditSession {
  const { doc, selection } = editor.state;
  const anchor = request.position ?? selection.from;
  const target = request.slashRange
    ? findSceneAsset(doc, request.kind, anchor)
    : (findDslTarget(doc, request.kind, anchor) ?? findSceneAsset(doc, request.kind, anchor));
  const session: DslEditSession = {
    id: crypto.randomUUID(),
    draft: createDslDraft(request.kind),
    target,
    original: target ? doc.slice(target.from, target.to).content : undefined,
    selection: { from: selection.from, to: selection.to },
    anchor,
    sceneId: findSceneRange(doc, anchor)?.id,
    slashRange: request.slashRange ? { ...request.slashRange } : undefined,
    slashText: request.slashRange ? doc.textBetween(request.slashRange.from, request.slashRange.to) : undefined,
  };
  if (request.kind === 'scene' && !session.sceneId && !doc.textContent.trim()) session.draft.name = 'start';
  try {
    if (target)
      session.draft = isAssetTool(request.kind)
        ? readAssetDraft(request.kind, target.text)
        : readDslFragment(request.kind, target.text, characters);
  } catch (error) {
    session.error = error instanceof Error ? error.message : '无法解析这段内容';
  }
  return session;
}

export function mapDslSession(session: DslEditSession, transaction: Transaction) {
  if (!transaction.docChanged) return;
  session.anchor = transaction.mapping.map(session.anchor);
  session.selection = {
    from: transaction.mapping.map(session.selection.from),
    to: transaction.mapping.map(session.selection.to),
  };
  if (session.target) {
    session.target = {
      ...session.target,
      from: transaction.mapping.map(session.target.from, 1),
      to: transaction.mapping.map(session.target.to, -1),
      blockFrom: transaction.mapping.map(session.target.blockFrom, -1),
    };
  }
  if (session.slashRange)
    session.slashRange = {
      from: transaction.mapping.map(session.slashRange.from, 1),
      to: transaction.mapping.map(session.slashRange.to, -1),
    };
}

export function assertSessionCurrent(editor: Editor, session: DslEditSession) {
  if (session.error) throw new Error(session.error);
  const { doc } = editor.state;
  if (
    session.target &&
    (session.target.to < session.target.from ||
      !doc.slice(session.target.from, session.target.to).content.eq(session.original!))
  ) {
    throw new Error('这段内容已发生变化，请关闭表单后重新打开');
  }
  if (session.slashRange && doc.textBetween(session.slashRange.from, session.slashRange.to) !== session.slashText)
    throw new Error('插入位置已变化，请重新打开工具');
  if (session.sceneId && findSceneRange(doc, session.anchor)?.id !== session.sceneId)
    throw new Error('当前场景已变化，请重新打开工具');
}
