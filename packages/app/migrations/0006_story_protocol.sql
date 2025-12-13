-- 为 Games 表添加 Story Protocol IP 注册相关字段
ALTER TABLE Games ADD COLUMN ip_id TEXT;
ALTER TABLE Games ADD COLUMN ip_tx_hash TEXT;
ALTER TABLE Games ADD COLUMN ip_token_id TEXT;
ALTER TABLE Games ADD COLUMN ip_registered_at INTEGER;
