import type { Editor } from '@tiptap/core';

export function getBodyMarkdown(editor: Editor): string {
  return (editor.storage as unknown as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
}

export function getEditorMarkdown(editor: Editor): string {
  return ((editor.state.doc.attrs.dslFrontmatter as string) || '') + getBodyMarkdown(editor);
}

export function splitFrontmatter(source: string) {
  const match = source.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  return { frontmatter: match?.[0] ?? '', body: match ? source.slice(match[0].length) : source };
}
