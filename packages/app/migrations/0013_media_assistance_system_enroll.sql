-- 站方代为开启素材协助：区分「从未设置」「作者开启」「站方开启」「作者主动关闭」。
-- enrolled_by: 'author' | 'system'；opted_out_at 非空表示作者主动关闭，站方不再代为开启。
ALTER TABLE Games ADD COLUMN media_assistance_enrolled_by TEXT;
ALTER TABLE Games ADD COLUMN media_assistance_enrolled_at INTEGER;
ALTER TABLE Games ADD COLUMN media_assistance_opted_out_at INTEGER;
ALTER TABLE Games ADD COLUMN media_assistance_notified_at INTEGER;
UPDATE Games SET media_assistance_enrolled_by = 'author' WHERE media_assistance_enabled = 1;
