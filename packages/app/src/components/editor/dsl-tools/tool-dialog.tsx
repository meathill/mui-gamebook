'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { AICharacter } from '@roudanio/parser';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <DialogContent
        className="max-w-2xl gap-0 p-0"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          const field = formRef.current?.querySelector<HTMLElement>('input:not([type="checkbox"]), textarea, select');
          if (field) {
            event.preventDefault();
            field.focus();
          }
        }}
        onPointerDownOutside={(event) => event.preventDefault()}>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex min-h-0 max-h-[90dvh] flex-col"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && isImeComposing(event.nativeEvent)) event.preventDefault();
          }}>
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>
              {session.target ? '编辑' : '添加'}
              {DSL_TOOL_LABELS[draft.kind]}
            </DialogTitle>
            <DialogDescription>
              {session.target
                ? '修改后只更新对应文字，其他内容保持原样。'
                : '填写后插入剧情，之后仍可直接修改文字或再次打开表单。'}
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter className="shrink-0 border-t px-5 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}>
              取消
            </Button>
            <Button
              type="submit"
              disabled={Boolean(session.error)}>
              {session.target ? '保存修改' : '插入'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
