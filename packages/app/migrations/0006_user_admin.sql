-- 内容管理员标记：从 KV 配置的 adminUserIds 名单改为用户表字段（仅建列，不迁移数据）
-- 说明：原名单存在 KV 里，D1 无法读到，因此历史管理员需要在「用户管理」里重新勾选；
-- 同时 root 身份改由 ADMIN_EMAIL 环境变量单独判定，不占这个字段。
ALTER TABLE `user` ADD COLUMN `is_admin` INTEGER NOT NULL DEFAULT 0;
