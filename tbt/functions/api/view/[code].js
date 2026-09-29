import { json } from '../../_auth.js';

// GET /api/view/:code: what players open. The view code only ever allows reading.
export async function onRequestGet({ env, params }) {
  try {
    const t = await env.DB.prepare(
      'SELECT t.label, t.rounds, t.updated_at, d.label AS day_label, d.date AS day_date FROM tables t JOIN days d ON d.id = t.day_id WHERE t.view_code=?'
    ).bind(params.code.toUpperCase()).first();
    if (!t) return json({ error: 'Link not found' }, 404);
    return json({ label: t.label, dayLabel: t.day_label, dayDate: t.day_date, updatedAt: t.updated_at, game: JSON.parse(t.rounds) });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
}
