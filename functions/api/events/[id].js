import { json } from '../../_auth.js';
import { ensureEventTables, expireNow, loadEvents, goingOf, publicEvent, waitingBySession } from '../../_events.js';

// GET /api/events/:id : one published event, its sessions, and who is coming (when the admin shows it). Public.
export async function onRequestGet({ env, params }) {
  try {
    await ensureEventTables(env);
    await expireNow(env);
    const e = (await loadEvents(env, "id = ? AND status = 'published'", [String(params.id)]))[0];
    if (!e) return json({ error: 'This event was not found.' }, 404);
    const out = publicEvent(e, Date.now());
    if (e.showGoing) out.going = await goingOf(env, e.id);
    const w = await waitingBySession(env, e.id);
    out.sessions.forEach(function (s) { s.waiting = w[s.id] || 0; });
    return json(out);
  } catch (err) {
    return json({ error: 'Can’t load this event right now.' }, 500);
  }
}
