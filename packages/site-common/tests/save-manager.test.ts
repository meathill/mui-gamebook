import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSaveManager, type SaveData } from '../src/game-player/save-manager';

// 模拟 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('SaveManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const testSlug = 'test-game';

  function makeSaveData(sceneId: string): SaveData {
    return {
      sceneId,
      runtimeState: { gold: 100, hasKey: true },
      timestamp: Date.now(),
      sceneLabel: '测试场景',
    };
  }

  it('新建时所有存档槽为空', () => {
    const manager = createSaveManager(testSlug);
    const slots = manager.listSlots();

    expect(slots).toHaveLength(4);
    expect(slots[0].id).toBe('auto');
    expect(slots[0].data).toBeNull();
    expect(slots[1].id).toBe('slot1');
    expect(slots[1].data).toBeNull();
  });

  it('保存和读取存档', () => {
    const manager = createSaveManager(testSlug);
    const data = makeSaveData('forest');

    manager.save('slot1', data);
    const loaded = manager.load('slot1');

    expect(loaded).not.toBeNull();
    expect(loaded!.sceneId).toBe('forest');
    expect(loaded!.runtimeState).toEqual({ gold: 100, hasKey: true });
  });

  it('自动存档', () => {
    const manager = createSaveManager(testSlug);

    expect(manager.hasAutoSave()).toBe(false);

    manager.save('auto', makeSaveData('castle'));

    expect(manager.hasAutoSave()).toBe(true);
    expect(manager.getAutoSave()!.sceneId).toBe('castle');
  });

  it('删除存档', () => {
    const manager = createSaveManager(testSlug);
    manager.save('slot2', makeSaveData('cave'));

    expect(manager.load('slot2')).not.toBeNull();

    manager.deleteSave('slot2');
    expect(manager.load('slot2')).toBeNull();
  });

  it('不同游戏的存档互不干扰', () => {
    const manager1 = createSaveManager('game-a');
    const manager2 = createSaveManager('game-b');

    manager1.save('slot1', makeSaveData('scene-a'));
    manager2.save('slot1', makeSaveData('scene-b'));

    expect(manager1.load('slot1')!.sceneId).toBe('scene-a');
    expect(manager2.load('slot1')!.sceneId).toBe('scene-b');
  });

  it('listSlots 返回所有槽位的最新状态', () => {
    const manager = createSaveManager(testSlug);
    manager.save('auto', makeSaveData('intro'));
    manager.save('slot3', makeSaveData('ending'));

    const slots = manager.listSlots();
    expect(slots[0].data!.sceneId).toBe('intro');
    expect(slots[1].data).toBeNull(); // slot1
    expect(slots[2].data).toBeNull(); // slot2
    expect(slots[3].data!.sceneId).toBe('ending');
  });

  it('损坏的 JSON 数据返回 null', () => {
    const manager = createSaveManager(testSlug);
    localStorage.setItem(`mgb_save_${testSlug}_slot1`, 'invalid json!!!');

    expect(manager.load('slot1')).toBeNull();
  });
});
