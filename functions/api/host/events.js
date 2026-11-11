import { respond, requireHost } from '../../_hostauth.js';
import { listEvents, saveEvent } from '../../_eventsadmin.js';

// GET: the events this person manages (admin: all; host: the ones they host). POST: make (admin only) or change an event. Host login: only the events this host was made host of.
export async function onRequestGet({ request, env, params }) {
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    const actor = { host: g.host };
    const r = await listEvents(env, actor);
    return respond(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}

export async function onRequestPost({ request, env, params }) {
  let BODY;
  try { BODY = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
  try {
    const g = await requireHost(request, env); if (g.res) return g.res;
    const actor = { host: g.host };
    const r = await saveEvent(env, actor, BODY);
    return respond(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}

