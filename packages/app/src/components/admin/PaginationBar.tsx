'use client';

interface PaginationBarProps {
  page: number;
  total: number;
  totalPages: number;
  /** 单位名，用于「共 N 个 X」文案 */
  unit: string;
  onPageChange: (updater: (page: number) => number) => void;
}

/**
 * 后台列表共用的分页条（原先在用户/游戏/统计三处各写了一遍）
 */
export default function PaginationBar({ page, total, totalPages, unit, onPageChange }: PaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
      <span className="text-sm text-gray-500">
        共 {total} {unit}，第 {page} / {totalPages} 页
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">
          上一页
        </button>
        <button
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">
          下一页
        </button>
      </div>
    </div>
  );
}
