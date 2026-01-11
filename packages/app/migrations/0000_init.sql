-- =============================================
-- 合并迁移：完整数据库 Schema
-- 生成时间：2026-01-11
-- 基于 schema.ts 和历史迁移文件合并
-- =============================================

-- ========== 用户认证相关表 ==========

-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `name` TEXT NOT NULL,
  `email` TEXT NOT NULL UNIQUE,
  `email_verified` INTEGER NOT NULL,
  `image` TEXT,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);

-- 会话表
CREATE TABLE IF NOT EXISTS `session` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `expires_at` INTEGER NOT NULL,
  `token` TEXT NOT NULL UNIQUE,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL,
  `ip_address` TEXT,
  `user_agent` TEXT,
  `user_id` TEXT NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
CREATE INDEX IF NOT EXISTS `session_user_id_idx` ON `session` (`user_id`);

-- 账户表（OAuth 登录）
CREATE TABLE IF NOT EXISTS `account` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `account_id` TEXT NOT NULL,
  `provider_id` TEXT NOT NULL,
  `user_id` TEXT NOT NULL,
  `access_token` TEXT,
  `refresh_token` TEXT,
  `id_token` TEXT,
  `access_token_expires_at` INTEGER,
  `refresh_token_expires_at` INTEGER,
  `scope` TEXT,
  `password` TEXT,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
CREATE INDEX IF NOT EXISTS `account_user_id_idx` ON `account` (`user_id`);

-- 验证表
CREATE TABLE IF NOT EXISTS `verification` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `identifier` TEXT NOT NULL,
  `value` TEXT NOT NULL,
  `expires_at` INTEGER NOT NULL,
  `created_at` INTEGER,
  `updated_at` INTEGER
);

-- ========== 游戏核心表 ==========

-- 游戏表
CREATE TABLE IF NOT EXISTS `Games` (
  `id` INTEGER PRIMARY KEY,
  `slug` TEXT NOT NULL UNIQUE,
  `title` TEXT NOT NULL,
  `description` TEXT,
  `background_story` TEXT,
  `cover_image` TEXT,
  `tags` TEXT,
  `published` INTEGER DEFAULT 0,
  `owner_id` TEXT,
  `ip_id` TEXT,
  `ip_tx_hash` TEXT,
  `ip_token_id` TEXT,
  `ip_registered_at` INTEGER,
  `story_prompt` TEXT,
  `created_at` INTEGER,
  `updated_at` INTEGER,
  FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
CREATE INDEX IF NOT EXISTS `games_owner_id_idx` ON `Games` (`owner_id`);
CREATE INDEX IF NOT EXISTS `games_slug_idx` ON `Games` (`slug`);

-- 游戏内容表
CREATE TABLE IF NOT EXISTS `GameContent` (
  `id` INTEGER PRIMARY KEY,
  `game_id` INTEGER,
  `content` TEXT NOT NULL,
  FOREIGN KEY (`game_id`) REFERENCES `Games`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `game_content_game_id_idx` ON `GameContent` (`game_id`);

-- 游戏标签关联表（加速按标签搜索）
CREATE TABLE IF NOT EXISTS `GameTags` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `game_id` INTEGER NOT NULL,
  `tag` TEXT NOT NULL,
  `created_at` INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE(`game_id`, `tag`),
  FOREIGN KEY (`game_id`) REFERENCES `Games`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_game_tags_tag` ON `GameTags`(`tag`);
CREATE INDEX IF NOT EXISTS `idx_game_tags_game_id` ON `GameTags`(`game_id`);

-- ========== AI 相关表 ==========

-- AI 用量记录表
CREATE TABLE IF NOT EXISTS `AiUsage` (
  `id` INTEGER PRIMARY KEY,
  `user_id` TEXT NOT NULL,
  `type` TEXT NOT NULL,
  `model` TEXT NOT NULL,
  `prompt_tokens` INTEGER DEFAULT 0,
  `completion_tokens` INTEGER DEFAULT 0,
  `total_tokens` INTEGER DEFAULT 0,
  `game_id` INTEGER,
  `created_at` INTEGER NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (`game_id`) REFERENCES `Games`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
CREATE INDEX IF NOT EXISTS `ai_usage_user_id_idx` ON `AiUsage` (`user_id`);
CREATE INDEX IF NOT EXISTS `ai_usage_game_id_idx` ON `AiUsage` (`game_id`);
CREATE INDEX IF NOT EXISTS `idx_ai_usage_created_at` ON `AiUsage` (`created_at`);


-- 小游戏表
CREATE TABLE IF NOT EXISTS `Minigames` (
  `id` INTEGER PRIMARY KEY,
  `owner_id` TEXT,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `prompt` TEXT NOT NULL,
  `code` TEXT,
  `variables` TEXT,
  `status` TEXT DEFAULT 'pending',
  `error_message` TEXT,
  `source_game_id` INTEGER,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER,
  FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  FOREIGN KEY (`source_game_id`) REFERENCES `Games`(`id`) ON UPDATE NO ACTION ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS `minigames_owner_id_idx` ON `Minigames` (`owner_id`);
CREATE INDEX IF NOT EXISTS `idx_minigames_status` ON `Minigames` (`status`);
CREATE INDEX IF NOT EXISTS `idx_minigames_source_game_id` ON `Minigames` (`source_game_id`);


-- 异步操作表（视频生成等长时间任务）
CREATE TABLE IF NOT EXISTS `PendingOperations` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `user_id` TEXT NOT NULL,
  `game_id` INTEGER,
  `type` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'pending',
  `operation_name` TEXT,
  `input_data` TEXT,
  `output_data` TEXT,
  `error_message` TEXT,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL,
  `completed_at` INTEGER,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  FOREIGN KEY (`game_id`) REFERENCES `Games`(`id`) ON UPDATE NO ACTION ON DELETE NO ACTION
);
CREATE INDEX IF NOT EXISTS `idx_pending_ops_user_id` ON `PendingOperations`(`user_id`);
CREATE INDEX IF NOT EXISTS `idx_pending_ops_status` ON `PendingOperations`(`status`);
CREATE INDEX IF NOT EXISTS `idx_pending_ops_game_id` ON `PendingOperations`(`game_id`);

-- ========== 统计相关表 ==========

-- 游戏统计汇总表
CREATE TABLE IF NOT EXISTS `GameAnalytics` (
  `id` INTEGER PRIMARY KEY,
  `game_id` INTEGER NOT NULL UNIQUE,
  `open_count` INTEGER DEFAULT 0,
  `completion_count` INTEGER DEFAULT 0,
  `total_duration` INTEGER DEFAULT 0,
  `session_count` INTEGER DEFAULT 0,
  `rating_count` INTEGER DEFAULT 0,
  `rating_sum` INTEGER DEFAULT 0,
  `synced_at` INTEGER,
  FOREIGN KEY (`game_id`) REFERENCES `Games`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `game_analytics_game_id_idx` ON `GameAnalytics` (`game_id`);
CREATE INDEX IF NOT EXISTS `game_analytics_open_count_idx` ON `GameAnalytics` (`open_count`);
CREATE INDEX IF NOT EXISTS `game_analytics_rating_count_idx` ON `GameAnalytics` (`rating_count`);

-- 热门场景表
CREATE TABLE IF NOT EXISTS `SceneAnalytics` (
  `id` INTEGER PRIMARY KEY,
  `game_id` INTEGER NOT NULL,
  `scene_id` TEXT NOT NULL,
  `visit_count` INTEGER DEFAULT 0,
  UNIQUE(`game_id`, `scene_id`),
  FOREIGN KEY (`game_id`) REFERENCES `Games`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `scene_analytics_game_id_idx` ON `SceneAnalytics` (`game_id`);

-- 选项分布表
CREATE TABLE IF NOT EXISTS `ChoiceAnalytics` (
  `id` INTEGER PRIMARY KEY,
  `game_id` INTEGER NOT NULL,
  `scene_id` TEXT NOT NULL,
  `choice_index` INTEGER NOT NULL,
  `click_count` INTEGER DEFAULT 0,
  UNIQUE(`game_id`, `scene_id`, `choice_index`),
  FOREIGN KEY (`game_id`) REFERENCES `Games`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `choice_analytics_game_id_idx` ON `ChoiceAnalytics` (`game_id`);

-- 来源统计表
CREATE TABLE IF NOT EXISTS `ReferrerAnalytics` (
  `id` INTEGER PRIMARY KEY,
  `game_id` INTEGER NOT NULL,
  `referrer` TEXT NOT NULL,
  `count` INTEGER DEFAULT 0,
  UNIQUE(`game_id`, `referrer`),
  FOREIGN KEY (`game_id`) REFERENCES `Games`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `referrer_analytics_game_id_idx` ON `ReferrerAnalytics` (`game_id`);

-- 设备统计表
CREATE TABLE IF NOT EXISTS `DeviceAnalytics` (
  `id` INTEGER PRIMARY KEY,
  `game_id` INTEGER NOT NULL,
  `device_type` TEXT NOT NULL,
  `count` INTEGER DEFAULT 0,
  UNIQUE(`game_id`, `device_type`),
  FOREIGN KEY (`game_id`) REFERENCES `Games`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `device_analytics_game_id_idx` ON `DeviceAnalytics` (`game_id`);
