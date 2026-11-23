import { respond, requireHost } from '../../../_hostauth.js';
import { waitAction } from '../../../_eventsadmin.js';

// POST { action: 'offered' | 'waiting' | 'remove' }: one entry of the waiting list of an event this host runs.
export async function onRequestPost({ request, env, params }) {
  let b; try { b = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    const r = await waitAction(env, { host: g.host }, params.id, b);
    return respond(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}
