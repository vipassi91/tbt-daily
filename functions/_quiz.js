// What people leave at the end of the tile personality quiz: name, Instagram, city, WhatsApp (optional), whether they want to hear about sessions.
// Only the admin can read it. A person is one row: the same Instagram username sent again updates that row.
import { ensureHostTables } from './_hostauth.js';
export const QUIZ_TILES = ['one-bamboo', 'nine-bamboo', 'one-character', 'nine-character', 'one-dot', 'nine-dot', 'red-dragon', 'green-dragon', 'white-dragon', 'east-wind', 'south-wind', 'west-wind', 'north-wind', 'spring', 'summer', 'autumn', 'winter', 'plum-blossom', 'orchid', 'chrysanthemum', 'bamboo', 'blank-tile'];
const SQL = [
  "CREATE TABLE IF NOT EXISTS quiz_leads (id TEXT PRIMARY KEY, name TEXT NOT NULL, instagram TEXT NOT NULL UNIQUE, city TEXT NOT NULL, whatsapp TEXT NOT NULL DEFAULT '', invite INTEGER NOT NULL DEFAULT 1, tile TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  'CREATE INDEX IF NOT EXISTS idx_quiz_leads_created ON quiz_leads(created_at)',
];
let ensured = { db: null, p: null };
export function ensureQuizTables(env) {
  if (ensured.db === env.DB && ensured.p) return ensured.p;
  const p = (async function () { await ensureHostTables(env); for (const s of SQL) await env.DB.prepare(s).run(); })();
  ensured = { db: env.DB, p: p };
  p.catch(function () { ensured = { db: null, p: null }; });
  return p;
}
