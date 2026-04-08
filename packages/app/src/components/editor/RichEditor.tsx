'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { ChoiceHighlight } from '@/lib/editor/extensions/choice-highlight';
import { VariableHighlight } from '@/lib/editor/extensions/variable-highlight';
import { AssetPreview } from '@/lib/editor/extensions/asset-preview';
import { SlashCommands } from '@/lib/editor/extensions/slash-commands';
import { slashCommandRender } from '@/lib/editor/extensions/slash-command-render';
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  CodeIcon,
  MinusIcon,
  Undo2Icon,
  Redo2Icon,
} from 'lucide-react';

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
      ChoiceHighlight,
      VariableHighlight,
      AssetPreview,
      SlashCommands.configure({
        suggestion: {
          render: slashCommandRender,
        },
      }),
    ],
    content: body,
    onUpdate({ editor }) {
      isInternalUpdateRef.current = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown() as string;
      onChange(frontmatterRef.current + md);
      queueMicrotask(() => {
        isInternalUpdateRef.current = false;
      });
    },
  });

  // 外部内容变化时同步到编辑器
  useEffect(() => {
    if (!editor || isInternalUpdateRef.current) return;

    const { body: newBody } = splitFrontmatter(content);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentMd = (editor.storage as any).markdown.getMarkdown() as string;

    if (newBody !== currentMd) {
      editor.commands.setContent(newBody);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="rich-editor w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* 格式工具栏 */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 shrink-0 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="加粗 (Ctrl+B)">
          <BoldIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="斜体 (Ctrl+I)">
          <ItalicIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="删除线">
          <StrikethroughIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="行内代码">
          <CodeIcon size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="标题 1">
          <Heading1Icon size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="标题 2">
          <Heading2Icon size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="标题 3">
          <Heading3Icon size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="无序列表">
          <ListIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="有序列表">
          <ListOrderedIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="引用">
          <QuoteIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="分隔线">
          <MinusIcon size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-300 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="撤销 (Ctrl+Z)">
          <Undo2Icon size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做 (Ctrl+Shift+Z)">
          <Redo2Icon size={14} />
        </ToolbarButton>
      </div>

      {/* 编辑区 */}
      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto"
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-gray-200 text-gray-900'
          : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      }`}
      title={title}>
      {children}
    </button>
  );
}
