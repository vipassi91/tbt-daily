import { isAdmin, json, unauthorized } from '../_auth.js';

// GET /api/days: list of sessions with how many tables each has
export async function onRequestGet({ request, env }) {
  try {
    // the admin also sees which host made a session (the public list does not)
    let results;
    if (isAdmin(request, env)) {
      try {
        results = (await env.DB.prepare(
          'SELECT d.id, d.label, d.date, (SELECT COUNT(*) FROM tables t WHERE t.day_id = d.id) AS table_count, (SELECT r.nickname FROM registry r WHERE r.id = d.created_by) AS created_by_name FROM days d ORDER BY d.date DESC, d.created_at DESC'
        ).all()).results;
      } catch (e) { results = null; }   // before hosts are used there is no such column yet
    }
    if (!results) results = (await env.DB.prepare(
      'SELECT d.id, d.label, d.date, (SELECT COUNT(*) FROM tables t WHERE t.day_id = d.id) AS table_count FROM days d ORDER BY d.date DESC, d.created_at DESC'
    ).all()).results;
    return json(results);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// POST /api/days: admin only
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const d = await request.json();
    if (!d.label || !d.date) return json({ error: 'A label and a date are required' }, 400);
    const id = 'day-' + Date.now();
    await env.DB.prepare('INSERT INTO days (id, label, date, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, String(d.label).trim(), d.date, new Date().toISOString()).run();
    return json({ ok: true, id });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}
