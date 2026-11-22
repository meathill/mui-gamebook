-- 修正 0017：RateLimit 列名统一为 snake_case，与 drizzle schema（last_request）一致。
-- 0017 建表时用了 camelCase（lastRequest），better-auth 限速写入报
-- "no column named last_request"（表是临时限速数据，直接重建无损）。
DROP TABLE IF EXISTS `RateLimit`;
CREATE TABLE `RateLimit` (
  `id` TEXT PRIMARY KEY,
  `key` TEXT NOT NULL,
  `count` INTEGER NOT NULL,
  `last_request` INTEGER NOT NULL
);
CREATE INDEX `rate_limit_key_idx` ON `RateLimit` (`key`);
