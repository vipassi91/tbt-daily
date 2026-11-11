import { json } from '../_auth.js';
import { ipHash } from '../_players.js';
import { ensureEventTables, expireStmt, loadEvents, bookingOpen, cleanPlayers, registryByWa, pickCode, randomId, randomToken, newRef, nowIso, HOLD_MINUTES } from '../_events.js';

const RATE_PER_HOUR = 8;

// POST /api/book { event, players: [{ name, wa, ig, level, sessions: [ids] }], pay: 'transfer'|'venue', consent, website }
// Public. Makes a booking and answers { token } (the private key to the booking page /b/<token>).
// Seats are taken in one database transaction that re-counts each session, so two people can never take the last seat.
export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    await ensureEventTables(env);
    if (b && b.website) return json({ error: 'Could not book.' }, 400);              // a hidden field only a bot fills in
    if (!b || b.consent !== true) return json({ error: 'Please tick the consent box first.' }, 400);
    await expireStmt(env).run();
    const ev = (await loadEvents(env, "id = ? AND status = 'published'", [String(b.event || '')]))[0];
    if (!ev) return json({ error: 'This event was not found.' }, 404);
    const now = Date.now(), byId = {};
    ev.sessions.forEach(function (s) { byId[s.id] = s; });
    const c = cleanPlayers(b.players, byId);
    if (c.error) return json({ error: c.error }, 400);
    const players = c.players;
    for (const p of players) for (const id of p.sessions) {
      if (!bookingOpen(ev, byId[id], now)) return json({ error: 'Booking for the ' + byId[id].start.slice(11) + ' session has closed.' }, 409);
    }
    // seats asked per session, against what is left (checked again inside the transaction)
    const want = {};
    players.forEach(function (p) { p.sessions.forEach(function (id) { want[id] = (want[id] || 0) + 1; }); });
    for (const id in want) {
      const s = byId[id], left = s.seats - s.taken;
      if (want[id] > left) return json({ error: left <= 0 ? 'The ' + s.start.slice(11) + ' session is full.' : 'Only ' + left + ' seat' + (left === 1 ? '' : 's') + ' left in the ' + s.start.slice(11) + ' session.' }, 409);
    }
    const total = players.reduce(function (t, p) { return t + p.sessions.reduce(function (u, id) { return u + byId[id].price; }, 0); }, 0);

    // how it is paid
    const reg = await registryByWa(env, players.map(function (p) { return p.wa; }));
    let pay = b.pay === 'venue' ? 'venue' : 'transfer';
    if (total === 0) pay = 'free';
    if (pay === 'venue') {
      if (!ev.venuePay) return json({ error: 'This event is paid by transfer.' }, 400);
      const not = players.filter(function (p) { return !reg[p.wa]; });
      if (not.length) {
        const names = not.map(function (p) { return p.name; });
        return json({ error: 'Paying at the venue is only when everyone in the booking is a registered TBT player. ' + (players.length === 1 ? 'This number is not registered yet' : names.join(', ') + (names.length === 1 ? ' is' : ' are') + ' not registered yet') + ', so please choose Bank transfer.' }, 400);
      }
    }

    const hash = await ipHash(request, 'booking');
    const since = new Date(now - 3600e3).toISOString();
    const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM bookings WHERE ip_hash = ? AND created_at > ?').bind(hash, since).first();
    if (recent && recent.n >= RATE_PER_HOUR) return json({ error: 'Too many bookings from this device. Please try again later or message the admin.' }, 429);

    const code = pay === 'transfer' ? await pickCode(env, ev.id, total) : 0;
    if (pay === 'transfer' && !code) return json({ error: 'Too many bookings are waiting for payment right now. Please try again in a while.' }, 429);
    const id = randomId('bk'), token = randomToken(), ref = newRef(), at = nowIso();
    const status = pay === 'transfer' ? 'held' : (pay === 'venue' ? 'venue' : 'confirmed');
    const hold = pay === 'transfer' ? new Date(now + HOLD_MINUTES * 60e3).toISOString() : null;

    const stmts = [expireStmt(env), env.DB.prepare('INSERT INTO bookings (id, event_id, token, ref, status, pay, amount, code, hold_until, confirmed_at, ip_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, ev.id, token, ref, status, pay, total, code, hold, status === 'confirmed' ? at : null, hash, at)];
    const seatIdx = [];
    players.forEach(function (p, i) {
      const pid = randomId('bp');
      stmts.push(env.DB.prepare('INSERT INTO booking_players (id, booking_id, position, name, wa, ig, level, registry_id) VALUES (?,?,?,?,?,?,?,?)').bind(pid, id, i, p.name, p.wa, p.ig || null, p.level, reg[p.wa] || null));
      p.sessions.forEach(function (sid) {
        seatIdx.push(stmts.length);
        // the seat is only written while the session still has room, counting every active booking (this one included)
        stmts.push(env.DB.prepare("INSERT INTO booking_seats (booking_id, player_id, session_id) SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM booking_seats s JOIN bookings k ON k.id = s.booking_id WHERE s.session_id = ? AND k.status IN ('held','review','rejected','confirmed','venue')) < (SELECT seats FROM event_sessions WHERE id = ?)")
          .bind(id, pid, sid, sid, sid));
      });
    });
    const res = await env.DB.batch(stmts);
    const lost = seatIdx.some(function (i) { return !res[i] || !res[i].meta || res[i].meta.changes !== 1; });
    if (lost) {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM booking_seats WHERE booking_id = ?').bind(id),
        env.DB.prepare('DELETE FROM booking_players WHERE booking_id = ?').bind(id),
        env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id)
      ]);
      return json({ error: 'Someone just took the last seat. Please check the sessions again.' }, 409);
    }
    return json({ ok: true, token: token, status: status });
  } catch (err) {
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
