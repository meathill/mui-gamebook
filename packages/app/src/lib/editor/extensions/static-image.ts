import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

// 保留 DSL 已支持的静态图片，避免正文编辑后被默认 StarterKit 丢弃。
export const StaticImage = Node.create({
  name: 'image',
  inline: true,
  group: 'inline',
  atom: true,
  addAttributes() {
    return { src: { default: '' }, alt: { default: '' }, title: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'img[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { class: 'max-w-full rounded-md', loading: 'lazy' })];
  },
  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (value: string) => void }, node: ProseMirrorNode) {
          const alt = String(node.attrs.alt ?? '').replace(/([\\[\]])/g, '\\$1');
          state.write('![' + alt + '](<' + String(node.attrs.src).replace(/>/g, '%3E') + '>)');
        },
      },
    };
  },
});
