-- 小游戏表，用于存储 AI 生成的小游戏代码
-- 小游戏是用户级别的资源，可在多个游戏/场景中复用
CREATE TABLE IF NOT EXISTS Minigames (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,  -- 所有者
  name TEXT NOT NULL,  -- 小游戏名称
  description TEXT,  -- 小游戏描述
  prompt TEXT,  -- 用户提供的生成 prompt
  code TEXT,  -- AI 生成的 JavaScript 代码
  variables TEXT,  -- 小游戏可访问的变量列表，JSON 数组格式
  status TEXT DEFAULT 'completed',  -- pending, completed, failed
  error_message TEXT,  -- 失败时的错误信息
  created_at INTEGER NOT NULL DEFAULT current_timestamp,
  updated_at INTEGER NOT NULL DEFAULT current_timestamp
);

-- 索引：按所有者查询
CREATE INDEX IF NOT EXISTS idx_minigames_owner_id ON Minigames(owner_id);

-- 索引：按状态查询
CREATE INDEX IF NOT EXISTS idx_minigames_status ON Minigames(status);
