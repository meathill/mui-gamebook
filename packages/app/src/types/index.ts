export type GameRow = {
  slug: string;
  title: string;
  description: string;
  cover_image: string;
  tags: string;
  created_at: string;
  updated_at: string;
};

// tags 已解析为数组的游戏行
export type ParsedGameRow = Omit<GameRow, 'tags'> & { tags: string[] };
