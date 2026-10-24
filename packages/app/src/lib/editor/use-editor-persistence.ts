'use client';

import { useRef } from 'react';
import type { AssistanceSettings } from '../media-assistance/editor-save';

export function useEditorPersistence(id: string) {
  const revisionRef = useRef<number | undefined>(undefined);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  function persist(content: string, slug: string, settings?: AssistanceSettings) {
    async function execute() {
      const response = await fetch(`/api/cms/games/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, slug, expectedRevision: revisionRef.current, ...settings }),
      });
      const result = (await response.json()) as { slug?: string; revision?: number; error?: string };
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? '云端作品已更新，本地修改已保留。请复制未保存内容并刷新页面，核对后再保存。'
            : result.error || '保存失败',
        );
      revisionRef.current = result.revision ?? revisionRef.current;
      return result;
    }
    const promise = queueRef.current.then(execute, execute);
    queueRef.current = promise;
    return promise;
  }
  return { revisionRef, persist };
}
