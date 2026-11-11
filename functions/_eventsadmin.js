import { cleanText, normWhatsapp, normInstagram } from './_players.js';
import { ensureEventTables, expireNow, loadEvents, takenBySession, cleanBanks, validStart, randomId, randomToken, newRef, nowIso, pickCode, registryByWa, eventBookings, goingOf, bookingView,
  TYPES, MODES, LEVELS, ACTIVE, HOLD_MINUTES, MAX_PLAYERS } from './_events.js';

// Managing events, for the admin (every event) and for hosts (only the events the admin made them host of).
// The admin pages call /api/admin/... with the admin password; a host's browser calls /api/host/... with the host login.
// Both end up here with an "actor": { admin: true } or { host: { id, nickname } }.
// A host may do everything the admin does for their events, except choose the hosts and make new events.

export function mayManage(actor, ev) { return !!(actor.admin || (actor.host && ev && (ev.hosts || []).indexOf(actor.host.id) >= 0)); }
const NOT_YOURS = { error: 'You are not a host of this event.', status: 403 };

// ---- list ----
export async function listEvents(env, actor) {
  await ensureEventTables(env);
  await expireNow(env);
  let list = await loadEvents(env, '', []);
  if (!actor.admin) list = list.filter(function (e) { return mayManage(actor, e); });
  const counts = await env.DB.prepare('SELECT event_id, status, COUNT(*) AS n FROM bookings GROUP BY event_id, status').all();
  const by = {};
  counts.results.forEach(function (r) { (by[r.event_id] = by[r.event_id] || {})[r.status] = r.n; });
  const refunds = await env.DB.prepare('SELECT event_id, COUNT(*) AS n FROM bookings WHERE refund > 0 GROUP BY event_id').all();
  const rf = {}; refunds.results.forEach(function (r) { rf[r.event_id] = r.n; });
  list.forEach(function (e) { e.bookings = by[e.id] || {}; e.refunds = rf[e.id] || 0; });
  list.sort(function (a, b) { return b.sessions.length && a.sessions.length ? b.sessions[0].start.localeCompare(a.sessions[0].start) : 0; });
  const out = { events: list, role: actor.admin ? 'admin' : 'host', me: actor.host ? actor.host.nickname : '' };
  if (actor.admin) {
    // what a new event starts from: the bank accounts and contact of the latest one
    const last = list.slice().sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); })[0];
    out.defaults = last ? { banks: last.banks, contactWa: last.contactWa, place: last.place } : { banks: [], contactWa: '', place: '' };
    out.hostOptions = await hostOptions(env);
  }
  return out;
}
// players who have a host account (made on the Players page)
async function hostOptions(env) {
  try {
    const r = await env.DB.prepare('SELECT h.registry_id AS id, r.nickname FROM registry_hosts h JOIN registry r ON r.id = h.registry_id').all();
    return r.results.sort(function (a, b) { return a.nickname.toLowerCase() < b.nickname.toLowerCase() ? -1 : 1; });
  } catch (e) { return []; }
}

// ---- one event with every booking ----
export async function getEvent(env, actor, id) {
  await ensureEventTables(env);
  await expireNow(env);
  const ev = (await loadEvents(env, 'id = ?', [String(id)]))[0];
  if (!ev) return { error: 'This event was not found.', status: 404 };
  if (!mayManage(actor, ev)) return NOT_YOURS;
  ev.bookingList = await eventBookings(env, ev);
  ev.going = await goingOf(env, ev.id);
  // the player list, for adding a booking by hand: names only (the number and Instagram are filled in by the server)
  try {
    const r = await env.DB.prepare('SELECT id, nickname, full_name FROM registry').all();
    ev.registry = r.results.map(function (x) { return { id: x.id, nickname: x.nickname, fullName: x.full_name || '' }; });
  } catch (e) { ev.registry = []; }
  if (actor.admin) ev.hostOptions = await hostOptions(env);
  ev.role = actor.admin ? 'admin' : 'host';
  return ev;
}

// ---- make or change an event ----
export async function saveEvent(env, actor, b) {
  await ensureEventTables(env);
  await expireNow(env);
  if (!b.id && !actor.admin) return { error: 'Only the admin makes new events.', status: 403 };
  const type = TYPES.indexOf(b.type) >= 0 ? b.type : 'other';
  const title = cleanText(b.title, 80);
  if (title.length < 3) return { error: 'Give the event a title.', status: 400 };
  const status = ['draft', 'published'].indexOf(b.status) >= 0 ? b.status : 'draft';
  const contact = b.contactWa ? normWhatsapp(b.contactWa) : '';
  if (contact === null) return { error: 'The contact WhatsApp number is not valid.', status: 400 };
  const banks = cleanBanks(b.banks);
  const closeHours = Math.max(0, Math.min(72, Number(b.closeHours) || 0));
  const raw = Array.isArray(b.sessions) ? b.sessions.slice(0, 20) : [];
  if (!raw.length) return { error: 'Add at least one session.', status: 400 };
  const sessions = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i] || {}, n = 'Session ' + (i + 1);
    const start = String(s.start || '');
    if (!validStart(start)) return { error: n + ': pick a date and a start time.', status: 400 };
    const hours = Math.round((Number(s.hours) || 0) * 4) / 4;
    if (hours <= 0 || hours > 24) return { error: n + ': the length is not right.', status: 400 };
    const seats = Math.floor(Number(s.seats));
    if (!(seats >= 1 && seats <= 400)) return { error: n + ': seats must be between 1 and 400.', status: 400 };
    if (b.fours && seats % 4) return { error: n + ': with "Seats in fours" on, seats must be a multiple of 4.', status: 400 };
    const price = Math.floor(Number(s.price) || 0);
    if (price < 0 || price > 100000000) return { error: n + ': the price is not right.', status: 400 };
    const levels = (Array.isArray(s.levels) ? s.levels : []).filter(function (l) { return LEVELS.indexOf(l) >= 0; });
    if (Array.isArray(s.levels) && !levels.length) return { error: n + ': pick at least one level.', status: 400 };
    const mode = MODES.indexOf(s.mode) >= 0 ? s.mode : 'default';
    sessions.push({ id: s.id ? String(s.id) : '', start: start, hours: hours, seats: seats, price: price, levels: levels.length === LEVELS.length ? [] : levels, mode: mode });
  }
  if (status === 'published' && sessions.some(function (s) { return s.price > 0; }) && !banks.length && !b.venuePay) return { error: 'Add a bank account so people can transfer.', status: 400 };

  const at = nowIso(), id = b.id ? String(b.id) : randomId('ev'), stmts = [];
  const place = cleanText(b.place, 120), about = String(b.about || '').trim().slice(0, 2000);
  if (b.id) {
    const cur = (await loadEvents(env, 'id = ?', [id]))[0];
    if (!cur) return { error: 'This event was not found.', status: 404 };
    if (!mayManage(actor, cur)) return NOT_YOURS;
    const taken = await takenBySession(env, cur.sessions.map(function (s) { return s.id; }));
    const keep = {}; sessions.forEach(function (s) { if (s.id) keep[s.id] = s; });
    for (const s of cur.sessions) {
      if (!keep[s.id] && taken[s.id]) return { error: 'The session on ' + s.start.replace('T', ' ') + ' has ' + taken[s.id] + ' booked seat' + (taken[s.id] === 1 ? '' : 's') + ', so it cannot be removed. Remove those bookings first.', status: 409 };
      if (keep[s.id] && keep[s.id].seats < (taken[s.id] || 0)) return { error: 'The session on ' + s.start.replace('T', ' ') + ' already has ' + taken[s.id] + ' booked seats, more than ' + keep[s.id].seats + '.', status: 409 };
    }
    const known = {}; cur.sessions.forEach(function (s) { known[s.id] = 1; });
    if (sessions.some(function (s) { return s.id && !known[s.id]; })) return { error: 'A session was not found. Reload the page.', status: 409 };
    // only the admin chooses the hosts; a host saving the event keeps the list as it is
    const hosts = actor.admin && Array.isArray(b.hosts) ? await cleanHosts(env, b.hosts) : cur.hosts;
    stmts.push(env.DB.prepare('UPDATE events SET type=?, title=?, place=?, about=?, contact_wa=?, banks=?, venue_pay=?, fours=?, show_going=?, close_hours=?, status=?, hosts=?, updated_at=? WHERE id=?')
      .bind(type, title, place, about, contact || null, JSON.stringify(banks), b.venuePay ? 1 : 0, b.fours ? 1 : 0, b.showGoing ? 1 : 0, closeHours, status, JSON.stringify(hosts), at, id));
    cur.sessions.forEach(function (s) { if (!keep[s.id]) stmts.push(env.DB.prepare('DELETE FROM event_sessions WHERE id = ?').bind(s.id)); });
  } else {
    const hosts = Array.isArray(b.hosts) ? await cleanHosts(env, b.hosts) : [];
    stmts.push(env.DB.prepare('INSERT INTO events (id, type, title, place, about, contact_wa, banks, venue_pay, fours, show_going, close_hours, status, hosts, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, type, title, place, about, contact || null, JSON.stringify(banks), b.venuePay ? 1 : 0, b.fours ? 1 : 0, b.showGoing ? 1 : 0, closeHours, status, JSON.stringify(hosts), at, at));
  }
  sessions.forEach(function (s, i) {
    if (s.id) stmts.push(env.DB.prepare('UPDATE event_sessions SET position=?, start=?, hours=?, seats=?, price=?, levels=?, mode=? WHERE id=? AND event_id=?').bind(i, s.start, s.hours, s.seats, s.price, JSON.stringify(s.levels), s.mode, s.id, id));
    else stmts.push(env.DB.prepare('INSERT INTO event_sessions (id, event_id, position, start, hours, seats, price, levels, mode) VALUES (?,?,?,?,?,?,?,?,?)').bind(randomId('es'), id, i, s.start, s.hours, s.seats, s.price, JSON.stringify(s.levels), s.mode));
  });
  await env.DB.batch(stmts);
  return { ok: true, id: id };
}
async function cleanHosts(env, ids) {
  const opts = await hostOptions(env), ok = {};
  opts.forEach(function (h) { ok[h.id] = 1; });
  return ids.map(String).filter(function (x, i, a) { return ok[x] && a.indexOf(x) === i; }).slice(0, 20);
}

// ---- what is done with one booking ----
export async function bookingAction(env, actor, bookingId, body) {
  await ensureEventTables(env);
  await expireNow(env);
  const b = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(String(bookingId)).first();
  if (!b) return { error: 'This booking was not found.', status: 404 };
  const ev = (await loadEvents(env, 'id = ?', [b.event_id]))[0];
  if (!mayManage(actor, ev)) return NOT_YOURS;
  const v = await bookingView(env, b, true);
  const active = ACTIVE.indexOf(b.status) >= 0, at = nowIso(), a = body && body.action;
  // what has been paid so far: a confirmed transfer (or one the booker says is sent), a venue booking marked paid, or what was written when it was added by hand
  const paidNow = b.paid_amount || ((b.status === 'confirmed' || b.status === 'review') && b.pay !== 'free' ? (b.pay === 'transfer' ? v.total + b.code : v.total) : 0);
  if (a === 'confirm') {
    if (['held', 'review', 'rejected', 'venue'].indexOf(b.status) < 0) return { error: 'This booking cannot be confirmed now.', status: 409 };
    await env.DB.prepare("UPDATE bookings SET status = 'confirmed', confirmed_at = ?, hold_until = NULL WHERE id = ?").bind(at, b.id).run();
  } else if (a === 'notfound') {
    if (b.status !== 'review') return { error: 'Only a booking marked as transferred can be marked not found.', status: 409 };
    await env.DB.prepare("UPDATE bookings SET status = 'rejected', hold_until = ? WHERE id = ?").bind(new Date(Date.now() + HOLD_MINUTES * 60e3).toISOString(), b.id).run();
  } else if (a === 'remove') {
    if (!active) return { error: 'This booking is not active.', status: 409 };
    // what is still paid for: the players left in the booking (a player taken out earlier had their own part refunded)
    const refund = body.refund && paidNow ? (b.pay === 'manual' ? Math.min(paidNow, v.total) : v.total + (b.pay === 'transfer' ? b.code : 0)) : 0;
    await env.DB.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ?, reason = ?, refund = refund + ? WHERE id = ?").bind(at, cleanText(body.reason, 60) || 'Removed by the admin', refund, b.id).run();
  } else if (a === 'removePlayer') {
    if (!active) return { error: 'This booking is not active.', status: 409 };
    const p = v.players.filter(function (x) { return x.id === String(body.player || ''); })[0];
    if (!p) return { error: 'This player was not found in the booking.', status: 404 };
    if (v.players.length < 2) return { error: 'This is the only player. Remove the whole booking instead.', status: 409 };
    const prices = {}; v.event.sessions.forEach(function (s) { prices[s.id] = s.price; });
    const cost = p.sessions.reduce(function (t, id) { return t + (prices[id] || 0); }, 0);
    const removed = v.removed.concat(p.name);
    const stmts = [env.DB.prepare('DELETE FROM booking_seats WHERE booking_id = ? AND player_id = ?').bind(b.id, p.id)];
    if (paidNow) stmts.push(env.DB.prepare('UPDATE bookings SET paid_amount = ?, refund = refund + ?, removed = ?, amount = ? WHERE id = ?').bind(paidNow, body.refund ? cost : 0, JSON.stringify(removed), v.total - cost, b.id));
    else stmts.push(env.DB.prepare('UPDATE bookings SET removed = ?, amount = ? WHERE id = ?').bind(JSON.stringify(removed), v.total - cost, b.id));
    await env.DB.batch(stmts);
  } else if (a === 'refunded') {
    await env.DB.prepare('UPDATE bookings SET refund = 0 WHERE id = ?').bind(b.id).run();
  } else {
    return { error: 'Unknown action', status: 400 };
  }
  const fresh = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(b.id).first();
  return bookingView(env, fresh, true);
}

// ---- a booking added by hand (WhatsApp, Instagram DM, walk-in) ----
// { source: 'wa'|'ig'|'walk'|'other', players: [{ name, wa?, ig?, level?, sessions, registryId? }], pay: 'paid'|'link'|'venue'|'free', paid?, over?, note? }
// WhatsApp and level may be left out. "Over" lets a walk-in in when a session is full. Paying at the venue is fine for guests here.
const SOURCES = ['wa', 'ig', 'walk', 'other'];
export async function addBooking(env, actor, eventId, b) {
  await ensureEventTables(env);
  await expireNow(env);
  const ev = (await loadEvents(env, 'id = ?', [String(eventId)]))[0];
  if (!ev) return { error: 'This event was not found.', status: 404 };
  if (!mayManage(actor, ev)) return NOT_YOURS;
  const byId = {}; ev.sessions.forEach(function (s) { byId[s.id] = s; });
  const list = Array.isArray(b.players) ? b.players : [];
  if (!list.length) return { error: 'Add at least one player.', status: 400 };
  if (list.length > MAX_PLAYERS) return { error: 'Up to ' + MAX_PLAYERS + ' people per booking.', status: 400 };
  // players picked from the list: their registered number and Instagram fill what was left empty
  const regInfo = {}, pickIds = list.map(function (p) { return p && p.registryId ? String(p.registryId) : ''; }).filter(Boolean);
  if (pickIds.length) { try { const r = await env.DB.prepare('SELECT id, whatsapp, instagram FROM registry WHERE id IN (' + pickIds.map(function () { return '?'; }).join(',') + ')').bind(...pickIds).all(); r.results.forEach(function (x) { regInfo[x.id] = { wa: x.whatsapp || '', ig: x.instagram || '' }; }); } catch (e) { } }
  const players = [], waSeen = {};
  for (let i = 0; i < list.length; i++) {
    const p = list[i] || {}, who = 'Player ' + (i + 1);
    const name = cleanText(p.name, 40);
    if (!name) return { error: who + ': name is required.', status: 400 };
    let wa = '';
    if (p.wa && String(p.wa).trim()) { wa = normWhatsapp(p.wa); if (!wa) return { error: who + ': WhatsApp number is not valid.', status: 400 }; }
    else if (p.registryId && regInfo[String(p.registryId)]) wa = regInfo[String(p.registryId)].wa;   // picked from the player list: their registered number
    if (wa && waSeen[wa]) return { error: who + ': this WhatsApp number is already in the booking.', status: 400 };
    if (wa) waSeen[wa] = 1;
    const ig = (!p.ig && p.registryId && regInfo[String(p.registryId)]) ? regInfo[String(p.registryId)].ig : normInstagram(p.ig);
    if (ig === null) return { error: who + ': Instagram username is not valid.', status: 400 };
    const level = LEVELS.indexOf(p.level) >= 0 ? p.level : '';
    const ids = Array.isArray(p.sessions) ? p.sessions.map(String).filter(function (x, k, a) { return a.indexOf(x) === k && byId[x]; }) : [];
    if (!ids.length) return { error: who + ': pick at least one session.', status: 400 };
    players.push({ name: name, wa: wa, ig: ig || '', level: level, sessions: ids, registryId: p.registryId ? String(p.registryId) : '' });
  }
  // registry: the player picked from the list, or a WhatsApp number that is registered
  const reg = await registryByWa(env, players.map(function (p) { return p.wa; }).filter(Boolean));
  let known = {};
  const picked = players.map(function (p) { return p.registryId; }).filter(Boolean);
  if (picked.length) { try { const r = await env.DB.prepare('SELECT id FROM registry WHERE id IN (' + picked.map(function () { return '?'; }).join(',') + ')').bind(...picked).all(); r.results.forEach(function (x) { known[x.id] = 1; }); } catch (e) { known = {}; } }
  players.forEach(function (p) { p.rid = (p.registryId && known[p.registryId]) ? p.registryId : (p.wa ? reg[p.wa] || null : null); });

  const total = players.reduce(function (t, p) { return t + p.sessions.reduce(function (u, id) { return u + byId[id].price; }, 0); }, 0);
  let pay = ['paid', 'link', 'venue', 'free'].indexOf(b.pay) >= 0 ? b.pay : 'paid';
  if (total === 0) pay = 'free';
  const over = !!b.over;
  if (!over) {
    const want = {};
    players.forEach(function (p) { p.sessions.forEach(function (id) { want[id] = (want[id] || 0) + 1; }); });
    for (const id in want) { const s = byId[id], left = s.seats - s.taken; if (want[id] > left) return { error: (left <= 0 ? 'The ' + s.start.slice(11) + ' session is full.' : 'Only ' + left + ' seat' + (left === 1 ? '' : 's') + ' left in the ' + s.start.slice(11) + ' session.') + ' Switch on "Allow over the seat limit" to add them anyway.', status: 409 }; }
  }
  const map = { paid: ['confirmed', 'manual'], link: ['held', 'transfer'], venue: ['venue', 'venue'], free: ['confirmed', 'free'] }[pay];
  const status = map[0], payCol = map[1], now = Date.now(), at = nowIso();
  const code = payCol === 'transfer' ? await pickCode(env, ev.id, total) : 0;
  if (payCol === 'transfer' && !code) return { error: 'Too many bookings are waiting for payment. Choose another payment for now.', status: 409 };
  const paid = pay === 'paid' ? Math.max(0, Math.floor(Number(String(b.paid == null ? total : b.paid).replace(/[^\d]/g, '')) || 0)) : null;
  const id = randomId('bk'), token = randomToken(), ref = newRef();
  const source = SOURCES.indexOf(b.source) >= 0 ? b.source : 'other';
  const by = actor.admin ? 'admin' : actor.host.nickname;
  const stmts = [env.DB.prepare('INSERT INTO bookings (id, event_id, token, ref, status, pay, amount, code, hold_until, confirmed_at, paid_amount, source, note, added_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, ev.id, token, ref, status, payCol, total, code, payCol === 'transfer' ? new Date(now + HOLD_MINUTES * 60e3).toISOString() : null, status === 'confirmed' ? at : null, paid, source, cleanText(b.note, 200) || null, by, at)];
  const seatIdx = [];
  players.forEach(function (p, i) {
    const pid = randomId('bp');
    stmts.push(env.DB.prepare('INSERT INTO booking_players (id, booking_id, position, name, wa, ig, level, registry_id) VALUES (?,?,?,?,?,?,?,?)').bind(pid, id, i, p.name, p.wa, p.ig || null, p.level, p.rid));
    p.sessions.forEach(function (sid) {
      seatIdx.push(stmts.length);
      if (over) stmts.push(env.DB.prepare('INSERT INTO booking_seats (booking_id, player_id, session_id) VALUES (?,?,?)').bind(id, pid, sid));
      else stmts.push(env.DB.prepare("INSERT INTO booking_seats (booking_id, player_id, session_id) SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM booking_seats s JOIN bookings k ON k.id = s.booking_id WHERE s.session_id = ? AND k.status IN ('held','review','rejected','confirmed','venue')) < (SELECT seats FROM event_sessions WHERE id = ?)").bind(id, pid, sid, sid, sid));
    });
  });
  const res = await env.DB.batch(stmts);
  if (seatIdx.some(function (i) { return !res[i] || !res[i].meta || res[i].meta.changes !== 1; })) {
    await env.DB.batch([env.DB.prepare('DELETE FROM booking_seats WHERE booking_id = ?').bind(id), env.DB.prepare('DELETE FROM booking_players WHERE booking_id = ?').bind(id), env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id)]);
    return { error: 'Someone just took the last seat. Check the sessions, or allow over the seat limit.', status: 409 };
  }
  const fresh = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  return bookingView(env, fresh, true);
}
