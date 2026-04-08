/**
 * 选项高亮扩展
 *
 * 扫描列表项文本，识别 DSL 选项语法并用 Decorations 添加视觉高亮。
 * 场景目标 (choice-target) 可点击跳转到对应场景标题。
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { findChoiceMatches } from './matchers';

const pluginKey = new PluginKey('choiceHighlight');

/**
 * 在编辑器中查找指定 scene ID 的 H1 标题位置，并滚动到该位置
 */
function scrollToScene(view: EditorView, sceneId: string): boolean {
  const { doc } = view.state;
  let targetPos = -1;

  doc.descendants((node, pos) => {
    if (targetPos >= 0) return false;
    if (node.type.name === 'heading' && node.attrs.level === 1) {
      const text = node.textContent.trim();
      if (text === sceneId) {
        targetPos = pos;
        return false;
      }
    }
    return true;
  });

  if (targetPos >= 0) {
    // 将光标移到目标位置并滚动
    const tr = view.state.tr.setSelection(TextSelection.near(doc.resolve(targetPos + 1)));
    view.dispatch(tr.scrollIntoView());
    view.focus();
    return true;
  }
  return false;
}

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

              let textOffset = pos;
              node.descendants((child, childPos) => {
                if (child.isText) {
                  textOffset = pos + childPos + 1;
                  return false;
                }
                return true;
              });

              for (const match of matches) {
                const attrs: Record<string, string> = {
                  class: `dsl-${match.type}`,
                };
                // 给 target 加上 data 属性和可点击样式
                if (match.type === 'choice-target') {
                  attrs['data-scene-target'] = text.slice(match.from, match.to);
                }
                decorations.push(Decoration.inline(textOffset + match.from, textOffset + match.to, attrs));
              }
            });

            return DecorationSet.create(doc, decorations);
          },

          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            const sceneId = target.getAttribute('data-scene-target');
            if (sceneId) {
              event.preventDefault();
              return scrollToScene(view, sceneId);
            }
            return false;
          },
        },
      }),
    ];
  },
});
