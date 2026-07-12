import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSaveSystem } from '../src/game-player/use-save-system';

describe('useSaveSystem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('挂载后初始化 4 个空存档槽', async () => {
    const { result } = renderHook(() => useSaveSystem('game-a'));

    await waitFor(() => expect(result.current.slots).toHaveLength(4));
    expect(result.current.slots.map((s) => s.id)).toEqual(['auto', 'slot1', 'slot2', 'slot3']);
    expect(result.current.hasAutoSave).toBe(false);
  });

  it('save 之后 slots 状态同步更新', async () => {
    const { result } = renderHook(() => useSaveSystem('game-b'));
    await waitFor(() => expect(result.current.slots).toHaveLength(4));

    act(() => result.current.save('slot1', 'forest', { gold: 10 }));

    const slot1 = result.current.slots.find((s) => s.id === 'slot1');
    expect(slot1?.data?.sceneId).toBe('forest');
    expect(slot1?.data?.runtimeState).toEqual({ gold: 10 });
  });

  it('autoSave 写入 auto 槽并让 hasAutoSave 变为 true', async () => {
    const { result } = renderHook(() => useSaveSystem('game-c'));
    await waitFor(() => expect(result.current.slots).toHaveLength(4));

    act(() => result.current.autoSave('castle', { hp: 100 }));

    expect(result.current.hasAutoSave).toBe(true);
    expect(result.current.load('auto')?.sceneId).toBe('castle');
  });

  it('deleteSave 之后 slots 状态同步清空', async () => {
    const { result } = renderHook(() => useSaveSystem('game-d'));
    await waitFor(() => expect(result.current.slots).toHaveLength(4));
    act(() => result.current.save('slot2', 'cave', { torch: true }));

    act(() => result.current.deleteSave('slot2'));

    const slot2 = result.current.slots.find((s) => s.id === 'slot2');
    expect(slot2?.data).toBeNull();
  });

  it('不同 gameSlug 的存档系统互不干扰', async () => {
    const { result: a } = renderHook(() => useSaveSystem('game-e'));
    const { result: b } = renderHook(() => useSaveSystem('game-f'));
    await waitFor(() => expect(a.current.slots).toHaveLength(4));
    await waitFor(() => expect(b.current.slots).toHaveLength(4));

    act(() => a.current.save('slot1', 'scene-a', {}));

    expect(a.current.slots.find((s) => s.id === 'slot1')?.data?.sceneId).toBe('scene-a');
    expect(b.current.slots.find((s) => s.id === 'slot1')?.data).toBeNull();
  });
});
