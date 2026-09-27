-- Tambahan buat sistem multi-meja harian, jalankan di Console D1 yang SAMA
-- (database tbt-leaderboard), sekali saja. Tidak mengganggu tabel lain.

CREATE TABLE IF NOT EXISTS days (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  day_id TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  players TEXT NOT NULL,        -- JSON array of 4 names
  rounds TEXT NOT NULL,         -- JSON: {"East":[hands],"South":[...],"West":[...],"North":[...]}
  starting_score INTEGER NOT NULL DEFAULT 240,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
