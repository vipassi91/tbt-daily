import { isAdmin, json, unauthorized } from '../../_auth.js';
import { listEvents, saveEvent } from '../../_eventsadmin.js';

// GET: the events this person manages (admin: all; host: the ones they host). POST: make (admin only) or change an event. Admin password.
export async function onRequestGet({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const r = await listEvents(env, { admin: true });
    return json(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return json({ error: 'Something went wrong: ' + String(err) }, 500); }
}

export async function onRequestPost({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  let BODY;
  try { BODY = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    const r = await saveEvent(env, { admin: true }, BODY);
    return json(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return json({ error: 'Something went wrong: ' + String(err) }, 500); }
}

