-- Opsional: registry pemain, pendaftaran lewat link, dan pisah per game bisa diaktifkan dengan tombol di halaman admin-pemain.html.
-- Kalau mau manual, jalankan sembilan baris ini satu per satu di Console D1.
CREATE TABLE IF NOT EXISTS registry (id TEXT PRIMARY KEY, full_name TEXT, nickname TEXT NOT NULL, whatsapp TEXT, instagram TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS registry_names (name_key TEXT PRIMARY KEY, registry_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_registry_names_id ON registry_names(registry_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_registry_whatsapp ON registry(whatsapp) WHERE whatsapp IS NOT NULL AND whatsapp != '';
CREATE TABLE IF NOT EXISTS registry_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS registry_requests (id TEXT PRIMARY KEY, nickname TEXT NOT NULL, full_name TEXT, whatsapp TEXT NOT NULL, instagram TEXT, table_name TEXT, ip_hash TEXT, created_at TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_registry_requests_wa ON registry_requests(whatsapp);
CREATE TABLE IF NOT EXISTS registry_seats (table_id TEXT NOT NULL, seat INTEGER NOT NULL, name_key TEXT NOT NULL, registry_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (table_id, seat));
CREATE INDEX IF NOT EXISTS idx_registry_seats_id ON registry_seats(registry_id);
