-- better-auth api-key@1.6.21 字段对齐：requestCount（非 rateLimitCount/totalUsed）
ALTER TABLE `apikey` ADD COLUMN `request_count` INTEGER;
UPDATE `apikey` SET `request_count` = `rate_limit_count` WHERE `request_count` IS NULL;
ALTER TABLE `apikey` DROP COLUMN `rate_limit_count`;
ALTER TABLE `apikey` DROP COLUMN `total_used`;
