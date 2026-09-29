import { isAdmin, json, unauthorized } from '../_auth.js';
import { buildStats, uniqueCode } from '../_tables.js';

// POST /api/tables: admin only. Creates a table with two codes:
// `code` lets the host edit, `view_code` is what players get (read only).
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const t = await request.json();
    const players = Array.isArray(t.players) ? t.players.map(function (p) { return String(p || '').trim(); }) : [];
    if (!t.day_id || !t.label || players.length !== 4 || players.some(function (p) { return !p; })) {
      return json({ error: 'day_id, nama meja, dan 4 nama pemain wajib diisi' }, 400);
    }
    const day = await env.DB.prepare('SELECT id, date FROM days WHERE id=?').bind(t.day_id).first();
    if (!day) return json({ error: 'Sesi tidak ditemukan' }, 404);

    const code = await uniqueCode(env);
    const viewCode = await uniqueCode(env, [code]);

    let dateText = '';
    try { dateText = new Date(day.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { dateText = ''; }
    const game = { names: players, title: String(t.label).slice(0, 30), date: dateText, useStart: false, start: '240', events: [] };
    const stats = buildStats(game, players);

    const id = 'tbl-' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO tables (id, day_id, code, view_code, label, players, rounds, stats, starting_score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, t.day_id, code, viewCode, String(t.label).trim(), JSON.stringify(stats.names), JSON.stringify(game), JSON.stringify(stats), 240, now, now).run();

    return json({ ok: true, id: id, code: code, view_code: viewCode });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}
