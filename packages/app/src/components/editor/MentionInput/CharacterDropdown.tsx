'use client';

import { useEffect, useRef } from 'react';
import type { CharacterDropdownProps } from './types';

/**
 * 角色选择下拉框组件
 * 在用户输入 @ 时显示，支持键盘导航
 */
export default function CharacterDropdown({
  characters,
  onSelect,
  onClose,
  searchTerm,
  selectedIndex,
  position,
}: CharacterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 过滤匹配的角色
  const filteredCharacters = characters.filter(
    ({ id, character }) =>
      id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      character.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // 滚动选中项到可视区域
  useEffect(() => {
    const selected = dropdownRef.current?.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (filteredCharacters.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 text-xs text-gray-500"
        style={{ top: position.top, left: position.left }}
      >
        没有匹配的角色
      </div>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto min-w-48"
      style={{ top: position.top, left: position.left }}
    >
      {filteredCharacters.map(({ id, character }, index) => (
        <button
          key={id}
          type="button"
          data-selected={index === selectedIndex}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${index === selectedIndex ? 'bg-purple-50 text-purple-700' : ''
            }`}
          onClick={() => onSelect(id)}
        >
          {/* 角色头像 */}
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {character.image_url ? (
              <img
                src={character.image_url}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-gray-400">{character.name.charAt(0)}</span>
            )}
          </div>
          {/* 角色信息 */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{character.name}</div>
            <div className="text-xs text-gray-400 truncate">@{id}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
