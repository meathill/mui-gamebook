-- 玩家评分与评价：匿名可打星，登录才可留言；创作者可隐藏/置顶
CREATE TABLE `GameRatings` (
  `id` INTEGER PRIMARY KEY,
  `game_id` INTEGER NOT NULL REFERENCES `Games`(`id`) ON DELETE CASCADE,
  `user_id` TEXT REFERENCES `user`(`id`) ON DELETE SET NULL,
  `rating` INTEGER NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `content` TEXT,
  `hidden` INTEGER NOT NULL DEFAULT 0,
  `pinned` INTEGER NOT NULL DEFAULT 0,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);
CREATE INDEX `game_ratings_game_id_idx` ON `GameRatings` (`game_id`);
CREATE UNIQUE INDEX `game_ratings_game_id_user_id_unique` ON `GameRatings` (`game_id`, `user_id`);
