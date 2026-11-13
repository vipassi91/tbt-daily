import { genCode } from './_auth.js';
import { cleanText, normWhatsapp, normInstagram } from './_players.js';

// Events and booking.
// An event (a class, open play, a tournament, anything) has one or more sessions. A booking is made by one person for up to
// eight players; each player picks their own sessions, so a seat is one player in one session.
// Payment is a bank transfer of the total plus a unique code of Rp 1 to 99, or (only when every player in the booking is a
// registered TBT player, and the event allows it) at the venue. Nothing is uploaded: the booker taps "I have transferred"
// and the admin checks the bank statement for the amount and the transfer note.
// Times are written and shown in Surabaya time (WIB, UTC+7, no daylight saving).

export const LEVELS = ['first', 'beg', 'cas', 'int', 'adv'];
export const LEVEL_NAMES = { first: 'First timer', beg: 'Beginner', cas: 'Casual', int: 'Intermediate', adv: 'Advanced' };
export const TYPES = ['cls', 'open', 'tour', 'other'];
// the game a session plays. 'chicken' (Chicken Hand) is for events only: the leaderboard scoreboard has no such mode.
export const MODES = ['casual', 'default', 'tournament', 'custom', 'mcr4', 'mcr8', 'mcrc', 'chicken'];
// a booking holds its seats while it is in one of these
export const ACTIVE = ['held', 'review', 'rejected', 'confirmed', 'venue'];
const ACTIVE_SQL = "('held','review','rejected','confirmed','venue')";
export const HOLD_MINUTES = 120;
export const CANCEL_HOURS = 24;
export const MAX_PLAYERS = 8;

export const EVENTS_SQL = [
  "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, place TEXT, about TEXT, contact_wa TEXT, banks TEXT, venue_pay INTEGER NOT NULL DEFAULT 0, fours INTEGER NOT NULL DEFAULT 0, show_going INTEGER NOT NULL DEFAULT 1, close_hours REAL NOT NULL DEFAULT 2, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  'CREATE TABLE IF NOT EXISTS event_sessions (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, position INTEGER NOT NULL, start TEXT NOT NULL, hours REAL NOT NULL, seats INTEGER NOT NULL, price INTEGER NOT NULL, levels TEXT, mode TEXT)',
  'CREATE INDEX IF NOT EXISTS idx_event_sessions_event ON event_sessions(event_id)',
  'CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, ref TEXT NOT NULL, status TEXT NOT NULL, pay TEXT NOT NULL, amount INTEGER NOT NULL, code INTEGER NOT NULL DEFAULT 0, hold_until TEXT, marked_at TEXT, confirmed_at TEXT, cancelled_at TEXT, reason TEXT, refund INTEGER NOT NULL DEFAULT 0, paid_amount INTEGER, removed TEXT, ip_hash TEXT, created_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_bookings_event ON bookings(event_id, status)',
  'CREATE TABLE IF NOT EXISTS booking_players (id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, position INTEGER NOT NULL, name TEXT NOT NULL, wa TEXT NOT NULL, ig TEXT, level TEXT NOT NULL, registry_id TEXT)',
  'CREATE INDEX IF NOT EXISTS idx_booking_players_booking ON booking_players(booking_id)',
  'CREATE TABLE IF NOT EXISTS booking_seats (booking_id TEXT NOT NULL, player_id TEXT NOT NULL, session_id TEXT NOT NULL, PRIMARY KEY (player_id, session_id))',
  'CREATE INDEX IF NOT EXISTS idx_booking_seats_session ON booking_seats(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_booking_seats_booking ON booking_seats(booking_id)',
];
// The tables are made the first time anything about events is asked (no D1 console needed). Once per worker.
// Columns added after v72 (an error only means the column is already there).
const EVENTS_ALTERS = [
  'ALTER TABLE events ADD COLUMN hosts TEXT',
  'ALTER TABLE bookings ADD COLUMN source TEXT',
  'ALTER TABLE bookings ADD COLUMN note TEXT',
  'ALTER TABLE bookings ADD COLUMN added_by TEXT',
  'ALTER TABLE event_sessions ADD COLUMN day_id TEXT',
];
let ready = false;
export async function ensureEventTables(env) {
  if (ready) return;
  await env.DB.batch(EVENTS_SQL.map(function (s) { return env.DB.prepare(s); }));
  for (const q of EVENTS_ALTERS) { try { await env.DB.prepare(q).run(); } catch (e) { /* already there */ } }
  ready = true;
}

// ---- time (WIB) ----
export function wibMs(start) { const t = Date.parse(String(start) + ':00+07:00'); return isNaN(t) ? NaN : t; }
export function nowIso() { return new Date().toISOString(); }
export function validStart(s) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(s)) && !isNaN(wibMs(s)); }

// A booking that was not paid in time gives its seats back. Done whenever events are read or booked, so no timer is needed.
export function expireStmt(env) {
  return env.DB.prepare("UPDATE bookings SET status = 'expired' WHERE status IN ('held','rejected') AND hold_until IS NOT NULL AND hold_until < ?").bind(nowIso());
}
export async function expireNow(env) { await expireStmt(env).run(); }

export function randomId(prefix) { return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 10); }
export function randomToken() { const a = new Uint8Array(18); crypto.getRandomValues(a); let s = ''; for (const b of a) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export function newRef() { return genCode(4); }
export function slugOf(t) { return String(t).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'event'; }
// what the booker writes in the transfer description: the booking code and the first name, short enough for every bank
export function noteOf(ref, firstName) { return ('TBT-' + ref + ' ' + String(firstName || '').split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8)).trim(); }

function parseJson(s, fallback) { try { const v = JSON.parse(s); return v == null ? fallback : v; } catch (e) { return fallback; } }

// ---- events ----
export function cleanBanks(list) {
  return (Array.isArray(list) ? list : []).slice(0, 2).map(function (b) {
    return { bank: cleanText(b && b.bank, 30), number: String((b && b.number) || '').replace(/[^\d -]/g, '').trim().slice(0, 30), name: cleanText(b && b.name, 60) };
  }).filter(function (b) { return b.bank && b.number; });
}
export function eventRow(r) {
  return {
    id: r.id, slug: slugOf(r.title), type: r.type, title: r.title, place: r.place || '', about: r.about || '', contactWa: r.contact_wa || '',
    banks: parseJson(r.banks, []), venuePay: !!r.venue_pay, fours: !!r.fours, showGoing: !!r.show_going, closeHours: Number(r.close_hours) || 0,
    status: r.status, hosts: parseJson(r.hosts, []), createdAt: r.created_at, updatedAt: r.updated_at
  };
}
export function sessionRow(r, taken) {
  return { id: r.id, position: r.position, start: r.start, hours: Number(r.hours), seats: r.seats, price: r.price, levels: parseJson(r.levels, []), mode: r.mode || 'default', dayId: r.day_id || null, taken: taken || 0 };
}
// Seats taken per session, for the given sessions.
export async function takenBySession(env, sessionIds) {
  const out = {};
  if (!sessionIds.length) return out;
  const q = 'SELECT s.session_id AS sid, COUNT(*) AS n FROM booking_seats s JOIN bookings b ON b.id = s.booking_id WHERE b.status IN ' + ACTIVE_SQL + ' AND s.session_id IN (' + sessionIds.map(function () { return '?'; }).join(',') + ') GROUP BY s.session_id';
  const r = await env.DB.prepare(q).bind(...sessionIds).all();
  r.results.forEach(function (x) { out[x.sid] = x.n; });
  return out;
}
// Events with their sessions (sorted by start) and seats taken. where: SQL after WHERE, with its values.
export async function loadEvents(env, where, values) {
  const ev = await env.DB.prepare('SELECT * FROM events' + (where ? ' WHERE ' + where : '')).bind(...(values || [])).all();
  if (!ev.results.length) return [];
  const ids = ev.results.map(function (e) { return e.id; });
  const ss = await env.DB.prepare('SELECT * FROM event_sessions WHERE event_id IN (' + ids.map(function () { return '?'; }).join(',') + ') ORDER BY start, position').bind(...ids).all();
  const taken = await takenBySession(env, ss.results.map(function (s) { return s.id; }));
  const by = {};
  ss.results.forEach(function (s) { (by[s.event_id] = by[s.event_id] || []).push(sessionRow(s, taken[s.id])); });
  return ev.results.map(function (e) { const o = eventRow(e); o.sessions = by[e.id] || []; return o; })
    .sort(function (a, b) { return firstStart(a).localeCompare(firstStart(b)); });
}
export function firstStart(e) { return e.sessions.length ? e.sessions[0].start : '9999'; }
export function lastEnd(e) { let m = 0; e.sessions.forEach(function (s) { m = Math.max(m, wibMs(s.start) + s.hours * 3600e3); }); return m; }
export function bookingOpen(e, s, now) { return wibMs(s.start) - e.closeHours * 3600e3 > now; }

// The public face of an event: no contact numbers of players, ever. Who is coming: nicknames of registered players
// (not those who hid their page), guests only counted.
export async function goingOf(env, eventId) {
  let rows;
  try {
    rows = await env.DB.prepare('SELECT DISTINCT p.wa AS wa, p.registry_id AS rid, r.nickname AS nick, r.hidden AS hidden FROM booking_players p JOIN bookings b ON b.id = p.booking_id LEFT JOIN registry r ON r.id = p.registry_id JOIN booking_seats s ON s.player_id = p.id WHERE b.event_id = ? AND b.status IN ' + ACTIVE_SQL).bind(eventId).all();
  } catch (e) {   // no registry table: everybody is a guest
    rows = await env.DB.prepare('SELECT DISTINCT p.wa AS wa, NULL AS rid, NULL AS nick, 0 AS hidden FROM booking_players p JOIN bookings b ON b.id = p.booking_id JOIN booking_seats s ON s.player_id = p.id WHERE b.event_id = ? AND b.status IN ' + ACTIVE_SQL).bind(eventId).all();
  }
  const names = [], seenR = {}, seenWa = {};
  let guests = 0;
  rows.results.forEach(function (r) {
    if (r.rid && r.nick) { if (!seenR[r.rid]) { seenR[r.rid] = 1; if (r.hidden) guests++; else names.push(r.nick); } }
    else if (!seenWa[r.wa]) { seenWa[r.wa] = 1; guests++; }
  });
  names.sort(function (a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
  return { names: names, guests: guests };
}

// ---- booking input ----
// Returns { players, error }. Each player: name, wa (international digits), ig, level, sessions (ids).
export function cleanPlayers(list, sessionsById) {
  if (!Array.isArray(list) || !list.length) return { error: 'Add at least one player.' };
  if (list.length > MAX_PLAYERS) return { error: 'Up to ' + MAX_PLAYERS + ' people per booking.' };
  const out = [], waSeen = {};
  for (let i = 0; i < list.length; i++) {
    const p = list[i] || {}, who = i === 0 ? 'You' : 'Player ' + (i + 1);
    const name = cleanText(p.name, 40);
    if (!name) return { error: who + ': name is required.' };
    const wa = normWhatsapp(p.wa);
    if (!wa) return { error: who + ': WhatsApp number is not valid.' };
    if (waSeen[wa]) return { error: who + ': this WhatsApp number is already in the booking. Every player needs their own.' };
    waSeen[wa] = 1;
    const ig = normInstagram(p.ig);
    if (ig === null) return { error: who + ': Instagram username is not valid.' };
    const level = String(p.level || '');
    if (LEVELS.indexOf(level) < 0) return { error: who + ': pick a level.' };
    const ids = Array.isArray(p.sessions) ? p.sessions.map(String).filter(function (x, k, a) { return a.indexOf(x) === k; }) : [];
    if (!ids.length) return { error: who + ': pick at least one session.' };
    for (const id of ids) {
      const s = sessionsById[id];
      if (!s) return { error: who + ': a session was not found. Reload the page.' };
      if (s.levels.length && s.levels.indexOf(level) < 0) return { error: who + ': the ' + s.start.slice(11) + ' session is for ' + s.levels.map(function (l) { return LEVEL_NAMES[l]; }).join(', ') + ' only.' };
    }
    out.push({ name: name, wa: wa, ig: ig || '', level: level, sessions: ids });
  }
  return { players: out };
}
// Registered players by WhatsApp number: { wa: registry id }. Empty when there is no registry.
export async function registryByWa(env, was) {
  const out = {};
  if (!was.length) return out;
  try {
    const r = await env.DB.prepare('SELECT id, whatsapp FROM registry WHERE whatsapp IN (' + was.map(function () { return '?'; }).join(',') + ')').bind(...was).all();
    r.results.forEach(function (x) { out[x.whatsapp] = x.id; });
  } catch (e) { /* no registry */ }
  return out;
}
// A unique code (1 to 99) that no other open transfer of the same total in this event uses.
export async function pickCode(env, eventId, amount) {
  const r = await env.DB.prepare("SELECT code FROM bookings WHERE event_id = ? AND pay = 'transfer' AND amount = ? AND status IN ('held','review','rejected')").bind(eventId, amount).all();
  const used = {}; r.results.forEach(function (x) { used[x.code] = 1; });
  const free = []; for (let c = 1; c <= 99; c++) if (!used[c]) free.push(c);
  if (!free.length) return 0;
  return free[Math.floor(Math.random() * free.length)];
}

// ---- reading a booking ----
// Everything about one booking. admin = true adds the contact details and the registry nicknames.
export async function bookingView(env, b, admin) {
  const ev = (await loadEvents(env, 'id = ?', [b.event_id]))[0] || null;
  const ps = await env.DB.prepare('SELECT * FROM booking_players WHERE booking_id = ? ORDER BY position').bind(b.id).all();
  const seats = await env.DB.prepare('SELECT booking_id, player_id, session_id FROM booking_seats WHERE booking_id = ?').bind(b.id).all();
  const nick = admin ? await nicknames(env, ps.results) : {};
  return viewFrom(b, ev, ps.results, seats.results, nick, admin);
}
// Every booking of one event, for the admin (three queries, whatever the number of bookings).
export async function eventBookings(env, ev) {
  const bs = await env.DB.prepare('SELECT * FROM bookings WHERE event_id = ? ORDER BY created_at DESC').bind(ev.id).all();
  if (!bs.results.length) return [];
  const ps = await env.DB.prepare('SELECT p.* FROM booking_players p JOIN bookings b ON b.id = p.booking_id WHERE b.event_id = ? ORDER BY p.position').bind(ev.id).all();
  const seats = await env.DB.prepare('SELECT s.booking_id, s.player_id, s.session_id FROM booking_seats s JOIN bookings b ON b.id = s.booking_id WHERE b.event_id = ?').bind(ev.id).all();
  const nick = await nicknames(env, ps.results);
  return bs.results.map(function (b) {
    return viewFrom(b, ev, ps.results.filter(function (p) { return p.booking_id === b.id; }), seats.results.filter(function (x) { return x.booking_id === b.id; }), nick, true);
  });
}
async function nicknames(env, players) {
  const out = {}, rids = players.map(function (p) { return p.registry_id; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  if (!rids.length) return out;
  try { const r = await env.DB.prepare('SELECT id, nickname FROM registry WHERE id IN (' + rids.map(function () { return '?'; }).join(',') + ')').bind(...rids).all(); r.results.forEach(function (x) { out[x.id] = x.nickname; }); } catch (e) { }
  return out;
}
function viewFrom(b, ev, playerRows, seatRows, nick, admin) {
  const sById = {}; (ev ? ev.sessions : []).forEach(function (s) { sById[s.id] = s; });
  const bySeat = {}; seatRows.forEach(function (x) { (bySeat[x.player_id] = bySeat[x.player_id] || []).push(x.session_id); });
  const players = playerRows.filter(function (p) { return bySeat[p.id]; }).map(function (p) {
    const ids = bySeat[p.id].slice().sort(function (x, y) { return ((sById[x] || {}).start || '').localeCompare((sById[y] || {}).start || ''); });
    const o = { id: p.id, name: p.name, level: p.level, sessions: ids };
    if (admin) { o.wa = p.wa; o.ig = p.ig || ''; o.registered = !!p.registry_id; o.nickname = nick[p.registry_id] || ''; }
    return o;
  });
  const total = players.reduce(function (t, p) { return t + p.sessions.reduce(function (u, id) { return u + ((sById[id] || {}).price || 0); }, 0); }, 0);
  const starts = players.reduce(function (a, p) { return a.concat(p.sessions); }, []).map(function (id) { return wibMs((sById[id] || {}).start); }).filter(function (x) { return !isNaN(x); });
  const firstMs = starts.length ? Math.min.apply(null, starts) : 0;
  const view = {
    ref: b.ref, status: b.status, pay: b.pay, total: total, code: b.code,
    toTransfer: b.pay === 'transfer' ? (b.paid_amount || (total + b.code)) : 0, paidAmount: b.paid_amount || null,
    note: noteOf(b.ref, players[0] ? players[0].name : (playerRows[0] ? playerRows[0].name : '')),
    holdUntil: b.hold_until, markedAt: b.marked_at, confirmedAt: b.confirmed_at, cancelledAt: b.cancelled_at,
    reason: b.reason || '', refund: b.refund || 0, removed: parseJson(b.removed, []), createdAt: b.created_at, players: players,
    source: b.source || 'online',
    canCancel: ACTIVE.indexOf(b.status) >= 0 && firstMs - Date.now() > CANCEL_HOURS * 3600e3,
    event: ev ? { id: ev.id, slug: ev.slug, title: ev.title, place: ev.place, type: ev.type, contactWa: ev.contactWa, banks: ev.banks, sessions: ev.sessions.map(function (s) { return { id: s.id, start: s.start, hours: s.hours, price: s.price, mode: s.mode }; }) } : null
  };
  if (admin) {
    view.id = b.id; view.token = b.token; view.memo = b.note || ''; view.addedBy = b.added_by || '';
    // the booker (first player) is who the admin writes to, even after they were taken out of the booking
    const first = playerRows[0]; view.contact = first ? { name: first.name, wa: first.wa } : null;
  }
  return view;
}

// What anyone may see of an event and its sessions.
export function publicEvent(e, now) {
  return {
    id: e.id, slug: e.slug, type: e.type, title: e.title, place: e.place, about: e.about, venuePay: e.venuePay, fours: e.fours, closeHours: e.closeHours, contactWa: e.contactWa,
    sessions: e.sessions.map(function (s) {
      return { id: s.id, start: s.start, hours: s.hours, seats: s.seats, left: Math.max(0, s.seats - s.taken), price: s.price, levels: s.levels, mode: s.mode, open: bookingOpen(e, s, now) };
    })
  };
}
