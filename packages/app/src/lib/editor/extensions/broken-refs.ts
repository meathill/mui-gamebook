/**
 * 断链检测扩展
 *
 * 检测选项中指向不存在场景的 target，以及引用未定义变量的 {{var}}。
 * 用红色波浪下划线标记错误。
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { findChoiceMatches, findVariableMatches, extractSceneIds } from './matchers';

const pluginKey = new PluginKey('brokenRefs');

export const BrokenRefs = Extension.create({
  name: 'brokenRefs',

  addOptions() {
    return {
      /** 已定义的变量名列表，由外部传入 */
      variableNames: [] as string[],
    };
  },

  addProseMirrorPlugins() {
    const variableNames = this.options.variableNames as string[];

    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;

            // 收集所有场景 ID
            const sceneIds = new Set(extractSceneIds(doc));

            // 检测选项中的无效场景引用
            doc.descendants((node, pos) => {
              if (node.type.name === 'listItem') {
                const text = node.textContent;
                const matches = findChoiceMatches(text);
                const targetMatch = matches.find((m) => m.type === 'choice-target');
                if (targetMatch) {
                  const targetId = text.slice(targetMatch.from, targetMatch.to);
                  if (!sceneIds.has(targetId)) {
                    // 找到文本在文档中的偏移
                    let textOffset = pos;
                    node.descendants((child, childPos) => {
                      if (child.isText) {
                        textOffset = pos + childPos + 1;
                        return false;
                      }
                      return true;
                    });
                    decorations.push(
                      Decoration.inline(textOffset + targetMatch.from, textOffset + targetMatch.to, {
                        class: 'dsl-broken-ref',
                        title: `场景 "${targetId}" 不存在`,
                      }),
                    );
                  }
                }
              }

              // 检测未定义的变量引用
              if (node.isText && node.text && variableNames.length > 0) {
                const varMatches = findVariableMatches(node.text);
                for (const vm of varMatches) {
                  if (!variableNames.includes(vm.name)) {
                    decorations.push(
                      Decoration.inline(pos + vm.from, pos + vm.to, {
                        class: 'dsl-broken-ref',
                        title: `变量 "${vm.name}" 未定义`,
                      }),
                    );
                  }
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
