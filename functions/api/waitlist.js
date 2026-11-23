import { json } from '../_auth.js';
import { ipHash, cleanText, normWhatsapp } from '../_players.js';
import { ensureEventTables, expireNow, loadEvents, bookingOpen, randomId, nowIso, LEVELS } from '../_events.js';

const RATE_PER_HOUR = 6;
// POST /api/waitlist { event, session, name, wa, level, seats (1 to 4), note, consent, website }
// Public. Puts someone on the waiting list of a full session. Nothing is held or paid: the admin or a host
// messages them on WhatsApp when a seat opens and adds the booking. Answers { position } (their place in the line).
export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    await ensureEventTables(env);
    if (b && b.website) return json({ error: 'Could not join.' }, 400);              // the hidden field only a bot fills in
    if (!b || b.consent !== true) return json({ error: 'Please tick the consent box first.' }, 400);
    await expireNow(env);
    const ev = (await loadEvents(env, "id = ? AND status = 'published'", [String(b.event || '')]))[0];
    if (!ev) return json({ error: 'This event was not found.' }, 404);
    const s = ev.sessions.filter(function (x) { return x.id === String(b.session || ''); })[0];
    if (!s) return json({ error: 'This session was not found.' }, 404);
    if (!bookingOpen(ev, s, Date.now())) return json({ error: 'Booking for this session has closed.' }, 409);
    if (s.seats - s.taken > 0) return json({ error: 'There are seats left in this session: you can book now.', seatsLeft: true }, 409);
    const name = cleanText(b.name, 40), wa = normWhatsapp(b.wa), level = LEVELS.indexOf(b.level) >= 0 ? b.level : '';
    const seats = Math.min(4, Math.max(1, Math.round(Number(b.seats) || 1))), note = cleanText(b.note, 200);
    if (!name) return json({ error: 'Your name is required.' }, 400);
    if (!wa) return json({ error: 'A WhatsApp number is required, so we can tell you when a seat opens.' }, 400);
    const line = function () { return env.DB.prepare("SELECT id, wa, created_at FROM event_waitlist WHERE session_id = ? AND status IN ('waiting','offered') ORDER BY created_at").bind(s.id).all(); };
    let list = (await line()).results;
    const mine = list.filter(function (x) { return x.wa === wa; })[0];
    if (mine) return json({ ok: true, already: true, position: list.indexOf(mine) + 1 });
    const hash = await ipHash(request, 'waitlist');
    const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM event_waitlist WHERE ip_hash = ? AND created_at > ?').bind(hash, new Date(Date.now() - 3600e3).toISOString()).first();
    if (recent && recent.n >= RATE_PER_HOUR) return json({ error: 'Too many requests from this device. Please try again later or message the admin.' }, 429);
    const id = randomId('wl');
    await env.DB.prepare("INSERT INTO event_waitlist (id, event_id, session_id, name, wa, level, seats, note, status, ip_hash, created_at) VALUES (?,?,?,?,?,?,?,?,'waiting',?,?)")
      .bind(id, ev.id, s.id, name, wa, level, seats, note || null, hash, nowIso()).run();
    list = (await line()).results;
    return json({ ok: true, position: list.findIndex(function (x) { return x.id === id; }) + 1 });
  } catch (err) {
    return json({ error: 'Could not join the waiting list. Please try again.' }, 500);
  }
}
