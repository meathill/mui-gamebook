import Link from 'next/link';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react/dist/ssr';
import { catalogPageHref } from '@/lib/catalog-path';
import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export default function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  // 生成页码数组，最多显示 5 个页码
  function getPageNumbers(): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 始终显示第一页
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // 显示当前页附近的页码
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // 始终显示最后一页
      pages.push(totalPages);
    }

    return pages;
  }

  const pageNumbers = getPageNumbers();
  // 上一页/下一页的公共样式，与 PaginationPrevious/Next 保持一致
  const arrowClass = 'gap-1 px-2.5 sm:px-2.5';

  return (
    <PaginationRoot>
      <PaginationContent>
        <PaginationItem>
          {currentPage > 1 ? (
            <PaginationLink
              asChild
              size="default"
              className={arrowClass}
              aria-label="上一页">
              {/* 低意向翻页：关闭预取，避免 _rsc 预取放大 Worker 请求 */}
              <Link
                href={catalogPageHref(basePath, currentPage - 1)}
                prefetch={false}>
                <CaretLeftIcon />
                <span className="hidden sm:block">上一页</span>
              </Link>
            </PaginationLink>
          ) : (
            <PaginationLink
              size="default"
              aria-disabled
              className={`${arrowClass} pointer-events-none opacity-50`}>
              <CaretLeftIcon />
              <span className="hidden sm:block">上一页</span>
            </PaginationLink>
          )}
        </PaginationItem>

        {/* 页码 */}
        {pageNumbers.map((page, index) =>
          page === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                asChild
                size="default"
                isActive={page === currentPage}>
                <Link
                  href={catalogPageHref(basePath, page)}
                  prefetch={false}>
                  {page}
                </Link>
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          {currentPage < totalPages ? (
            <PaginationLink
              asChild
              size="default"
              className={arrowClass}
              aria-label="下一页">
              <Link
                href={catalogPageHref(basePath, currentPage + 1)}
                prefetch={false}>
                <span className="hidden sm:block">下一页</span>
                <CaretRightIcon />
              </Link>
            </PaginationLink>
          ) : (
            <PaginationLink
              size="default"
              aria-disabled
              className={`${arrowClass} pointer-events-none opacity-50`}>
              <span className="hidden sm:block">下一页</span>
              <CaretRightIcon />
            </PaginationLink>
          )}
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  );
}
