'use client';

import { useRef, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XIcon } from '@phosphor-icons/react';
import type { AICharacter } from '@roudanio/parser';
import { isImeComposing } from '@/lib/keyboard';
import { DSL_TOOL_LABELS, isAssetTool, type DslDraft } from '@/lib/editor/dsl-tools/types';
import type { DslEditSession } from '@/lib/editor/dsl-tools/session';
import ContentFields from './content-fields';
import AssetFields from './asset-fields';

export default function DslToolDialog({
  session,
  scenes,
  variables,
  characters,
  gameId,
  onApply,
  onClose,
}: {
  session: DslEditSession;
  scenes: string[];
  variables: string[];
  characters: Record<string, AICharacter>;
  gameId?: string;
  onApply: (draft: DslDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(session.draft);
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState(session.error ?? '');
  function updateDraft(update: Partial<DslDraft>) {
    setDraft((previous) => ({ ...previous, ...update }));
    if (!session.error) setError('');
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (event.currentTarget.querySelector('[data-expression-invalid="true"]')) {
      setError('请先完成并修正条件或数值变化');
      return;
    }
    try {
      onApply(draft);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white shadow-xl focus:outline-none"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            const field = formRef.current?.querySelector<HTMLElement>('input:not([type="checkbox"]), textarea, select');
            if (field) {
              event.preventDefault();
              field.focus();
            }
          }}
          onPointerDownOutside={(event) => event.preventDefault()}>
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                {session.target ? '编辑' : '添加'}
                {DSL_TOOL_LABELS[draft.kind]}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-500">
                {session.target
                  ? '修改后只更新对应文字，其他内容保持原样。'
                  : '填写后插入剧情，之后仍可直接修改文字或再次打开表单。'}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="关闭表单"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-orange-500">
              <XIcon size={18} />
            </Dialog.Close>
          </div>
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && isImeComposing(event.nativeEvent)) event.preventDefault();
            }}>
            <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
              {session.error ? (
                <pre className="whitespace-pre-wrap break-all rounded-md bg-gray-50 p-3 text-sm">
                  {session.target?.text}
                </pre>
              ) : isAssetTool(draft.kind) ? (
                <AssetFields
                  draft={draft}
                  onChange={updateDraft}
                  gameId={gameId}
                  characters={characters}
                />
              ) : (
                <ContentFields
                  draft={draft}
                  onChange={updateDraft}
                  scenes={scenes}
                  variables={variables}
                  characters={characters}
                />
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                取消
              </button>
              <button
                type="submit"
                disabled={Boolean(session.error)}
                className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-40">
                {session.target ? '保存修改' : '插入'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
