'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { RuntimeState } from '@mui-gamebook/parser/src/types';
import { createSaveManager, type SaveSlot, type SaveSlotId, type SaveData } from './save-manager';

export interface UseSaveSystemReturn {
  slots: SaveSlot[];
  hasAutoSave: boolean;
  save(slotId: SaveSlotId, sceneId: string, runtimeState: RuntimeState, extra?: Partial<SaveData>): void;
  autoSave(sceneId: string, runtimeState: RuntimeState, extra?: Partial<SaveData>): void;
  load(slotId: SaveSlotId): SaveData | null;
  deleteSave(slotId: SaveSlotId): void;
  refreshSlots(): void;
}

const DEFAULT_SLOTS: SaveSlot[] = [
  { id: 'auto', label: '自动存档', data: null },
  { id: 'slot1', label: '存档 1', data: null },
  { id: 'slot2', label: '存档 2', data: null },
  { id: 'slot3', label: '存档 3', data: null },
];

/**
 * 多存档系统 Hook
 * 封装 SaveManager，提供响应式的存档状态
 */
export function useSaveSystem(gameSlug: string): UseSaveSystemReturn {
  const manager = useMemo(() => createSaveManager(gameSlug), [gameSlug]);
  const [slots, setSlots] = useState<SaveSlot[]>(DEFAULT_SLOTS);

  const refreshSlots = useCallback(() => {
    setSlots(manager.listSlots());
  }, [manager]);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  const save = useCallback(
    (slotId: SaveSlotId, sceneId: string, runtimeState: RuntimeState, extra?: Partial<SaveData>) => {
      const data: SaveData = {
        sceneId,
        runtimeState,
        timestamp: Date.now(),
        ...extra,
      };
      manager.save(slotId, data);
      refreshSlots();
    },
    [manager, refreshSlots],
  );

  const autoSave = useCallback(
    (sceneId: string, runtimeState: RuntimeState, extra?: Partial<SaveData>) => {
      save('auto', sceneId, runtimeState, extra);
    },
    [save],
  );

  const load = useCallback(
    (slotId: SaveSlotId): SaveData | null => {
      return manager.load(slotId);
    },
    [manager],
  );

  const deleteSave = useCallback(
    (slotId: SaveSlotId) => {
      manager.deleteSave(slotId);
      refreshSlots();
    },
    [manager, refreshSlots],
  );

  const hasAutoSave = slots[0]?.data !== null;

  return {
    slots,
    hasAutoSave,
    save,
    autoSave,
    load,
    deleteSave,
    refreshSlots,
  };
}

export type { SaveSlot, SaveSlotId, SaveData } from './save-manager';
