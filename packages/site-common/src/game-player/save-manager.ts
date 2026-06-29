import type { RuntimeState } from '@mui-gamebook/parser/src/types';

/**
 * 存档数据
 */
export interface SaveData {
  sceneId: string;
  runtimeState: RuntimeState;
  timestamp: number;
  sceneLabel?: string;
  playDuration?: number;
}

/**
 * 存档槽 ID
 */
export type SaveSlotId = 'auto' | 'slot1' | 'slot2' | 'slot3';

/**
 * 存档槽
 */
export interface SaveSlot {
  id: SaveSlotId;
  label: string;
  data: SaveData | null;
}

const SLOT_LABELS: Record<SaveSlotId, string> = {
  auto: '自动存档',
  slot1: '存档 1',
  slot2: '存档 2',
  slot3: '存档 3',
};

const ALL_SLOT_IDS: SaveSlotId[] = ['auto', 'slot1', 'slot2', 'slot3'];

/**
 * 多存档管理器
 * 使用 localStorage 存储，所有数据在用户本地
 */
export interface SaveManager {
  save(slotId: SaveSlotId, data: SaveData): void;
  load(slotId: SaveSlotId): SaveData | null;
  deleteSave(slotId: SaveSlotId): void;
  listSlots(): SaveSlot[];
  hasAutoSave(): boolean;
  getAutoSave(): SaveData | null;
}

function buildStorageKey(gameSlug: string, slotId: SaveSlotId): string {
  return `mgb_save_${gameSlug}_${slotId}`;
}

/**
 * 创建存档管理器
 */
export function createSaveManager(gameSlug: string): SaveManager {
  function save(slotId: SaveSlotId, data: SaveData): void {
    if (typeof window === 'undefined') return;
    const key = buildStorageKey(gameSlug, slotId);
    localStorage.setItem(key, JSON.stringify(data));
  }

  function load(slotId: SaveSlotId): SaveData | null {
    if (typeof window === 'undefined') return null;
    const key = buildStorageKey(gameSlug, slotId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SaveData;
    } catch {
      return null;
    }
  }

  function deleteSave(slotId: SaveSlotId): void {
    if (typeof window === 'undefined') return;
    const key = buildStorageKey(gameSlug, slotId);
    localStorage.removeItem(key);
  }

  function listSlots(): SaveSlot[] {
    return ALL_SLOT_IDS.map((id) => ({
      id,
      label: SLOT_LABELS[id],
      data: load(id),
    }));
  }

  function hasAutoSave(): boolean {
    return load('auto') !== null;
  }

  function getAutoSave(): SaveData | null {
    return load('auto');
  }

  return { save, load, deleteSave, listSlots, hasAutoSave, getAutoSave };
}
