DROP TABLE IF EXISTS Games;
DROP TABLE IF EXISTS GameContent;

CREATE TABLE IF NOT EXISTS Games (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    tags TEXT, -- JSON string array
    published BOOLEAN DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS GameContent (
    slug TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    FOREIGN KEY (slug) REFERENCES Games(slug) ON DELETE CASCADE
);
