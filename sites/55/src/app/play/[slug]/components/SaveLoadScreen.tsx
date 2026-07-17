'use client';

import { XIcon, TrashIcon } from '@phosphor-icons/react';
import type { SaveSlot, SaveSlotId } from '@mui-gamebook/site-common/game-player';
import { formatShortDateTime } from '@mui-gamebook/site-common/utils';

interface Props {
  mode: 'save' | 'load';
  slots: SaveSlot[];
  onLoad: (slotId: SaveSlotId) => void;
  onSave: (slotId: SaveSlotId) => void;
  onDelete: (slotId: SaveSlotId) => void;
  onClose: () => void;
}

/**
 * 存读档界面
 */
export default function SaveLoadScreen({ mode, slots, onLoad, onSave, onDelete, onClose }: Props) {
  function handleSlotClick(slot: SaveSlot) {
    if (mode === 'load') {
      if (slot.data) {
        onLoad(slot.id);
      }
    } else {
      // 存档模式下，自动存档槽不能手动存入
      if (slot.id === 'auto') return;
      onSave(slot.id);
    }
  }

  function handleDelete(e: React.MouseEvent, slotId: SaveSlotId) {
    e.stopPropagation();
    if (confirm('确定删除此存档？')) {
      onDelete(slotId);
    }
  }

  return (
    <div className="panel-overlay">
      <div className="panel w-full max-w-lg mx-4 p-6 animate-fade-in">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{mode === 'load' ? '读档' : '存档'}</h2>
          <button
            onClick={onClose}
            className="hud-btn">
            <XIcon size={20} />
          </button>
        </div>

        {/* 存档槽列表 */}
        <div className="space-y-3">
          {slots.map((slot) => {
            const isAutoSlot = slot.id === 'auto';
            const isDisabled = mode === 'save' && isAutoSlot;
            const isEmpty = !slot.data;

            return (
              <div
                key={slot.id}
                onClick={() => !isDisabled && handleSlotClick(slot)}
                className={`save-slot flex items-center justify-between ${
                  isEmpty ? 'save-slot--empty' : ''
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{slot.label}</span>
                    {isAutoSlot && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary-light">自动</span>
                    )}
                  </div>
                  {slot.data ? (
                    <div className="text-sm text-muted">
                      <span>{slot.data.sceneLabel || slot.data.sceneId}</span>
                      <span className="mx-2">·</span>
                      <span>{formatShortDateTime(slot.data.timestamp)}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted">空</div>
                  )}
                </div>

                {/* 删除按钮 */}
                {slot.data && !isAutoSlot && (
                  <button
                    onClick={(e) => handleDelete(e, slot.id)}
                    className="hud-btn text-danger hover:text-danger ml-2"
                    title="删除存档">
                    <TrashIcon size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
