export type GameRow = {
  slug: string;
  title: string;
  description: string;
  cover_image: string;
  tags: string;
  created_at: string;
  updated_at: string;
  /** 列表查询透出的评分聚合（标量子查询列，无评分/旧库时为 null 缺失） */
  avg_rating?: number | null;
  rating_count?: number | null;
};

// tags 已解析为数组的游戏行
export type ParsedGameRow = Omit<GameRow, 'tags' | 'avg_rating' | 'rating_count'> & {
  tags: string[];
  avgRating?: number;
  ratingCount?: number;
};
