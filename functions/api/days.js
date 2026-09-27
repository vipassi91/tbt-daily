import { isAdmin, json, unauthorized } from '../_auth.js';
import { scoreTable, avg } from '../_scoring.js';

// GET /api/days -> public, list days (newest first)
export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM days ORDER BY date DESC, created_at DESC').all();
    return json(results);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}

// POST /api/days -> admin only, create a new day
export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const d = await request.json();
    if (!d.label || !d.date) return json({ error: 'Label dan tanggal wajib diisi' }, 400);
    const id = 'day-' + Date.now();
    await env.DB.prepare('INSERT INTO days (id, label, date, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, d.label, d.date, new Date().toISOString()).run();
    return json({ ok: true, id });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}
