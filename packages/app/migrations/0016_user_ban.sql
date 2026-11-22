-- 用户封禁：NSFW 治理第一步，封禁后无法登录（OTP 不发送 / session 级联清除）
ALTER TABLE `user` ADD COLUMN `banned` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `user` ADD COLUMN `banned_at` INTEGER;
ALTER TABLE `user` ADD COLUMN `ban_reason` TEXT;
