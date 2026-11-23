import { isAdmin, json, unauthorized } from '../../../_auth.js';
import { waitAction } from '../../../_eventsadmin.js';

// POST { action: 'offered' | 'waiting' | 'remove' }: one entry of an event's waiting list. Admin password.
export async function onRequestPost({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  let b; try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try { const r = await waitAction(env, { admin: true }, params.id, b); return json(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200); }
  catch (err) { return json({ error: 'Something went wrong: ' + String(err) }, 500); }
}
