-- 添加索引以优化查询性能

-- session 表: 按 user_id 查询优化
CREATE INDEX IF NOT EXISTS `session_user_id_idx` ON `session` (`user_id`);

-- account 表: 按 user_id 查询优化
CREATE INDEX IF NOT EXISTS `account_user_id_idx` ON `account` (`user_id`);

-- Games 表: 按 owner_id 查询优化
CREATE INDEX IF NOT EXISTS `games_owner_id_idx` ON `Games` (`owner_id`);

-- Games 表: 按 slug 查询优化（虽然已有 unique 约束，显式索引可能有助于某些查询计划）
CREATE INDEX IF NOT EXISTS `games_slug_idx` ON `Games` (`slug`);

-- GameContent 表: 按 game_id 查询优化
CREATE INDEX IF NOT EXISTS `game_content_game_id_idx` ON `GameContent` (`game_id`);

-- AiUsage 表: 按 user_id 和 game_id 查询优化
CREATE INDEX IF NOT EXISTS `ai_usage_user_id_idx` ON `AiUsage` (`user_id`);
CREATE INDEX IF NOT EXISTS `ai_usage_game_id_idx` ON `AiUsage` (`game_id`);

-- Minigames 表: 按 owner_id 查询优化
CREATE INDEX IF NOT EXISTS `minigames_owner_id_idx` ON `Minigames` (`owner_id`);

-- GameAnalytics 表: 按 game_id, open_count, rating_count 查询/排序优化
CREATE INDEX IF NOT EXISTS `game_analytics_game_id_idx` ON `GameAnalytics` (`game_id`);
CREATE INDEX IF NOT EXISTS `game_analytics_open_count_idx` ON `GameAnalytics` (`open_count`);
CREATE INDEX IF NOT EXISTS `game_analytics_rating_count_idx` ON `GameAnalytics` (`rating_count`);

-- SceneAnalytics 表: 按 game_id 查询优化
CREATE INDEX IF NOT EXISTS `scene_analytics_game_id_idx` ON `SceneAnalytics` (`game_id`);

-- ChoiceAnalytics 表: 按 game_id 查询优化
CREATE INDEX IF NOT EXISTS `choice_analytics_game_id_idx` ON `ChoiceAnalytics` (`game_id`);

-- ReferrerAnalytics 表: 按 game_id 查询优化
CREATE INDEX IF NOT EXISTS `referrer_analytics_game_id_idx` ON `ReferrerAnalytics` (`game_id`);

-- DeviceAnalytics 表: 按 game_id 查询优化
CREATE INDEX IF NOT EXISTS `device_analytics_game_id_idx` ON `DeviceAnalytics` (`game_id`);
