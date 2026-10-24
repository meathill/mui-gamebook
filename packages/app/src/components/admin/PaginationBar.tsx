'use client';

import { Button } from '@/components/ui/button';

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
    <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
      <span className="text-muted-foreground text-sm">
        共 {total} {unit}，第 {page} / {totalPages} 页
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={page <= 1}>
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}>
          下一页
        </Button>
      </div>
    </div>
  );
}
