import { respond, requireHost, takeDaily, giveBackDaily, LIMITS } from '../../_hostauth.js';
import { createTableRow } from '../../_tables.js';

// POST /api/host/tables { day_id, label, players? }: a table in one of the host's own sessions, with its two codes.
export async function onRequestPost({ request, env }) {
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    const h = g.host;
    let b; try { b = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
    const label = String((b && b.label) || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    if (!label) return respond({ error: 'A table name is required' }, 400);
    const day = await env.DB.prepare('SELECT id, date FROM days WHERE id=? AND created_by=?').bind(String((b && b.day_id) || ''), h.id).first();
    if (!day) return respond({ error: 'Session not found' }, 404);
    if (!(await takeDaily(env, h.id, 'tables'))) return respond({ error: 'You have made ' + LIMITS.tablesPerDay + ' tables today. You can make more tomorrow.' }, 429);
    let made;
    try { made = await createTableRow(env, day, label, b.players, h.id); } catch (e) { await giveBackDaily(env, h.id, 'tables'); throw e; }
    return respond({ ok: true, id: made.id, code: made.code, view_code: made.view_code });
  } catch (err) {
    return respond({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
