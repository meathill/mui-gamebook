'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

interface RichEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

const FRONTMATTER_RE = /^---\n[\s\S]*?\n---\n/;

function splitFrontmatter(markdown: string): { frontmatter: string; body: string } {
  const match = markdown.match(FRONTMATTER_RE);
  if (match) {
    return { frontmatter: match[0], body: markdown.slice(match[0].length) };
  }
  return { frontmatter: '', body: markdown };
}

export default function RichEditor({ content, onChange, placeholder }: RichEditorProps) {
  const frontmatterRef = useRef('');
  const isInternalUpdateRef = useRef(false);

  const { frontmatter, body } = splitFrontmatter(content);
  frontmatterRef.current = frontmatter;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || '',
      }),
      Markdown.configure({
        html: false,
        transformCopiedText: true,
        transformPastedText: true,
      }),
    ],
    content: body,
    onUpdate({ editor }) {
      isInternalUpdateRef.current = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown() as string;
      onChange(frontmatterRef.current + md);
      // 在下一个微任务中重置标志，确保 useEffect 能正确判断
      queueMicrotask(() => {
        isInternalUpdateRef.current = false;
      });
    },
  });

  // 外部内容变化时同步到编辑器（AI 聊天更新等场景）
  useEffect(() => {
    if (!editor || isInternalUpdateRef.current) return;

    const { body: newBody } = splitFrontmatter(content);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentMd = (editor.storage as any).markdown.getMarkdown() as string;

    if (newBody !== currentMd) {
      editor.commands.setContent(newBody);
    }
  }, [content, editor]);

  return (
    <div className="rich-editor w-full h-full overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-inner focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
      <EditorContent
        editor={editor}
        className="h-full"
      />
    </div>
  );
}
