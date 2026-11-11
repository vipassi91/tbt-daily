import { isAdmin, json, unauthorized } from '../../../_auth.js';
import { bookingAction } from '../../../_eventsadmin.js';

// POST { action }: confirm, notfound, remove, removePlayer, refunded. Admin password.
export async function onRequestPost({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  let BODY;
  try { BODY = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    const r = await bookingAction(env, { admin: true }, params.id, BODY);
    return json(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return json({ error: 'Something went wrong: ' + String(err) }, 500); }
}

