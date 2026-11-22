-- better-auth 全局限速的数据库存储（storage: 'database'，防 OTP 邮件轰炸）
-- 模型字段与 better-auth 内置 rateLimit 模型对应：key / count / last_request
-- （列名 snake_case 与 drizzle schema 一致；0017 初版用 camelCase 已由 0018 修正）
CREATE TABLE `RateLimit` (
  `id` TEXT PRIMARY KEY,
  `key` TEXT NOT NULL,
  `count` INTEGER NOT NULL,
  `last_request` INTEGER NOT NULL
);
CREATE INDEX `rate_limit_key_idx` ON `RateLimit` (`key`);
