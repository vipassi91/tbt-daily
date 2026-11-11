import { json } from '../_auth.js';
import { ensureEventTables, expireNow, loadEvents, lastEnd, publicEvent } from '../_events.js';

// GET /api/events?scope=upcoming|past : published events with their sessions and seats left (public).
// Upcoming = not finished yet; past = finished, newest first (the last 30).
export async function onRequestGet({ request, env }) {
  try {
    await ensureEventTables(env);
    await expireNow(env);
    const scope = new URL(request.url).searchParams.get('scope') === 'past' ? 'past' : 'upcoming';
    const now = Date.now();
    let list = (await loadEvents(env, "status = 'published'", [])).filter(function (e) { return e.sessions.length; });
    list = scope === 'past' ? list.filter(function (e) { return lastEnd(e) <= now; }).reverse().slice(0, 30) : list.filter(function (e) { return lastEnd(e) > now; });
    return json({ events: list.map(function (e) { return publicEvent(e, now); }) });
  } catch (err) {
    return json({ error: 'Can’t load events right now.' }, 500);
  }
}

