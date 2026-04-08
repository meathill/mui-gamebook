'use client';

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import type { SlashCommandItem } from '@/lib/editor/extensions/slash-commands';

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export default function SlashCommandMenu({ items, command }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + items.length) % items.length);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          command(items[selectedIndex]);
        }
      }
    },
    [items, selectedIndex, command],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 滚动到选中项
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const selected = menu.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (items.length === 0) {
    return (
      <div className="slash-command-menu bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-400">
        没有匹配的命令
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="slash-command-menu bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-72 overflow-y-auto min-w-56">
      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          className={`w-full flex items-start gap-3 px-3 py-2 text-left transition-colors ${
            index === selectedIndex ? 'bg-orange-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => command(item)}>
          <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
          <div>
            <div className="text-sm font-medium text-gray-900">{item.title}</div>
            <div className="text-xs text-gray-500">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
