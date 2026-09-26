/**
 * 后台列表页的通用查询参数解析：分页 + 搜索 + 排序 + 枚举筛选。
 *
 * 排序字段一律走调用方提供的白名单映射（键 → drizzle 列），
 * 不把用户输入拼进 SQL，未知字段回退到默认排序。
 */

export type SortOrder = 'asc' | 'desc';

export interface ListQueryParams {
  page: number;
  limit: number;
  offset: number;
  search: string;
  /** 已按白名单归一化的排序键，调用方据此查列映射 */
  sort: string;
  order: SortOrder;
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export interface ParseListQueryOptions {
  /** 允许的排序键白名单 */
  allowedSorts: readonly string[];
  defaultSort: string;
  defaultOrder?: SortOrder;
  maxLimit?: number;
  defaultLimit?: number;
}

export function parseListQuery(url: URL, options: ParseListQueryOptions): ListQueryParams {
  const { allowedSorts, defaultSort, defaultOrder = 'desc', maxLimit = 100, defaultLimit = 20 } = options;
  const params = url.searchParams;

  const page = parsePositiveInt(params.get('page'), 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePositiveInt(params.get('limit'), defaultLimit, maxLimit);

  const requestedSort = params.get('sort');
  const sort = requestedSort && allowedSorts.includes(requestedSort) ? requestedSort : defaultSort;

  const requestedOrder = params.get('order');
  const order: SortOrder = requestedOrder === 'asc' || requestedOrder === 'desc' ? requestedOrder : defaultOrder;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search: (params.get('search') || '').trim(),
    sort,
    order,
  };
}

/**
 * 解析枚举筛选参数，不在白名单内时回退默认值
 */
export function parseEnumFilter<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
