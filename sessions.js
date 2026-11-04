import { respond, requireHost, takeDaily, giveBackDaily, randomHex } from '../../_hostauth.js';
import { cleanText } from '../../_players.js';

export function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = new Date(s + 'T00:00:00Z');
  return !isNaN(t) && t.toISOString().slice(0, 10) === s && +s.slice(0, 4) >= 2020 && +s.slice(0, 4) <= 2100;
}
// POST /api/host/sessions { label, date }: a session for any date, owned by the host.
export async function onRequestPost({ request, env }) {
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    const h = g.host;
    let b; try { b = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
    const label = cleanText(b && b.label, 40), date = String((b && b.date) || '');
    if (!label) return respond({ error: 'Give the session a name.' }, 400);
    if (!validDate(date)) return respond({ error: 'Pick a date.' }, 400);
    if (!(await takeDaily(env, h.id, 'sessions'))) return respond({ error: 'You have made 10 sessions today. You can make more tomorrow.' }, 429);
    const id = 'day-' + Date.now() + '-' + randomHex(2);
    try {
      await env.DB.prepare('INSERT INTO days (id, label, date, created_at, created_by) VALUES (?,?,?,?,?)').bind(id, label, date, new Date().toISOString(), h.id).run();
    } catch (e) { await giveBackDaily(env, h.id, 'sessions'); throw e; }
    return respond({ ok: true, id: id });
  } catch (err) {
    return respond({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
