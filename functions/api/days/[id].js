import { isAdmin, json, unauthorized } from '../../_auth.js';
import { buildStats, summarizePlayers, uniqueCode } from '../../_tables.js';

// GET /api/days/:id: admin only. Includes both codes of every table
// (edit code for the host, view code for players).
export async function onRequestGet({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const day = await env.DB.prepare('SELECT * FROM days WHERE id=?').bind(params.id).first();
    if (!day) return json({ error: 'Sesi tidak ditemukan' }, 404);
    const { results } = await env.DB.prepare(
      'SELECT id, code, view_code, label, players, rounds, stats, updated_at FROM tables WHERE day_id=? ORDER BY created_at ASC'
    ).bind(params.id).all();

    const tables = [];
    for (const t of results) {
      let viewCode = t.view_code;
      let stats = t.stats ? JSON.parse(t.stats) : null;
      if (!viewCode || !stats) {
        // tables created before view codes / stored results existed get filled in here
        if (!viewCode) viewCode = await uniqueCode(env, [t.code]);
        if (!stats) stats = buildStats(JSON.parse(t.rounds), JSON.parse(t.players));
        await env.DB.prepare('UPDATE tables SET view_code=?, stats=? WHERE id=?').bind(viewCode, JSON.stringify(stats), t.id).run();
      }
      tables.push({
        id: t.id, code: t.code, view_code: viewCode, label: t.label,
        events: stats.events, progress: stats.progress, mode: stats.mode || 'casual', locked: !!stats.locked, updatedAt: t.updated_at,
        players: summarizePlayers(stats),
      });
    }
    return json({ id: day.id, label: day.label, date: day.date, tables: tables });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// DELETE /api/days/:id: admin only, removes the session and all its tables
export async function onRequestDelete({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    await env.DB.prepare('DELETE FROM tables WHERE day_id=?').bind(params.id).run();
    await env.DB.prepare('DELETE FROM days WHERE id=?').bind(params.id).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}
