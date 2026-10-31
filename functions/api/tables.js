import { isAdmin, json, unauthorized } from '../_auth.js';
import { createTableRow } from '../_tables.js';

// POST /api/tables: admin only. Creates a table with two codes:
// `code` (6 characters) lets the host edit, `view_code` (5 characters) is what players get (read only).
// Player names are optional here: a blank slot just becomes "Player N"
// until the host fills in the real name from the scoreboard itself.
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const t = await request.json();
    if (!t.day_id || !t.label) {
      return json({ error: 'day_id and a table name are required' }, 400);
    }
    const day = await env.DB.prepare('SELECT id, date FROM days WHERE id=?').bind(t.day_id).first();
    if (!day) return json({ error: 'Session not found' }, 404);
    const made = await createTableRow(env, day, t.label, t.players, null);
    return json({ ok: true, id: made.id, code: made.code, view_code: made.view_code });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}
