-- 游戏 shadowban：被封禁的作品从所有公开入口消失，但作者自己仍可预览
ALTER TABLE `Games` ADD COLUMN `shadow_banned` INTEGER NOT NULL DEFAULT 0;
