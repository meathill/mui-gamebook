/**
 * 变量标签高亮扩展
 *
 * 扫描文本节点，识别 `{{variable_name}}` 模式并渲染为彩色标签。
 * 悬停显示变量名提示，点击可跳转到左侧栏变量面板。
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { findVariableMatches } from './matchers';

const pluginKey = new PluginKey('variableHighlight');

export const VariableHighlight = Extension.create({
  name: 'variableHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;

            doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;

              const matches = findVariableMatches(node.text);
              for (const match of matches) {
                decorations.push(
                  Decoration.inline(pos + match.from, pos + match.to, {
                    class: 'dsl-variable',
                    'data-variable': match.name,
                    title: `变量: ${match.name}`,
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
