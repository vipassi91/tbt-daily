import { isAdmin, json, unauthorized } from '../../../_auth.js';
import { cleanText } from '../../../_players.js';
import { ensureEventTables, expireNow, bookingView, nowIso, ACTIVE, HOLD_MINUTES } from '../../../_events.js';

// POST /api/admin/bookings/:id { action, ... } : what the admin does with one booking. Answers the booking as it is now.
//   confirm                    the money is in (or: confirm anyway / paid at the venue)
//   notfound                   the transfer is not in the bank: seats held 2 more hours, the booker can mark it again
//   remove { reason, refund }  the whole booking is cancelled; its seats go back; refund notes what was paid
//   removePlayer { player, refund }  one player out; their seats go back; refund notes what that player cost
//   refunded                   the refund was sent
export async function onRequestPost({ request, env, params }) {
  if (!isAdmin(request, env)) return unauthorized();
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    await ensureEventTables(env);
    await expireNow(env);
    const b = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(String(params.id)).first();
    if (!b) return json({ error: 'This booking was not found.' }, 404);
    const v = await bookingView(env, b, true);
    const active = ACTIVE.indexOf(b.status) >= 0, at = nowIso(), a = body && body.action;
    // what has been paid so far: a confirmed transfer (or one the booker says is sent), or a venue booking marked paid
    const paidNow = b.paid_amount || ((b.status === 'confirmed' || b.status === 'review') ? (b.pay === 'transfer' ? v.total + b.code : v.total) : 0);

    if (a === 'confirm') {
      if (['held', 'review', 'rejected', 'venue'].indexOf(b.status) < 0) return json({ error: 'This booking cannot be confirmed now.' }, 409);
      await env.DB.prepare("UPDATE bookings SET status = 'confirmed', confirmed_at = ?, hold_until = NULL WHERE id = ?").bind(at, b.id).run();
    } else if (a === 'notfound') {
      if (b.status !== 'review') return json({ error: 'Only a booking marked as transferred can be marked not found.' }, 409);
      await env.DB.prepare("UPDATE bookings SET status = 'rejected', hold_until = ? WHERE id = ?").bind(new Date(Date.now() + HOLD_MINUTES * 60e3).toISOString(), b.id).run();
    } else if (a === 'remove') {
      if (!active) return json({ error: 'This booking is not active.' }, 409);
      // what is still paid for: the players left in the booking (a player taken out earlier had their own part refunded)
      const refund = body.refund && paidNow ? v.total + (b.pay === 'transfer' ? b.code : 0) : 0;
      await env.DB.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ?, reason = ?, refund = refund + ? WHERE id = ?").bind(at, cleanText(body.reason, 60) || 'Removed by the admin', refund, b.id).run();
    } else if (a === 'removePlayer') {
      if (!active) return json({ error: 'This booking is not active.' }, 409);
      const p = v.players.filter(function (x) { return x.id === String(body.player || ''); })[0];
      if (!p) return json({ error: 'This player was not found in the booking.' }, 404);
      if (v.players.length < 2) return json({ error: 'This is the only player. Remove the whole booking instead.' }, 409);
      const prices = {}; v.event.sessions.forEach(function (s) { prices[s.id] = s.price; });
      const cost = p.sessions.reduce(function (t, id) { return t + (prices[id] || 0); }, 0);
      const removed = v.removed.concat(p.name);
      const stmts = [env.DB.prepare('DELETE FROM booking_seats WHERE booking_id = ? AND player_id = ?').bind(b.id, p.id)];
      if (paidNow) {
        // already paid: what they paid stays on record, and the player's part may be refunded
        stmts.push(env.DB.prepare('UPDATE bookings SET paid_amount = ?, refund = refund + ?, removed = ?, amount = ? WHERE id = ?').bind(paidNow, body.refund ? cost : 0, JSON.stringify(removed), v.total - cost, b.id));
      } else {
        // not paid yet: the amount to transfer simply becomes smaller (same unique code)
        stmts.push(env.DB.prepare('UPDATE bookings SET removed = ?, amount = ? WHERE id = ?').bind(JSON.stringify(removed), v.total - cost, b.id));
      }
      await env.DB.batch(stmts);
    } else if (a === 'refunded') {
      await env.DB.prepare('UPDATE bookings SET refund = 0 WHERE id = ?').bind(b.id).run();
    } else {
      return json({ error: 'Unknown action' }, 400);
    }
    const fresh = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(b.id).first();
    return json(await bookingView(env, fresh, true));
  } catch (err) {
    return json({ error: 'Something went wrong: ' + String(err) }, 500);
  }
}
