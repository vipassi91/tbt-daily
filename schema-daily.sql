CREATE TABLE IF NOT EXISTS days ( id TEXT PRIMARY KEY, label TEXT NOT NULL, date TEXT NOT NULL, created_at TEXT NOT NULL );
CREATE TABLE IF NOT EXISTS tables ( id TEXT PRIMARY KEY, day_id TEXT NOT NULL, code TEXT UNIQUE NOT NULL, view_code TEXT, label TEXT NOT NULL, players TEXT NOT NULL, rounds TEXT NOT NULL, stats TEXT, starting_score INTEGER NOT NULL DEFAULT 240, created_at TEXT NOT NULL, updated_at TEXT NOT NULL );
CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_view_code ON tables(view_code);
