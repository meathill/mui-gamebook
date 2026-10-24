ALTER TABLE Games ADD COLUMN media_assistance_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE Games ADD COLUMN media_planning_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE GameContent ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE GameContent ADD COLUMN write_token TEXT;

-- 所有既有写入入口自动参与版本检查，无需依赖调用方维护版本号。
CREATE TRIGGER game_content_revision AFTER UPDATE OF content ON GameContent
WHEN NEW.content <> OLD.content
BEGIN
  UPDATE GameContent SET revision = OLD.revision + 1 WHERE id = NEW.id;
END;

CREATE TABLE MediaAssistanceWorks (
  game_id INTEGER PRIMARY KEY REFERENCES Games(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','partial','completed')),
  checked_revision INTEGER NOT NULL DEFAULT -1,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX media_assistance_one_active ON MediaAssistanceWorks(status) WHERE status = 'active';

CREATE TABLE MediaAssistanceGenerations (
  game_id INTEGER NOT NULL REFERENCES Games(id) ON DELETE CASCADE,
  input_hash TEXT NOT NULL,
  input_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','generating','uncertain','paused','ready')),
  request_id TEXT,
  execution_token TEXT,
  lease_until INTEGER,
  provider_task_id TEXT,
  error TEXT,
  output_key TEXT,
  output_url TEXT,
  file_hash TEXT,
  content_type TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(game_id, input_hash)
);

CREATE TABLE MediaAssistanceTargets (
  id TEXT PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES Games(id) ON DELETE CASCADE,
  target_key TEXT NOT NULL,
  target_json TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applied','satisfied','dismissed','paused')),
  applied_url TEXT,
  error TEXT,
  UNIQUE(game_id, target_key),
  FOREIGN KEY(game_id, input_hash) REFERENCES MediaAssistanceGenerations(game_id, input_hash)
);
CREATE INDEX media_assistance_target_hash ON MediaAssistanceTargets(game_id, input_hash);
