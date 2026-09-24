'use client';

import { useCallback, useMemo, useState } from 'react';
import type { SortOrder } from '@/lib/list-query';

export interface UseListQueryOptions {
  defaultSort: string;
  defaultOrder?: SortOrder;
  /** 额外的枚举筛选，键即查询参数名（如 status / role） */
  defaultFilters?: Record<string, string>;
  pageSize?: number;
}

/**
 * 后台列表页共用的查询状态：分页 + 搜索 + 排序 + 枚举筛选。
 *
 * 所有状态变更都会重置到第一页——否则用户在第 5 页切换排序会看到空列表。
 */
export function useListQuery(options: UseListQueryOptions) {
  const { defaultSort, defaultOrder = 'desc', defaultFilters = {}, pageSize = 20 } = options;

  const [page, setPageRaw] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSortRaw] = useState(defaultSort);
  const [order, setOrderRaw] = useState<SortOrder>(defaultOrder);
  const [filters, setFiltersRaw] = useState<Record<string, string>>(defaultFilters);

  const setPage = useCallback((updater: number | ((previous: number) => number)) => {
    setPageRaw((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      return Math.max(1, next);
    });
  }, []);

  /** 点击表头：同列切换升降序，换列则用该列的默认方向 */
  const toggleSort = useCallback((nextSort: string, nextDefaultOrder: SortOrder = 'desc') => {
    setPageRaw(1);
    setSortRaw((previous) => {
      if (previous === nextSort) {
        setOrderRaw((previousOrder) => (previousOrder === 'asc' ? 'desc' : 'asc'));
        return previous;
      }
      setOrderRaw(nextDefaultOrder);
      return nextSort;
    });
  }, []);

  const setSort = useCallback((nextSort: string, nextOrder: SortOrder = 'desc') => {
    setPageRaw(1);
    setSortRaw(nextSort);
    setOrderRaw(nextOrder);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setPageRaw(1);
    setFiltersRaw((previous) => ({ ...previous, [key]: value }));
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPageRaw(1);
  }

  function handleClearSearch() {
    setSearch('');
    setSearchInput('');
    setPageRaw(1);
  }

  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize), sort, order });
    if (search) params.set('search', search);
    for (const [key, value] of Object.entries(filters)) {
      if (value && value !== 'all') params.set(key, value);
    }
    return params.toString();
  }, [page, pageSize, sort, order, search, filters]);

  const queryKey = useMemo(() => [page, search, sort, order, filters] as const, [page, search, sort, order, filters]);

  return {
    page,
    setPage,
    search,
    searchInput,
    setSearchInput,
    sort,
    order,
    setSort,
    toggleSort,
    filters,
    setFilter,
    handleSearch,
    handleClearSearch,
    buildSearchParams,
    queryKey,
  };
}
