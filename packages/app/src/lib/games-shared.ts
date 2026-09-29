import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { GameRow, ParsedGameRow } from '@/types';

/** 公开列表的标准列清单（可选别名前缀，配合 ratingColumns 使用） */
export function gameListColumns(alias?: string) {
  const p = alias ? `${alias}.` : '';
  return `${p}slug, ${p}title, ${p}description, ${p}cover_image, ${p}tags, ${p}created_at, ${p}updated_at`;
}

/**
 * 「可玩」口径：已发布且正文存在。sitemap/列表/置顶/tag/推荐统一用它，
 * 与播放页 getGameBySlug（有记录 + 正文非空 + 解析成功）对齐，
 * 避免 sitemap 收录打不开的死链（Ahrefs noindex-in-sitemap）。
 */
export function playableContentExists(gamesAlias: string) {
  return `EXISTS (SELECT 1 FROM GameContent c WHERE c.game_id = ${gamesAlias}.id AND c.content IS NOT NULL AND TRIM(c.content) != '')`;
}

/**
 * 评分聚合列（标量子查询）：只统计未被创作者隐藏的评分。
 * GameRatings 表不存在的旧库上整个查询会抛错，调用方外层 catch 统一兜底。
 */
export function ratingColumns(gamesAlias: string) {
  return `(SELECT AVG(rating) FROM GameRatings WHERE hidden = 0 AND game_id = ${gamesAlias}.id) AS avg_rating, (SELECT COUNT(*) FROM GameRatings WHERE hidden = 0 AND game_id = ${gamesAlias}.id) AS rating_count`;
}

/** 把行里的 avg_rating/rating_count 归一化为 avgRating/ratingCount */
export function pickRating(row: { avg_rating?: number | null; rating_count?: number | null }) {
  return {
    avgRating: typeof row.avg_rating === 'number' ? row.avg_rating : undefined,
    ratingCount: typeof row.rating_count === 'number' ? row.rating_count : 0,
  };
}

/** D1 行 → 公开行：解析 tags JSON、带出评分聚合 */
export function parseGameRow(row: GameRow): ParsedGameRow {
  return { ...row, tags: safeParseTags(row.tags), ...pickRating(row) };
}

export function safeParseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((t) => typeof t === 'string');
    return [];
  } catch {
    return [];
  }
}

/** 标签计数聚合（D1 分支与线上快照分支共用） */
export function countTags(tagLists: string[][]): { tag: string; count: number }[] {
  const tagCounts = new Map<string, number>();
  for (const tags of tagLists) {
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // 转换为数组并按计数排序
  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/** games 数据访问用到的最小 D1 接口面（结构化类型，避免依赖生成的 CloudflareEnv 全局） */
export type GamesD1 = {
  prepare: (query: string) => {
    first: <T>() => Promise<T | null>;
    bind: (...args: unknown[]) => {
      all: () => Promise<{ results: unknown }>;
      first: <T>() => Promise<T | null>;
    };
    all: () => Promise<{ results: unknown }>;
  };
};

/**
 * 目录类查询的统一骨架：D1 查询失败或无 binding 时回落到线上快照回退。
 * getGameBySlug 的三态语义（运行时 throw 走 500）不同，不适用本骨架。
 */
export async function withD1Fallback<T>(
  label: string,
  fallback: () => Promise<T>,
  run: (DB: GamesD1) => Promise<T>,
): Promise<T> {
  let DB: GamesD1 | null | undefined;
  try {
    DB = getCloudflareContext().env.DB as GamesD1 | null | undefined;
  } catch (e) {
    console.error(`${label}:`, e);
    return fallback();
  }

  if (!DB) {
    console.error("D1 database binding 'DB' not found.");
    return fallback();
  }

  try {
    return await run(DB);
  } catch (e) {
    console.error(`${label}:`, e);
    return fallback();
  }
}
