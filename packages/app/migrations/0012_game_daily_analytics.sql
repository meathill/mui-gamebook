-- 游戏每日统计表：打开/完成事件按 UTC 日期落库，供后台按天趋势图使用。
-- 历史数据无法回溯，从上线起开始记录。

CREATE TABLE GameDailyAnalytics (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES Games(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  open_count INTEGER NOT NULL DEFAULT 0,
  completion_count INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX game_daily_analytics_game_id_date_unique ON GameDailyAnalytics(game_id, date);
CREATE INDEX game_daily_analytics_date_idx ON GameDailyAnalytics(date);
