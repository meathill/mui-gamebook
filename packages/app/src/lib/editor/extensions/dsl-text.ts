import { Node } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { escapeProse } from '@roudanio/parser/src/serialize';

interface MarkdownTextState {
  text: (text: string, escape?: boolean) => void;
}

// 使用标准 text 节点，只为 DSL 语句关闭 Markdown 的二次转义。
export const DslText = Node.create({
  name: 'text',
  group: 'inline',
  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownTextState, node: ProseMirrorNode, parent: ProseMirrorNode) {
          const isDsl =
            (parent.type.name === 'heading' && parent.attrs.level === 1) ||
            /^\[[\s\S]*\]\s*->/.test(parent.textContent) ||
            /^\s*(->|@)/m.test(parent.textContent) ||
            parent.textContent.includes('{{');
          const text = node.text ?? '';
          const choice = text === parent.textContent ? text.match(/^\[([\s\S]*)\](\s*->\s*[\s\S]+)$/) : null;
          if (choice) state.text('[' + escapeProse(choice[1]) + ']' + choice[2], false);
          else if (/^<!--\s*audio:.*-->\s*$/.test(text)) state.text(text, false);
          else if (parent.type.name !== 'heading' && !/^\s*->/.test(text) && isDsl)
            state.text(escapeProse(text), false);
          else if (isDsl) state.text(text, false);
          else state.text((node.text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        },
      },
    };
  },
});
