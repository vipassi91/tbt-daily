ALTER TABLE tables ADD COLUMN view_code TEXT;
ALTER TABLE tables ADD COLUMN stats TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_view_code ON tables(view_code);
