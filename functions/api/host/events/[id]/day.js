import { respond, requireHost } from '../../../../_hostauth.js';
import { getEventDay, makeEventDay } from '../../../../_eventsadmin.js';

// Event day for a host of this event. These tables do not count toward the host's daily table limit.
export async function onRequestGet({ request, env, params }) {
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    const r = await getEventDay(env, { host: g.host }, params.id, new URL(request.url).searchParams.get('session') || '');
    return respond(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}
export async function onRequestPost({ request, env, params }) {
  let BODY;
  try { BODY = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    const r = await makeEventDay(env, { host: g.host }, params.id, BODY);
    return respond(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}
