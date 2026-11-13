import { isAdmin, json, unauthorized } from '../../../_auth.js';
import { getEvent, addBooking, deleteEvent } from '../../../_eventsadmin.js';

// GET: one event with every booking. POST: a booking added by hand (WhatsApp, Instagram DM, walk-in). DELETE: the event, when nothing is active. Admin password.
export async function onRequestGet({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const r = await getEvent(env, { admin: true }, params.id);
    return json(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return json({ error: 'Something went wrong: ' + String(err) }, 500); }
}

export async function onRequestPost({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  let BODY;
  try { BODY = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    const r = await addBooking(env, { admin: true }, params.id, BODY);
    return json(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return json({ error: 'Something went wrong: ' + String(err) }, 500); }
}

export async function onRequestDelete({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    const r = await deleteEvent(env, { admin: true }, params.id);
    return json(r.error ? { error: r.error } : r, r.error ? (r.status || 400) : 200);
  } catch (err) { return json({ error: 'Something went wrong: ' + String(err) }, 500); }
}
