import { respond, requireHost } from '../../../_hostauth.js';

// DELETE /api/host/tables/:id: only an own table with no hands recorded. Scores are never deleted by a host.
export async function onRequestDelete({ request, env, params }) {
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    const t = await env.DB.prepare('SELECT id, stats FROM tables WHERE id=? AND created_by=?').bind(params.id, g.host.id).first();
    if (!t) return respond({ error: 'Table not found' }, 404);
    let hands = 0, locked = false;
    try { const s = JSON.parse(t.stats || '{}'); hands = s.events || s.hands || 0; locked = !!s.locked; } catch (e) { hands = 1; }
    if (hands > 0 || locked) return respond({ error: 'This table has scores. Ask the admin to delete it.' }, 409);
    await env.DB.prepare('DELETE FROM tables WHERE id=?').bind(t.id).run();
    try { await env.DB.prepare('DELETE FROM registry_seats WHERE table_id=?').bind(t.id).run(); } catch (e) { /* no per game assignment yet */ }
    return respond({ ok: true });
  } catch (err) {
    return respond({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
