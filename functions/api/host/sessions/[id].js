import { respond, requireHost } from '../../../_hostauth.js';
import { cleanText } from '../../../_players.js';

async function own(env, id, host) { return env.DB.prepare('SELECT id FROM days WHERE id=? AND created_by=?').bind(id, host.id).first(); }
// PATCH /api/host/sessions/:id { label }: rename one of the host's own sessions.
export async function onRequestPatch({ request, env, params }) {
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    if (!(await own(env, params.id, g.host))) return respond({ error: 'Session not found' }, 404);
    let b; try { b = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
    const label = cleanText(b && b.label, 40); if (!label) return respond({ error: 'Give the session a name.' }, 400);
    await env.DB.prepare('UPDATE days SET label=? WHERE id=?').bind(label, params.id).run();
    return respond({ ok: true });
  } catch (err) {
    return respond({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
// DELETE /api/host/sessions/:id: only an own session that has no tables at all.
export async function onRequestDelete({ request, env, params }) {
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    if (!(await own(env, params.id, g.host))) return respond({ error: 'Session not found' }, 404);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM tables WHERE day_id=?').bind(params.id).first();
    if (n.n > 0) return respond({ error: 'This session still has tables. Delete them first, or ask the admin.' }, 409);
    await env.DB.prepare('DELETE FROM days WHERE id=?').bind(params.id).run();
    return respond({ ok: true });
  } catch (err) {
    return respond({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
