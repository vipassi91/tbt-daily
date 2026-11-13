import { isAdmin, json, unauthorized } from '../../../../_auth.js';
import { getEventDay, makeEventDay } from '../../../../_eventsadmin.js';

// Event day. GET ?session=<id>: the booked players of a session and the tables made for it. POST: make tables. Admin password.
export async function onRequestGet({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const r = await getEventDay(env, { admin: true }, params.id, new URL(request.url).searchParams.get('session') || '');
    return json(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return json({ error: 'Something went wrong: ' + String(err) }, 500); }
}
export async function onRequestPost({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  let BODY;
  try { BODY = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    const r = await makeEventDay(env, { admin: true }, params.id, BODY);
    return json(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return json({ error: 'Something went wrong: ' + String(err) }, 500); }
}
