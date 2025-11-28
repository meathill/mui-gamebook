DROP TABLE IF EXISTS Games;
DROP TABLE IF EXISTS GameContent;

CREATE TABLE IF NOT EXISTS Games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    `background_story` text,
    cover_image TEXT,
    tags TEXT, -- JSON string array
    published BOOLEAN DEFAULT 0,
    owner_id text,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Games_slug_unique` ON `Games` (`slug`);

CREATE TABLE IF NOT EXISTS GameContent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id id NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (game_id) REFERENCES Games(id) ON DELETE CASCADE
);
