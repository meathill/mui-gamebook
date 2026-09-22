CREATE TABLE IF NOT EXISTS `apikey` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT,
  `start` TEXT,
  `prefix` TEXT,
  `key` TEXT NOT NULL,
  `reference_id` TEXT NOT NULL,
  `config_id` TEXT NOT NULL DEFAULT 'default',
  `refill_interval` INTEGER,
  `refill_amount` INTEGER,
  `last_refill_at` INTEGER,
  `enabled` INTEGER DEFAULT 1,
  `rate_limit_enabled` INTEGER DEFAULT 1,
  `rate_limit_time_window` INTEGER,
  `rate_limit_max` INTEGER,
  `rate_limit_count` INTEGER,
  `last_request` INTEGER,
  `expires_at` INTEGER,
  `created_at` INTEGER,
  `updated_at` INTEGER,
  `remaining` INTEGER,
  `total_used` INTEGER DEFAULT 0,
  `metadata` TEXT,
  `permissions` TEXT
);

CREATE INDEX IF NOT EXISTS `apikey_reference_id_idx` ON `apikey` (`reference_id`);
CREATE INDEX IF NOT EXISTS `apikey_key_idx` ON `apikey` (`key`);
