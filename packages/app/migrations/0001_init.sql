DROP TABLE IF EXISTS Games;
DROP TABLE IF EXISTS GameContent;

CREATE TABLE IF NOT EXISTS Games (
    slug TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS GameContent (
    slug TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    FOREIGN KEY (slug) REFERENCES Games(slug) ON DELETE CASCADE
);
