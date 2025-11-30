-- AI 用量记录表
CREATE TABLE IF NOT EXISTS AiUsage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user(id),
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  game_id INTEGER REFERENCES Games(id),
  created_at INTEGER NOT NULL
);

-- 索引：按用户查询
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON AiUsage(user_id);

-- 索引：按时间查询
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON AiUsage(created_at);

-- 索引：按游戏查询
CREATE INDEX IF NOT EXISTS idx_ai_usage_game_id ON AiUsage(game_id);
