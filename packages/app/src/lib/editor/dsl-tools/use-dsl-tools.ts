import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { Transaction } from '@tiptap/pm/state';
import type { AICharacter } from '@roudanio/parser';
import type { DslToolRequest } from '../extensions/dsl-tools';
import { beginDslSession, mapDslSession, type DslEditSession } from './session';
import { applyDslEdit } from './apply';
import type { DslDraft } from './types';

export function useDslTools(editor: Editor | null, variables: string[], characters: Record<string, AICharacter>) {
  const [session, setSession] = useState<DslEditSession | null>(null);
  const sessionRef = useRef<DslEditSession | null>(null);
  useEffect(() => {
    if (!editor) return;
    function track({ transaction }: { transaction: Transaction }) {
      if (sessionRef.current) mapDslSession(sessionRef.current, transaction);
    }
    editor.on('transaction', track);
    return () => {
      editor.off('transaction', track);
    };
  }, [editor]);
  function open(request: DslToolRequest) {
    if (!editor) return;
    const next = beginDslSession(editor, request, Object.keys(characters));
    sessionRef.current = next;
    setSession(next);
  }
  function close() {
    const selection = sessionRef.current?.selection;
    sessionRef.current = null;
    setSession(null);
    requestAnimationFrame(() => {
      if (editor && !editor.isDestroyed && selection)
        editor
          .chain()
          .setTextSelection({
            from: Math.min(selection.from, editor.state.doc.content.size),
            to: Math.min(selection.to, editor.state.doc.content.size),
          })
          .focus()
          .run();
    });
  }
  function apply(draft: DslDraft) {
    if (!editor || !sessionRef.current) return;
    applyDslEdit(editor, sessionRef.current, draft, { variables, characters: Object.keys(characters) });
    sessionRef.current = null;
    setSession(null);
    requestAnimationFrame(() => {
      if (!editor.isDestroyed) editor.view.focus();
    });
  }
  return { session, open, close, apply };
}
