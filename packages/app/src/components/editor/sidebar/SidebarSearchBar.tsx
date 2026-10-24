'use client';

import { MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';

interface SidebarSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreateNew: () => void;
}

/**
 * 变量/角色面板共用的搜索栏 + 新建按钮
 */
export default function SidebarSearchBar({ searchQuery, onSearchChange, onCreateNew }: SidebarSearchBarProps) {
  return (
    <div className="p-3 border-b border-gray-100">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索..."
            className="pl-8 text-xs"
          />
        </div>
        <button
          onClick={onCreateNew}
          className="p-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600"
          title="新建">
          <PlusIcon size={14} />
        </button>
      </div>
    </div>
  );
}
