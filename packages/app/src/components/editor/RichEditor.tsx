'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import type { AICharacter } from '@roudanio/parser';
import { ChoiceHighlight } from '@/lib/editor/extensions/choice-highlight';
import { VariableHighlight } from '@/lib/editor/extensions/variable-highlight';
import { BrokenRefs } from '@/lib/editor/extensions/broken-refs';
import { SceneMetadata } from '@/lib/editor/extensions/scene-metadata';
import { Autocomplete } from '@/lib/editor/extensions/autocomplete';
import { SlashCommands } from '@/lib/editor/extensions/slash-commands';
import { extractSceneIds } from '@/lib/editor/extensions/matchers';
import { slashCommandRender } from '@/lib/editor/extensions/slash-command-render';
import { DslTools, type DslToolRequest } from '@/lib/editor/extensions/dsl-tools';
import { DslText } from '@/lib/editor/extensions/dsl-text';
import { StaticImage } from '@/lib/editor/extensions/static-image';
import { getBodyMarkdown, getEditorMarkdown, splitFrontmatter } from '@/lib/editor/dsl-tools/markdown';
import { useDslTools } from '@/lib/editor/dsl-tools/use-dsl-tools';
import DslToolbar from './dsl-tools/toolbar';
import DslToolDialog from './dsl-tools/tool-dialog';

export interface RichEditorHandle {
  scrollToScene: (sceneId: string) => void;
}
interface RichEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  gameId?: string;
  variableNames?: string[];
  characters?: Record<string, AICharacter>;
  onScenesChange?: (sceneIds: string[]) => void;
  onEditorReady?: (handle: RichEditorHandle) => void;
}
const EMPTY_NAMES: string[] = [];
const EMPTY_CHARACTERS: Record<string, AICharacter> = {};

export default function RichEditor({
  content,
  onChange,
  placeholder,
  gameId,
  variableNames = EMPTY_NAMES,
  characters = EMPTY_CHARACTERS,
  onScenesChange,
  onEditorReady,
}: RichEditorProps) {
  const isInternalUpdateRef = useRef(false);
  const lastContentRef = useRef(content);
  const requestRef = useRef<(request: DslToolRequest) => void>(() => {});
  const { frontmatter, body } = splitFrontmatter(content);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, text: false, trailingNode: false }),
      DslText,
      StaticImage,
      SceneMetadata.configure({ gameId: gameId || '' }),
      Placeholder.configure({ placeholder: placeholder || '写下剧情，或用上方工具添加场景和选项…' }),
      Markdown.configure({ html: false, transformCopiedText: true, transformPastedText: true }),
      ChoiceHighlight,
      VariableHighlight,
      BrokenRefs.configure({ variableNames: [...variableNames] }),
      Autocomplete.configure({ sceneIds: [], variableNames: [...variableNames] }),
      DslTools.configure({ onRequest: (request) => requestRef.current(request) }),
      SlashCommands.configure({ suggestion: { render: slashCommandRender } }),
    ],
    content: body,
    onCreate({ editor }) {
      editor.view.dispatch(
        editor.state.tr
          .setDocAttribute('dslFrontmatter', frontmatter)
          .setMeta('addToHistory', false)
          .setMeta('preventUpdate', true),
      );
      onScenesChange?.(extractSceneIds(editor.state.doc));
      onEditorReady?.({
        scrollToScene(sceneId) {
          let targetPos = -1;
          editor.state.doc.descendants((node, pos) => {
            if (targetPos >= 0) return false;
            if (node.type.name === 'heading' && node.attrs.level === 1 && node.textContent.trim() === sceneId) {
              targetPos = pos;
              return false;
            }
            return true;
          });
          if (targetPos >= 0)
            editor
              .chain()
              .focus(targetPos + 1)
              .scrollIntoView()
              .run();
        },
      });
    },
    onUpdate({ editor }) {
      isInternalUpdateRef.current = true;
      const markdown = getEditorMarkdown(editor);
      lastContentRef.current = markdown;
      onChange(markdown);
      onScenesChange?.(extractSceneIds(editor.state.doc));
      const extension = editor.extensionManager.extensions.find((item) => item.name === 'autocomplete');
      if (extension) extension.options.sceneIds = extractSceneIds(editor.state.doc);
      queueMicrotask(() => {
        isInternalUpdateRef.current = false;
      });
    },
  });
  const tools = useDslTools(editor, variableNames, characters);
  requestRef.current = tools.open;
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      canUndo: editor?.can().undo() ?? false,
      canRedo: editor?.can().redo() ?? false,
      scenes: editor ? extractSceneIds(editor.state.doc) : [],
    }),
  });

  useEffect(() => {
    if (!editor || isInternalUpdateRef.current || lastContentRef.current === content) return;
    lastContentRef.current = content;
    const { frontmatter: nextFrontmatter, body: nextBody } = splitFrontmatter(content);
    if (nextBody !== getBodyMarkdown(editor)) editor.commands.setContent(nextBody, { emitUpdate: false });
    if (nextFrontmatter !== editor.state.doc.attrs.dslFrontmatter)
      editor.view.dispatch(
        editor.state.tr
          .setDocAttribute('dslFrontmatter', nextFrontmatter)
          .setMeta('addToHistory', false)
          .setMeta('preventUpdate', true),
      );
    onScenesChange?.(extractSceneIds(editor.state.doc));
  }, [content, editor, onScenesChange]);

  useEffect(() => {
    if (!editor) return;
    for (const name of ['autocomplete', 'brokenRefs']) {
      const extension = editor.extensionManager.extensions.find((item) => item.name === name);
      if (!extension) continue;
      const names = extension.options.variableNames as string[];
      names.splice(0, names.length, ...variableNames);
      if (name === 'autocomplete') extension.options.sceneIds = extractSceneIds(editor.state.doc);
    }
    editor.view.dispatch(editor.state.tr);
  }, [editor, variableNames]);

  if (!editor) return null;
  return (
    <div className="rich-editor flex h-full w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      <DslToolbar
        onOpen={(kind) => tools.open({ kind })}
        onUndo={() => editor.chain().focus().undo().run()}
        onRedo={() => editor.chain().focus().redo().run()}
        canUndo={state?.canUndo ?? false}
        canRedo={state?.canRedo ?? false}
      />
      <EditorContent
        editor={editor}
        className="min-h-0 flex-1 overflow-y-auto"
      />
      {tools.session && (
        <DslToolDialog
          key={tools.session.id}
          session={tools.session}
          onApply={tools.apply}
          onClose={tools.close}
          scenes={state?.scenes ?? []}
          variables={variableNames}
          characters={characters}
          gameId={gameId}
        />
      )}
    </div>
  );
}
