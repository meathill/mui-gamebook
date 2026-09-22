CREATE TABLE IF NOT EXISTS `stripe_customers` (
  `id` INTEGER PRIMARY KEY,
  `user_id` TEXT NOT NULL,
  `stripe_customer_id` TEXT NOT NULL,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `stripe_customers_user_id_unique` ON `stripe_customers` (`user_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `stripe_customers_stripe_customer_id_unique` ON `stripe_customers` (`stripe_customer_id`);
CREATE INDEX IF NOT EXISTS `stripe_customers_user_id_idx` ON `stripe_customers` (`user_id`);

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` INTEGER PRIMARY KEY,
  `user_id` TEXT NOT NULL,
  `stripe_subscription_id` TEXT NOT NULL,
  `stripe_customer_id` TEXT NOT NULL,
  `stripe_price_id` TEXT NOT NULL,
  `plan_code` TEXT NOT NULL,
  `interval` TEXT NOT NULL,
  `status` TEXT NOT NULL,
  `monthly_token_limit` INTEGER NOT NULL,
  `current_period_start` INTEGER NOT NULL,
  `current_period_end` INTEGER NOT NULL,
  `cancel_at_period_end` INTEGER DEFAULT false NOT NULL,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS `subscriptions_stripe_subscription_id_unique` ON `subscriptions` (`stripe_subscription_id`);
CREATE INDEX IF NOT EXISTS `subscriptions_user_id_idx` ON `subscriptions` (`user_id`);
CREATE INDEX IF NOT EXISTS `subscriptions_status_idx` ON `subscriptions` (`status`);
CREATE INDEX IF NOT EXISTS `subscriptions_user_id_status_idx` ON `subscriptions` (`user_id`, `status`);
