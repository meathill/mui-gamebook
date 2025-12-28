/**
 * Undo/Redo 相关 hooks
 * - useUnsavedChangesWarning: 监听 beforeunload 事件，提示未保存修改
 * - useUndoRedoShortcuts: 键盘快捷键支持 Ctrl+Z / Ctrl+Shift+Z
 */
import { useEffect } from 'react';
import { useTemporalStore } from '@/lib/editor/store';

/**
 * 监听 beforeunload 事件，在有未保存修改时提示用户
 */
export function useUnsavedChangesWarning() {
  const pastStates = useTemporalStore((state) => state.pastStates);
  const hasUnsavedChanges = pastStates.length > 0;

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // 现代浏览器会忽略自定义消息，但仍需返回值以触发提示
        return '您有未保存的修改，确定要离开吗？';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return hasUnsavedChanges;
}

/**
 * 键盘快捷键支持
 * - Ctrl/Cmd + Z: Undo
 * - Ctrl/Cmd + Shift + Z: Redo
 */
export function useUndoRedoShortcuts() {
  const undo = useTemporalStore((state) => state.undo);
  const redo = useTemporalStore((state) => state.redo);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // 检查是否在可编辑元素中（如 textarea、input）
      // 如果在这些元素中，让浏览器处理默认的 undo/redo
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}
