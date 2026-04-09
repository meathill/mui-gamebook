'use client';

import { useEffect, useRef, useCallback } from 'react';

// localStorage 草稿结构
interface Draft {
  content: string;
  savedAt: number; // Unix 毫秒时间戳
}

const DRAFT_KEY_PREFIX = 'editor-draft-';
const LOCAL_DEBOUNCE_MS = 1000; // 编辑后 1s 保存到 localStorage
const CLOUD_INTERVAL_MS = 20_000; // 云端同步间隔 20s

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface UseAutoSaveOptions {
  gameId: string;
  content: string;
  slug: string;
  /** 是否已完成初始加载（避免加载过程中触发保存） */
  ready: boolean;
  /** 云端保存函数，返回是否成功 */
  onCloudSave: (content: string, slug: string) => Promise<boolean>;
  /** 保存状态变更回调 */
  onStatusChange?: (status: SaveStatus) => void;
}

// ---- localStorage 草稿操作 ----

function getDraftKey(gameId: string): string {
  return `${DRAFT_KEY_PREFIX}${gameId}`;
}

export function loadDraft(gameId: string): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getDraftKey(gameId));
    if (raw) return JSON.parse(raw) as Draft;
  } catch {
    // ignore
  }
  return null;
}

export function saveDraft(gameId: string, content: string): void {
  if (typeof window === 'undefined') return;
  try {
    const draft: Draft = { content, savedAt: Date.now() };
    localStorage.setItem(getDraftKey(gameId), JSON.stringify(draft));
  } catch {
    // ignore — localStorage 满或不可用
  }
}

export function clearDraft(gameId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getDraftKey(gameId));
  } catch {
    // ignore
  }
}

// ---- Hook ----

export function useAutoSave({ gameId, content, slug, ready, onCloudSave, onStatusChange }: UseAutoSaveOptions): void {
  // 追踪"上次成功同步到云端的内容"，用于判断是否有未保存变更
  const lastCloudContentRef = useRef<string>('');
  // 上次云端保存完成的时间
  const lastCloudSaveTimeRef = useRef<number>(0);
  // 是否正在执行云端保存
  const savingRef = useRef(false);
  // 云端定时器
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // localStorage 防抖定时器
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 最新的 content/slug 引用（避免闭包陷阱）
  const contentRef = useRef(content);
  const slugRef = useRef(slug);
  // 初始内容（加载时的内容），用于判断是否有实质变更
  const initialContentRef = useRef<string | null>(null);

  contentRef.current = content;
  slugRef.current = slug;

  // 记录初始内容
  useEffect(() => {
    if (ready && initialContentRef.current === null) {
      initialContentRef.current = content;
      lastCloudContentRef.current = content;
    }
  }, [ready, content]);

  // localStorage 防抖保存
  useEffect(() => {
    if (!ready || !gameId) return;

    if (localTimerRef.current) clearTimeout(localTimerRef.current);
    localTimerRef.current = setTimeout(() => {
      saveDraft(gameId, content);
    }, LOCAL_DEBOUNCE_MS);

    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
    };
  }, [content, gameId, ready]);

  // 更新保存状态
  const updateStatus = useCallback(
    (status: SaveStatus) => {
      onStatusChange?.(status);
    },
    [onStatusChange],
  );

  // 云端保存执行
  const doCloudSave = useCallback(async () => {
    const currentContent = contentRef.current;
    const currentSlug = slugRef.current;

    // 没有变更则跳过
    if (currentContent === lastCloudContentRef.current) return;
    if (savingRef.current) return;

    savingRef.current = true;
    updateStatus('saving');

    try {
      const success = await onCloudSave(currentContent, currentSlug);
      if (success) {
        lastCloudContentRef.current = currentContent;
        lastCloudSaveTimeRef.current = Date.now();
        // 云端保存成功后清除本地草稿
        clearDraft(gameId);
        updateStatus('saved');
      } else {
        updateStatus('unsaved');
      }
    } catch {
      updateStatus('unsaved');
    } finally {
      savingRef.current = false;
    }
  }, [gameId, onCloudSave, updateStatus]);

  // 云端定时同步
  useEffect(() => {
    if (!ready || !gameId) return;

    function scheduleCloudSave() {
      if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
      cloudTimerRef.current = setTimeout(async () => {
        await doCloudSave();
        // 循环调度
        scheduleCloudSave();
      }, CLOUD_INTERVAL_MS);
    }

    scheduleCloudSave();

    return () => {
      if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
    };
  }, [ready, gameId, doCloudSave]);

  // 内容变更时更新状态为 unsaved
  useEffect(() => {
    if (!ready) return;
    if (content !== lastCloudContentRef.current) {
      updateStatus('unsaved');
    }
  }, [content, ready, updateStatus]);

  // 页面卸载前紧急保存到 localStorage
  useEffect(() => {
    if (!gameId) return;

    function handleBeforeUnload() {
      saveDraft(gameId, contentRef.current);
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameId]);
}
