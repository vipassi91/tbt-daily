import { isAdmin, json, unauthorized } from '../../_auth.js';
import { cleanText, normWhatsapp } from '../../_players.js';
import { ensureEventTables, expireNow, loadEvents, takenBySession, cleanBanks, validStart, randomId, nowIso, TYPES, MODES, LEVELS } from '../../_events.js';

// GET  /api/admin/events : every event (drafts too), with sessions, seats taken and bookings per status. Admin only.
// POST /api/admin/events { id?, type, title, place, about, contactWa, banks, venuePay, fours, showGoing, closeHours, status, sessions: [...] }
//      creates or updates an event and its whole list of sessions in one go. A session somebody booked cannot be removed,
//      and its seats cannot go below what is booked.
export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  try {
    await ensureEventTables(env);
    await expireNow(env);
    const list = await loadEvents(env, '', []);
    const counts = await env.DB.prepare('SELECT event_id, status, COUNT(*) AS n FROM bookings GROUP BY event_id, status').all();
    const by = {};
    counts.results.forEach(function (r) { (by[r.event_id] = by[r.event_id] || {})[r.status] = r.n; });
    const refunds = await env.DB.prepare('SELECT event_id, COUNT(*) AS n FROM bookings WHERE refund > 0 GROUP BY event_id').all();
    const rf = {}; refunds.results.forEach(function (r) { rf[r.event_id] = r.n; });
    list.forEach(function (e) { e.bookings = by[e.id] || {}; e.refunds = rf[e.id] || 0; });
    list.sort(function (a, b) { return b.sessions.length && a.sessions.length ? b.sessions[0].start.localeCompare(a.sessions[0].start) : 0; });
    // what a new event starts from: the bank accounts and contact of the latest one
    const last = list.slice().sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); })[0];
    return json({ events: list, defaults: last ? { banks: last.banks, contactWa: last.contactWa, place: last.place } : { banks: [], contactWa: '', place: '' } });
  } catch (err) {
    return json({ error: 'Can’t load events: ' + String(err) }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return unauthorized();
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Invalid data' }, 400); }
  try {
    await ensureEventTables(env);
    await expireNow(env);
    const type = TYPES.indexOf(b.type) >= 0 ? b.type : 'other';
    const title = cleanText(b.title, 80);
    if (title.length < 3) return json({ error: 'Give the event a title.' }, 400);
    const status = ['draft', 'published'].indexOf(b.status) >= 0 ? b.status : 'draft';
    const contact = b.contactWa ? normWhatsapp(b.contactWa) : '';
    if (contact === null) return json({ error: 'The contact WhatsApp number is not valid.' }, 400);
    const banks = cleanBanks(b.banks);
    const closeHours = Math.max(0, Math.min(72, Number(b.closeHours) || 0));
    const raw = Array.isArray(b.sessions) ? b.sessions.slice(0, 20) : [];
    if (!raw.length) return json({ error: 'Add at least one session.' }, 400);
    const sessions = [];
    for (let i = 0; i < raw.length; i++) {
      const s = raw[i] || {}, n = 'Session ' + (i + 1);
      const start = String(s.start || '');
      if (!validStart(start)) return json({ error: n + ': pick a date and a start time.' }, 400);
      const hours = Math.round((Number(s.hours) || 0) * 4) / 4;
      if (hours <= 0 || hours > 24) return json({ error: n + ': the length is not right.' }, 400);
      const seats = Math.floor(Number(s.seats));
      if (!(seats >= 1 && seats <= 400)) return json({ error: n + ': seats must be between 1 and 400.' }, 400);
      if (b.fours && seats % 4) return json({ error: n + ': with "Seats in fours" on, seats must be a multiple of 4.' }, 400);
      const price = Math.floor(Number(s.price) || 0);
      if (price < 0 || price > 100000000) return json({ error: n + ': the price is not right.' }, 400);
      const levels = (Array.isArray(s.levels) ? s.levels : []).filter(function (l) { return LEVELS.indexOf(l) >= 0; });
      if (Array.isArray(s.levels) && !levels.length) return json({ error: n + ': pick at least one level.' }, 400);
      const mode = MODES.indexOf(s.mode) >= 0 ? s.mode : 'default';
      sessions.push({ id: s.id ? String(s.id) : '', start: start, hours: hours, seats: seats, price: price, levels: levels.length === LEVELS.length ? [] : levels, mode: mode });
    }
    if (status === 'published' && sessions.some(function (s) { return s.price > 0; }) && !banks.length && !b.venuePay) return json({ error: 'Add a bank account so people can transfer.' }, 400);

    const at = nowIso();
    const id = b.id ? String(b.id) : randomId('ev');
    const stmts = [];
    if (b.id) {
      const cur = await env.DB.prepare('SELECT id FROM events WHERE id = ?').bind(id).first();
      if (!cur) return json({ error: 'This event was not found.' }, 404);
      const old = await env.DB.prepare('SELECT id, start FROM event_sessions WHERE event_id = ?').bind(id).all();
      const taken = await takenBySession(env, old.results.map(function (s) { return s.id; }));
      const keep = {}; sessions.forEach(function (s) { if (s.id) keep[s.id] = s; });
      for (const s of old.results) {
        if (!keep[s.id] && taken[s.id]) return json({ error: 'The session on ' + s.start.replace('T', ' ') + ' has ' + taken[s.id] + ' booked seat' + (taken[s.id] === 1 ? '' : 's') + ', so it cannot be removed. Remove those bookings first.' }, 409);
        if (keep[s.id] && keep[s.id].seats < (taken[s.id] || 0)) return json({ error: 'The session on ' + s.start.replace('T', ' ') + ' already has ' + taken[s.id] + ' booked seats, more than ' + keep[s.id].seats + '.' }, 409);
      }
      const known = {}; old.results.forEach(function (s) { known[s.id] = 1; });
      if (sessions.some(function (s) { return s.id && !known[s.id]; })) return json({ error: 'A session was not found. Reload the page.' }, 409);
      stmts.push(env.DB.prepare('UPDATE events SET type=?, title=?, place=?, about=?, contact_wa=?, banks=?, venue_pay=?, fours=?, show_going=?, close_hours=?, status=?, updated_at=? WHERE id=?')
        .bind(type, title, cleanText(b.place, 120), String(b.about || '').trim().slice(0, 2000), contact || null, JSON.stringify(banks), b.venuePay ? 1 : 0, b.fours ? 1 : 0, b.showGoing ? 1 : 0, closeHours, status, at, id));
      old.results.forEach(function (s) { if (!keep[s.id]) stmts.push(env.DB.prepare('DELETE FROM event_sessions WHERE id = ?').bind(s.id)); });
    } else {
      stmts.push(env.DB.prepare('INSERT INTO events (id, type, title, place, about, contact_wa, banks, venue_pay, fours, show_going, close_hours, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, type, title, cleanText(b.place, 120), String(b.about || '').trim().slice(0, 2000), contact || null, JSON.stringify(banks), b.venuePay ? 1 : 0, b.fours ? 1 : 0, b.showGoing ? 1 : 0, closeHours, status, at, at));
    }
    sessions.forEach(function (s, i) {
      if (s.id) stmts.push(env.DB.prepare('UPDATE event_sessions SET position=?, start=?, hours=?, seats=?, price=?, levels=?, mode=? WHERE id=? AND event_id=?').bind(i, s.start, s.hours, s.seats, s.price, JSON.stringify(s.levels), s.mode, s.id, id));
      else stmts.push(env.DB.prepare('INSERT INTO event_sessions (id, event_id, position, start, hours, seats, price, levels, mode) VALUES (?,?,?,?,?,?,?,?,?)').bind(randomId('es'), id, i, s.start, s.hours, s.seats, s.price, JSON.stringify(s.levels), s.mode));
    });
    await env.DB.batch(stmts);
    return json({ ok: true, id: id });
  } catch (err) {
    return json({ error: 'Could not save: ' + String(err) }, 500);
  }
}
