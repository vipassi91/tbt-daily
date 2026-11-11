import { json } from '../../_auth.js';
import { ensureEventTables, expireNow, bookingView, nowIso, CANCEL_HOURS } from '../../_events.js';

// The booking page (/b/<token>). The token is the only key: whoever has the link sees this one booking, and nothing else.
// GET  /api/booking/:token -> the booking (names, levels, sessions, what to transfer; no phone numbers)
// POST /api/booking/:token { action: 'transferred' } -> the booker says the transfer is done (the admin checks the bank)
// POST /api/booking/:token { action: 'cancel' }      -> the booker cancels, up to 24 hours before their first session
async function find(env, token) {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(String(token || ''))) return null;
  return env.DB.prepare('SELECT * FROM bookings WHERE token = ?').bind(String(token)).first();
}

export async function onRequestGet({ env, params }) {
  try {
    await ensureEventTables(env);
    await expireNow(env);
    const b = await find(env, params.token);
    if (!b) return json({ error: 'This booking link does not work. Check the link in your WhatsApp, or message the admin.' }, 404);
    return json(await bookingView(env, b, false));
  } catch (err) {
    return json({ error: 'Can’t load this booking right now.' }, 500);
  }
}

export async function onRequestPost({ request, env, params }) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    await ensureEventTables(env);
    await expireNow(env);
    const b = await find(env, params.token);
    if (!b) return json({ error: 'This booking link does not work.' }, 404);
    const action = body && body.action;
    if (action === 'transferred') {
      if (b.pay !== 'transfer') return json({ error: 'This booking is not paid by transfer.' }, 400);
      if (b.status === 'expired') return json({ error: 'This booking expired before the transfer was marked, so its seats went back. Please book again, or message the admin if you already transferred.' }, 409);
      if (b.status !== 'held' && b.status !== 'rejected') return json(await bookingView(env, b, false));   // already marked or confirmed: nothing to do
      await env.DB.prepare("UPDATE bookings SET status = 'review', marked_at = ?, hold_until = NULL WHERE id = ? AND status IN ('held','rejected')").bind(nowIso(), b.id).run();
    } else if (action === 'cancel') {
      const v = await bookingView(env, b, false);
      if (!v.canCancel) return json({ error: 'This booking can no longer be cancelled here (up to ' + CANCEL_HOURS + ' hours before the session). Please message the admin.' }, 409);
      const paid = (b.status === 'confirmed' || b.status === 'review') && b.pay === 'transfer';
      await env.DB.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ?, reason = 'Cancelled by the booker', refund = refund + ? WHERE id = ?").bind(nowIso(), paid ? v.total + b.code : 0, b.id).run();
    } else {
      return json({ error: 'Unknown action' }, 400);
    }
    const fresh = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(b.id).first();
    return json(await bookingView(env, fresh, false));
  } catch (err) {
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
