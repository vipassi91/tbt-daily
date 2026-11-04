import { isAdmin, json, unauthorized } from '../../_auth.js';
import { statsFor, summarizePlayers, uniqueCode } from '../../_tables.js';

// GET /api/days/:id: admin only. Includes both codes of every table
// (edit code for the host, view code for players).
export async function onRequestGet({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const day = await env.DB.prepare('SELECT * FROM days WHERE id=?').bind(params.id).first();
    if (!day) return json({ error: 'Session not found' }, 404);
    const { results } = await env.DB.prepare(
      'SELECT id, code, view_code, label, players, rounds, stats, updated_at FROM tables WHERE day_id=? ORDER BY created_at ASC'
    ).bind(params.id).all();

    // which host made the session and each table (nothing before hosts are used)
    const nick = {}, by = {};
    try { (await env.DB.prepare('SELECT id, nickname FROM registry').all()).results.forEach(function (x) { nick[x.id] = x.nickname; }); } catch (e) { /* no registry */ }
    try { (await env.DB.prepare('SELECT id, created_by FROM tables WHERE day_id=? AND created_by IS NOT NULL').bind(params.id).all()).results.forEach(function (x) { by[x.id] = nick[x.created_by] || null; }); } catch (e) { /* no such column yet */ }
    const tables = [];
    for (const t of results) {
      let viewCode = t.view_code;
      if (!viewCode) {
        // tables created before view codes existed get one here
        viewCode = await uniqueCode(env, [t.code]);
        await env.DB.prepare('UPDATE tables SET view_code=? WHERE id=?').bind(viewCode, t.id).run();
      }
      const stats = await statsFor(env, t);
      tables.push({
        id: t.id, code: t.code, view_code: viewCode, label: t.label, createdBy: by[t.id] || null,
        events: stats.events, progress: stats.progress, mode: stats.mode || 'casual', locked: !!stats.locked, rules: stats.rules || null, updatedAt: t.updated_at,
        players: summarizePlayers(stats),
      });
    }
    return json({ id: day.id, label: day.label, date: day.date, createdBy: day.created_by ? (nick[day.created_by] || null) : null, tables: tables });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// PATCH /api/days/:id: admin only. Renames the session: { label }. Only the name changes (the date and the tables stay),
// and every page that shows the name reads it from this row, so nothing else has to be updated.
export async function onRequestPatch({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    let d; try { d = await request.json(); } catch (e) { return json({ error: 'The request could not be read' }, 400); }
    const label = d && typeof d.label === 'string' ? d.label.replace(/\s+/g, ' ').trim() : '';
    if (!label) return json({ error: 'A session name is required' }, 400);
    if (label.length > 80) return json({ error: 'The session name is too long (80 characters at most)' }, 400);
    const day = await env.DB.prepare('SELECT id FROM days WHERE id=?').bind(params.id).first();
    if (!day) return json({ error: 'Session not found' }, 404);
    await env.DB.prepare('UPDATE days SET label=? WHERE id=?').bind(label, params.id).run();
    return json({ id: params.id, label: label });
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
