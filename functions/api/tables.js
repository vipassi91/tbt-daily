import { isAdmin, json, unauthorized, genCode } from '../_auth.js';

// POST /api/tables -> admin only, create a table under a day; returns its join code
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const t = await request.json();
    if (!t.day_id || !t.label || !Array.isArray(t.players) || t.players.length !== 4) {
      return json({ error: 'day_id, label, dan 4 nama pemain wajib diisi' }, 400);
    }

    let code, exists = true, tries = 0;
    while (exists && tries < 10) {
      code = genCode(5);
      const row = await env.DB.prepare('SELECT id FROM tables WHERE code=?').bind(code).first();
      exists = !!row;
      tries++;
    }

    const id = 'tbl-' + Date.now();
    const emptyRounds = JSON.stringify({ East: [], South: [], West: [], North: [] });
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO tables (id, day_id, code, label, players, rounds, starting_score, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, t.day_id, code, t.label, JSON.stringify(t.players), emptyRounds, t.starting_score || 240, now, now).run();

    return json({ ok: true, id, code });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}
