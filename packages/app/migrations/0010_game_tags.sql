-- 游戏标签关联表，用于加速按标签搜索
CREATE TABLE IF NOT EXISTS GameTags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES Games(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE(game_id, tag)
);

-- 按标签查询的索引
CREATE INDEX IF NOT EXISTS idx_game_tags_tag ON GameTags(tag);

-- 按游戏查询的索引
CREATE INDEX IF NOT EXISTS idx_game_tags_game_id ON GameTags(game_id);

-- 从现有 Games 表迁移标签数据
-- 注意：此脚本需要手动执行，因为 D1 不支持复杂的 JSON 解析
-- 迁移完成后，可以考虑移除 Games.tags 字段（可选）
