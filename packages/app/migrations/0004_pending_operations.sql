-- 异步操作表，用于存储需要长时间处理的任务（如视频生成）
CREATE TABLE IF NOT EXISTS PendingOperations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user(id),
  game_id INTEGER REFERENCES Games(id),
  type TEXT NOT NULL,  -- 操作类型：video_generation, audio_generation 等
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  operation_name TEXT,  -- Google API 返回的 operation name
  input_data TEXT,  -- JSON: 原始请求参数（prompt 等）
  output_data TEXT,  -- JSON: 完成后的结果（url 等）
  error_message TEXT,  -- 失败时的错误信息
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER  -- 完成时间
);

-- 索引：按用户查询
CREATE INDEX IF NOT EXISTS idx_pending_ops_user_id ON PendingOperations(user_id);

-- 索引：按状态查询（用于定期检查未完成的操作）
CREATE INDEX IF NOT EXISTS idx_pending_ops_status ON PendingOperations(status);

-- 索引：按游戏查询
CREATE INDEX IF NOT EXISTS idx_pending_ops_game_id ON PendingOperations(game_id);
