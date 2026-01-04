-- 为小游戏添加来源剧本字段
ALTER TABLE Minigames ADD COLUMN source_game_id INTEGER REFERENCES Games(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_minigames_source_game_id ON Minigames(source_game_id);
