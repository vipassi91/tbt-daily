import { respond, requireHost } from '../../../_hostauth.js';
import { bookingAction } from '../../../_eventsadmin.js';

// POST { action }: confirm, notfound, remove, removePlayer, refunded. Host login: only the events this host was made host of.
export async function onRequestPost({ request, env, params }) {
  let BODY;
  try { BODY = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    const actor = { host: g.host };
    const r = await bookingAction(env, actor, params.id, BODY);
    return respond(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}

