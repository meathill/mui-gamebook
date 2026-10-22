import { Extension, type Editor } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { findDslTargets } from '../dsl-tools/targets';
import type { DslTextSpan, DslToolKind } from '../dsl-tools/types';
import { REDIRECT_FRAGMENT } from '../dsl-tools/fragments';

export interface DslToolRequest {
  kind: DslToolKind;
  position?: number;
  slashRange?: DslTextSpan;
}

interface DslToolsStorage {
  request: (request: DslToolRequest) => void;
}

export function requestDslTool(editor: Editor, request: DslToolRequest): boolean {
  const storage = (editor.storage as { dslTools?: DslToolsStorage } | undefined)?.dslTools;
  if (!storage) return false;
  storage.request(request);
  return true;
}

export const DslTools = Extension.create<{ onRequest: (request: DslToolRequest) => void }, DslToolsStorage>({
  name: 'dslTools',
  addOptions() {
    return { onRequest: () => {} };
  },
  addStorage() {
    return { request: (request) => this.options.onRequest(request) };
  },
  addGlobalAttributes() {
    return [{ types: ['doc'], attributes: { dslFrontmatter: { default: '', rendered: false } } }];
  },
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations = findDslTargets(state.doc)
              .filter((target) => target.markerTo > target.markerFrom)
              .map((target) =>
                Decoration.inline(target.markerFrom, target.markerTo, {
                  class: 'dsl-editable',
                  'data-dsl-tool': target.kind,
                  'data-dsl-position': String(target.from),
                  title: '点击用表单编辑；也可直接修改文字',
                }),
              );
            for (const target of findDslTargets(state.doc)) {
              if (target.kind !== 'redirect') continue;
              const match = target.text.match(REDIRECT_FRAGMENT);
              if (!match) continue;
              const from = target.from + target.text.indexOf(match[1], target.text.indexOf('->') + 2);
              decorations.push(
                Decoration.inline(from, from + match[1].length, {
                  class: 'dsl-choice-target',
                  'data-scene-target': match[1],
                  title: '前往场景 ' + match[1],
                }),
              );
            }
            return DecorationSet.create(state.doc, decorations);
          },
          handleClick(view, _position, event) {
            if (view.composing || !view.state.selection.empty || event.detail > 1) return false;
            const element = (event.target as HTMLElement).closest<HTMLElement>('[data-dsl-tool]');
            if (!element) return false;
            requestDslTool(editor, {
              kind: element.dataset.dslTool as DslToolKind,
              position: Number(element.dataset.dslPosition),
            });
            return true;
          },
        },
      }),
    ];
  },
});
