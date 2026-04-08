/**
 * 选项高亮扩展
 *
 * 扫描列表项文本，识别 DSL 选项语法并用 Decorations 添加视觉高亮。
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { findChoiceMatches } from './matchers';

const pluginKey = new PluginKey('choiceHighlight');

export const ChoiceHighlight = Extension.create({
  name: 'choiceHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;

            doc.descendants((node, pos) => {
              if (node.type.name !== 'listItem') return;

              const text = node.textContent;
              const matches = findChoiceMatches(text);
              if (matches.length === 0) return;

              // 找到 listItem 内第一个文本节点的绝对位置
              let textOffset = pos;
              node.descendants((child, childPos) => {
                if (child.isText) {
                  textOffset = pos + childPos + 1;
                  return false;
                }
                return true;
              });

              for (const match of matches) {
                decorations.push(
                  Decoration.inline(textOffset + match.from, textOffset + match.to, {
                    class: `dsl-${match.type}`,
                  }),
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
