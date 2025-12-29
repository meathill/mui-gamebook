import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, fireEvent } from '@testing-library/react';
import { useUnsavedChangesWarning, useUndoRedoShortcuts } from '@/hooks/useUndoRedo';
import { useEditorStore } from '@/lib/editor/store';

// Mock the store's temporal state
vi.mock('@/lib/editor/store', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/editor/store')>();
  return {
    ...original,
    useTemporalStore: vi.fn(),
  };
});

import { useTemporalStore } from '@/lib/editor/store';

// 类型定义
type SpyCall = [string, ...unknown[]];

describe('useUnsavedChangesWarning', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该在没有未保存修改时返回 false', () => {
    (useTemporalStore as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const { result } = renderHook(() => useUnsavedChangesWarning());

    expect(result.current).toBe(false);
  });

  it('应该在有未保存修改时返回 true', () => {
    (useTemporalStore as ReturnType<typeof vi.fn>).mockReturnValue([{ game: null }]);

    const { result } = renderHook(() => useUnsavedChangesWarning());

    expect(result.current).toBe(true);
  });

  it('应该注册 beforeunload 事件监听器', () => {
    (useTemporalStore as ReturnType<typeof vi.fn>).mockReturnValue([]);

    renderHook(() => useUnsavedChangesWarning());

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('应该在组件卸载时移除事件监听器', () => {
    (useTemporalStore as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const { unmount } = renderHook(() => useUnsavedChangesWarning());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('应该在有未保存修改时触发 beforeunload 提示', () => {
    (useTemporalStore as ReturnType<typeof vi.fn>).mockReturnValue([{ game: null }]);

    renderHook(() => useUnsavedChangesWarning());

    const handler = addEventListenerSpy.mock.calls.find(
      (call: SpyCall) => call[0] === 'beforeunload',
    )?.[1] as EventListener;

    const event = new Event('beforeunload') as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    handler(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

describe('useUndoRedoShortcuts', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let mockUndo: ReturnType<typeof vi.fn>;
  let mockRedo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    mockUndo = vi.fn();
    mockRedo = vi.fn();

    (useTemporalStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = { undo: mockUndo, redo: mockRedo };
      return selector(state);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该注册 keydown 事件监听器', () => {
    renderHook(() => useUndoRedoShortcuts());

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('应该在组件卸载时移除事件监听器', () => {
    const { unmount } = renderHook(() => useUndoRedoShortcuts());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('Ctrl+Z 应该触发 undo', () => {
    renderHook(() => useUndoRedoShortcuts());

    const handler = addEventListenerSpy.mock.calls.find((call: SpyCall) => call[0] === 'keydown')?.[1] as EventListener;

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: document.createElement('div') });

    handler(event);

    expect(mockUndo).toHaveBeenCalled();
    expect(mockRedo).not.toHaveBeenCalled();
  });

  it('Cmd+Z 应该触发 undo (Mac)', () => {
    renderHook(() => useUndoRedoShortcuts());

    const handler = addEventListenerSpy.mock.calls.find((call: SpyCall) => call[0] === 'keydown')?.[1] as EventListener;

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: document.createElement('div') });

    handler(event);

    expect(mockUndo).toHaveBeenCalled();
  });

  it('Ctrl+Shift+Z 应该触发 redo', () => {
    renderHook(() => useUndoRedoShortcuts());

    const handler = addEventListenerSpy.mock.calls.find((call: SpyCall) => call[0] === 'keydown')?.[1] as EventListener;

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: document.createElement('div') });

    handler(event);

    expect(mockRedo).toHaveBeenCalled();
    expect(mockUndo).not.toHaveBeenCalled();
  });

  it('在 input 元素中不应该触发 undo/redo', () => {
    renderHook(() => useUndoRedoShortcuts());

    const handler = addEventListenerSpy.mock.calls.find((call: SpyCall) => call[0] === 'keydown')?.[1] as EventListener;

    const input = document.createElement('input');
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });

    handler(event);

    expect(mockUndo).not.toHaveBeenCalled();
  });

  it('在 textarea 元素中不应该触发 undo/redo', () => {
    renderHook(() => useUndoRedoShortcuts());

    const handler = addEventListenerSpy.mock.calls.find((call: SpyCall) => call[0] === 'keydown')?.[1] as EventListener;

    const textarea = document.createElement('textarea');
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: textarea });

    handler(event);

    expect(mockUndo).not.toHaveBeenCalled();
  });

  it('在 contentEditable 元素中不应该触发 undo/redo', () => {
    renderHook(() => useUndoRedoShortcuts());

    const handler = addEventListenerSpy.mock.calls.find((call: SpyCall) => call[0] === 'keydown')?.[1] as EventListener;

    const div = document.createElement('div');
    // 需要同时设置 isContentEditable 为 true，模拟浏览器行为
    Object.defineProperty(div, 'isContentEditable', { value: true });
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: div });

    handler(event);

    expect(mockUndo).not.toHaveBeenCalled();
  });
});
