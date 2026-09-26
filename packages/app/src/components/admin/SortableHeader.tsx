'use client';

import { CaretDownIcon, CaretUpIcon, CaretUpDownIcon } from '@phosphor-icons/react';
import type { SortOrder } from '@/lib/list-query';

interface SortableHeaderProps {
  label: string;
  /** 该列对应的排序键；省略则不可排序 */
  sortKey?: string;
  activeSort: string;
  order: SortOrder;
  onSort: (sortKey: string) => void;
  align?: 'left' | 'right';
}

/**
 * 可点击排序的表头单元格：同列再点切换升降序
 */
export default function SortableHeader({
  label,
  sortKey,
  activeSort,
  order,
  onSort,
  align = 'left',
}: SortableHeaderProps) {
  const isActive = Boolean(sortKey) && activeSort === sortKey;

  if (!sortKey) {
    return (
      <th
        className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase ${align === 'right' ? 'text-right' : 'text-left'}`}>
        {label}
      </th>
    );
  }

  return (
    <th className={`px-6 py-3 text-xs font-medium uppercase ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 hover:text-gray-700 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
        title={`按${label}排序`}>
        {label}
        {isActive ? (
          order === 'asc' ? (
            <CaretUpIcon size={12} />
          ) : (
            <CaretDownIcon size={12} />
          )
        ) : (
          <CaretUpDownIcon
            size={12}
            className="opacity-50"
          />
        )}
      </button>
    </th>
  );
}
