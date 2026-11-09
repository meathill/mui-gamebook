-- 全局运行配置（单行表，替代原 KV 中的 app:config）
CREATE TABLE IF NOT EXISTS `AppConfig` (
  `id` INTEGER PRIMARY KEY,
  `data` TEXT NOT NULL,
  `updated_at` INTEGER NOT NULL
);
