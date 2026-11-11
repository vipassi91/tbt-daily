import { isAdmin, json, unauthorized } from '../../../_auth.js';
import { ensureEventTables, expireNow, loadEvents, eventBookings, goingOf } from '../../../_events.js';

// GET /api/admin/events/:id : the event (any status) with every booking in full: players, numbers, Instagram, levels,
// sessions, amounts and notes. Admin only.
export async function onRequestGet({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    await ensureEventTables(env);
    await expireNow(env);
    const ev = (await loadEvents(env, 'id = ?', [String(params.id)]))[0];
    if (!ev) return json({ error: 'This event was not found.' }, 404);
    ev.bookingList = await eventBookings(env, ev);
    ev.going = await goingOf(env, ev.id);
    return json(ev);
  } catch (err) {
    return json({ error: 'Can’t load this event: ' + String(err) }, 500);
  }
}
