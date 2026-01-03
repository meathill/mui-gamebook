-- 游戏统计汇总表（从 KV 同步）
CREATE TABLE IF NOT EXISTS GameAnalytics (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL UNIQUE REFERENCES Games(id) ON DELETE CASCADE,
  open_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  synced_at INTEGER
);

-- 热门场景表
CREATE TABLE IF NOT EXISTS SceneAnalytics (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES Games(id) ON DELETE CASCADE,
  scene_id TEXT NOT NULL,
  visit_count INTEGER DEFAULT 0,
  UNIQUE(game_id, scene_id)
);

-- 选项分布表
CREATE TABLE IF NOT EXISTS ChoiceAnalytics (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES Games(id) ON DELETE CASCADE,
  scene_id TEXT NOT NULL,
  choice_index INTEGER NOT NULL,
  click_count INTEGER DEFAULT 0,
  UNIQUE(game_id, scene_id, choice_index)
);

-- 来源统计表
CREATE TABLE IF NOT EXISTS ReferrerAnalytics (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES Games(id) ON DELETE CASCADE,
  referrer TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  UNIQUE(game_id, referrer)
);

-- 设备统计表
CREATE TABLE IF NOT EXISTS DeviceAnalytics (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES Games(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  UNIQUE(game_id, device_type)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_game_analytics_game_id ON GameAnalytics(game_id);
CREATE INDEX IF NOT EXISTS idx_scene_analytics_game_id ON SceneAnalytics(game_id);
CREATE INDEX IF NOT EXISTS idx_choice_analytics_game_id ON ChoiceAnalytics(game_id);
CREATE INDEX IF NOT EXISTS idx_referrer_analytics_game_id ON ReferrerAnalytics(game_id);
CREATE INDEX IF NOT EXISTS idx_device_analytics_game_id ON DeviceAnalytics(game_id);
