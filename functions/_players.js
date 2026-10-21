import { statsFor, summarizePlayers } from './_tables.js';
import { json } from './_auth.js';

// The player registry. An admin registers people by hand: full name, nickname (the only name shown
// publicly), WhatsApp and Instagram (both private, admin pages only). A name typed at a table counts as
// that person when it matches the nickname, the full name, or any extra spelling the admin linked.
// Everything else is a "guest": still shown at its table, but not on the per-person leaderboard.
// Games are never edited; all of this is applied when data is read.
export function nameKey(n) { return String(n == null ? '' : n).trim().toLowerCase().replace(/\s+/g, ' '); }
export function cleanText(s, max) { return String(s == null ? '' : s).trim().replace(/\s+/g, ' ').slice(0, max); }

// WhatsApp: digits only in international form (Indonesian numbers: 0812... or 812... become 62812...).
// '' = nothing given, null = not a valid number.
export function normWhatsapp(s) {
  let d = String(s == null ? '' : s).replace(/[^\d]/g, '');
  if (!d) return '';
  if (d.indexOf('00') === 0) d = d.slice(2);
  else if (d.charAt(0) === '0') d = '62' + d.slice(1);
  else if (d.charAt(0) === '8') d = '62' + d;
  return (d.length >= 9 && d.length <= 15) ? d : null;
}
// Instagram: the username only, lower case ("@Name", "instagram.com/name/" and "name" are the same).
export function normInstagram(s) {
  let u = String(s == null ? '' : s).trim();
  if (!u) return '';
  u = u.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[\/?#].*$/, '').replace(/^@/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(u) ? u.toLowerCase() : null;
}

export const REGISTRY_SQL = [
  'CREATE TABLE IF NOT EXISTS registry (id TEXT PRIMARY KEY, full_name TEXT, nickname TEXT NOT NULL, whatsapp TEXT, instagram TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS registry_names (name_key TEXT PRIMARY KEY, registry_id TEXT NOT NULL, created_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_registry_names_id ON registry_names(registry_id)',
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_registry_whatsapp ON registry(whatsapp) WHERE whatsapp IS NOT NULL AND whatsapp != ''",
  // sign-up by link: one switch + secret token, and a waiting list that only ever holds pending requests
  'CREATE TABLE IF NOT EXISTS registry_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS registry_requests (id TEXT PRIMARY KEY, nickname TEXT NOT NULL, full_name TEXT, whatsapp TEXT NOT NULL, instagram TEXT, table_name TEXT, ip_hash TEXT, created_at TEXT NOT NULL)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_registry_requests_wa ON registry_requests(whatsapp)',
  // one seat at one table assigned by hand to a person (or to "guest"), for two people who share a name.
  // name_key is the name written at that seat when the choice was made: if the seat is renamed later, the choice stops applying.
  'CREATE TABLE IF NOT EXISTS registry_seats (table_id TEXT NOT NULL, seat INTEGER NOT NULL, name_key TEXT NOT NULL, registry_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (table_id, seat))',
  'CREATE INDEX IF NOT EXISTS idx_registry_seats_id ON registry_seats(registry_id)',
];
export async function ensureRegistryTables(env) {
  for (const s of REGISTRY_SQL) await env.DB.prepare(s).run();
  // a registry made before player pages: add the switch that lets a player hide their page (an error just means it is already there)
  try { await env.DB.prepare('ALTER TABLE registry ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0').run(); } catch (e) { /* already there */ }
}
// For a player who hides their page, the public data carries this instead of their id: the same person gets the same
// value at every table, but nobody can turn it back into the id that opens the page.
async function opaqueKey(env, id) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String((env && env.ADMIN_PASSWORD) || '') + ':hidden:' + id));
  return 'h' + Array.from(new Uint8Array(buf)).slice(0, 5).map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}

// Without the tables everything still works as before: the registry is just empty.
export async function loadRegistry(env) {
  try {
    // the switch to hide a page is a newer column: a registry without it keeps working, with every page shown
    let p, hiddenReady = true;
    try { p = await env.DB.prepare('SELECT id, full_name, nickname, whatsapp, instagram, created_at, hidden FROM registry').all(); }
    catch (e) { hiddenReady = false; p = await env.DB.prepare('SELECT id, full_name, nickname, whatsapp, instagram, created_at FROM registry').all(); }
    const n = await env.DB.prepare('SELECT name_key, registry_id FROM registry_names').all();
    const players = new Map(), names = new Map(), opaque = new Map();
    for (const r of p.results) {
      players.set(r.id, { id: r.id, fullName: r.full_name || '', nickname: r.nickname, whatsapp: r.whatsapp || '', instagram: r.instagram || '', createdAt: r.created_at || '', hidden: !!r.hidden });
      if (r.hidden) opaque.set(r.id, await opaqueKey(env, r.id));
    }
    n.results.forEach(function (r) { names.set(r.name_key, r.registry_id); });
    const seats = new Map();
    let seatsReady = false;
    try {
      const s = await env.DB.prepare('SELECT table_id, seat, name_key, registry_id FROM registry_seats').all();
      s.results.forEach(function (r) { seats.set(r.table_id + ':' + r.seat, { key: r.name_key, to: r.registry_id }); });
      seatsReady = true;
    } catch (e) { /* a registry switched on before per-game assignment: it keeps working by name only */ }
    return { ready: true, players: players, names: names, seats: seats, seatsReady: seatsReady, hiddenReady: hiddenReady, opaque: opaque };
  } catch (e) {
    return { ready: false, players: new Map(), names: new Map(), seats: new Map(), seatsReady: false, hiddenReady: false, opaque: new Map() };
  }
}
// The guest rule only starts once someone is registered, so switching this on never empties the board by itself.
export function guestRuleOn(reg) { return reg.ready && reg.players.size > 0; }

// The public data: registered people show their nickname and share one key, everyone else is a guest.
// Nothing private (full name, WhatsApp, Instagram) is ever added here.
export function applyRegistry(reg, players, tableId) {
  if (!guestRuleOn(reg)) return players;
  return players.map(function (p) {
    if (p.placeholder) return p;
    const k = nameKey(p.name);
    const o = seatOwner(reg, tableId, p.seat, k);
    const pl = o.id && reg.players.get(o.id);
    // reg: this is a registered person whose page is open (the key is their id, which is what opens it);
    // hid: their page is hidden, so the key is the opaque one and no link is offered
    if (pl) return pl.hidden ? Object.assign({}, p, { name: pl.nickname, key: reg.opaque.get(pl.id) || pl.id, hid: true }) : Object.assign({}, p, { name: pl.nickname, key: pl.id, reg: true });
    return Object.assign({}, p, { guest: true, key: k });
  });
}

// Who a seat at a table belongs to: a choice made for that exact seat wins, otherwise the name written there decides.
export function seatOwner(reg, tableId, seat, typedKey) {
  const ov = reg.seats.get(tableId + ':' + seat);
  if (ov && ov.key === typedKey) {
    if (ov.to === 'guest') return { id: null, override: 'guest' };
    if (reg.players.has(ov.to)) return { id: ov.to, override: ov.to };
  }
  const nid = reg.names.get(typedKey);
  return { id: nid && reg.players.has(nid) ? nid : null, override: '' };
}

// Every name as typed at a played table, grouped by its normalised spelling.
export async function gatherNames(env) {
  const dayRes = await env.DB.prepare('SELECT id, date, label FROM days').all();
  const dayDate = {}, dayLabel = {};
  dayRes.results.forEach(function (d) { dayDate[d.id] = d.date; dayLabel[d.id] = d.label; });
  const tblRes = await env.DB.prepare('SELECT id, day_id, label, players, stats, updated_at FROM tables ORDER BY created_at ASC').all();
  const typed = new Map();
  let played = 0;
  const budget = { left: 12 };   // old statistics are renewed a dozen tables per request (see statsFor)
  for (const t of tblRes.results) {
    let stats, ps;
    try { stats = await statsFor(env, t, budget); if (!stats.events) continue; ps = summarizePlayers(stats); } catch (e) { continue; }   // a table whose saved data is damaged is left out here too, so the admin pages still open
    played++;
    const date = dayDate[t.day_id] || '';
    const named = ps.filter(function (q) { return !q.placeholder; }).map(function (q) { return q.name; });
    ps.forEach(function (p) {
      if (p.placeholder) return;
      const k = nameKey(p.name);
      let w = typed.get(k);
      if (!w) { w = { key: k, variants: {}, games: 0, first: date, last: date, latestName: p.name, tables: [] }; typed.set(k, w); }
      w.variants[p.name] = (w.variants[p.name] || 0) + 1;
      w.games++;
      if (date && (!w.first || date < w.first)) w.first = date;
      if (date >= w.last) { w.last = date; w.latestName = p.name; }
      w.tables.push({ id: t.id, label: t.label, date: date, seat: p.seat, session: dayLabel[t.day_id] || '', net: p.netTotal, with: named.filter(function (n) { return n !== p.name; }) });
    });
  }
  return { typed: typed, played: played };
}

// Two spellings that sat at the same table can never be the same person.
export function sameTableConflict(typed, keys) {
  const seen = {};
  for (const k of keys) {
    const w = typed.get(k);
    if (!w) continue;
    for (const t of w.tables) {
      if (seen[t.id] && seen[t.id] !== k) return '"' + typed.get(seen[t.id]).latestName + '" dan "' + w.latestName + '" bermain di meja yang sama (' + t.label + '), jadi tidak mungkin orang yang sama.';
      seen[t.id] = k;
    }
  }
  return null;
}

export const TWO_NAMES = /[\/&+]|\bdan\b/;
export function looksLikeTwo(key) { return TWO_NAMES.test(key); }

function lev(a, b) {
  const m = a.length, n = b.length;
  let prev = [];
  for (let j = 0; j <= n; j++) prev.push(j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    prev = cur;
  }
  return prev[n];
}
function tokens(k) { return k.split(/[^a-z0-9]+/).filter(function (t) { return t.length >= 3; }); }
function squash(k) { return k.replace(/[^a-z0-9]/g, ''); }
function reasonFor(a, b) {
  if (squash(a) && squash(a) === squash(b)) return { score: 3, text: 'sama kalau spasi dan tanda baca diabaikan' };
  const ta = tokens(a), tb = tokens(b);
  const shared = ta.filter(function (t) { return tb.indexOf(t) >= 0; })[0];
  if (shared) return { score: 3, text: 'sama-sama memuat "' + shared + '"' };
  const s = a.length <= b.length ? a : b, l = a.length <= b.length ? b : a;
  if (s.length >= 3 && l.length > s.length && l.indexOf(s) === 0 && /[^a-z0-9]/.test(l.charAt(s.length))) return { score: 3, text: '"' + s + '" adalah awalan dari "' + l + '"' };
  const min = Math.min(a.length, b.length), d = lev(a, b);
  if (d <= 1 && (min >= 4 || a.charAt(0) === b.charAt(0)) && min >= 3) return { score: 2, text: 'ejaan sangat mirip' };
  if (d <= 2 && min >= 7) return { score: 1, text: 'ejaan mirip' };
  return null;
}

// For each guest: the registered people it might be a spelling of (never someone who shared a table with it).
export function similarRegistered(reg, typed) {
  const tablesOf = {};
  reg.names.forEach(function (id, k) {
    const w = typed.get(k);
    if (!w) return;
    const set = tablesOf[id] || (tablesOf[id] = new Set());
    w.tables.forEach(function (t) { set.add(t.id); });
  });
  const keysOf = {};
  reg.names.forEach(function (id, k) { (keysOf[id] = keysOf[id] || []).push(k); });
  const out = {};
  typed.forEach(function (g, gk) {
    if (reg.names.has(gk)) return;
    const found = [];
    reg.players.forEach(function (pl, id) {
      const set = tablesOf[id];
      if (set && g.tables.some(function (t) { return set.has(t.id); })) return;
      let best = null;
      (keysOf[id] || []).forEach(function (k) { const r = reasonFor(gk, k); if (r && (!best || r.score > best.score)) best = r; });
      if (best) found.push({ id: id, nickname: pl.nickname, score: best.score, reason: best.text });
    });
    found.sort(function (x, y) { return y.score - x.score; });
    if (found.length) out[gk] = found.slice(0, 2);
  });
  return out;
}

// ---- sign-up by link ----
// The link carries a secret token that the admin can switch off or replace at any time. A request never
// becomes a player by itself: it waits for the admin, because the registry decides who is on the leaderboard
// and anyone could otherwise register under somebody else's name. Approved and rejected requests are deleted,
// so phone numbers are only kept while a request is pending.
export const MAX_PENDING = 200;
export const RATE_PER_HOUR = 5;

// ready=false when the sign-up tables do not exist yet (a registry activated before this feature).
export async function loadSignup(env) {
  try {
    const rows = await env.DB.prepare('SELECT key, value FROM registry_settings').all();
    await env.DB.prepare('SELECT COUNT(*) AS n FROM registry_requests').first();
    const m = {};
    rows.results.forEach(function (r) { m[r.key] = r.value; });
    return { ready: true, enabled: m.signup_enabled === '1', token: m.signup_token || '' };
  } catch (e) {
    return { ready: false, enabled: false, token: '' };
  }
}
// The visitor's address is never stored as is: only a salted hash, to limit how often one device can send.
export async function ipHash(request, salt) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + ':' + salt));
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('').slice(0, 24);
}

// Every seat that was played, with who it counts for.
export function seatRecords(reg, typed) {
  const out = [];
  typed.forEach(function (w) {
    w.tables.forEach(function (t) {
      const o = seatOwner(reg, t.id, t.seat, w.key);
      out.push({ typedKey: w.key, typedName: w.latestName, tableId: t.id, seat: t.seat, table: t.label, session: t.session, date: t.date, net: t.net, with: t.with, owner: o.id, override: o.override });
    });
  });
  return out;
}

// ---- names as the leaderboard knows them, for showing on a table's own pages ----
// The game itself is never changed: it keeps the names typed at the table. This only says, per seat, which
// registered nickname that seat counts for ('' when it is a guest or an empty seat), so the scoreboard can show it.
// The key of a seat is the name the server stored for it (made unique, so two "Steven" at one table are
// "steven" and "steven 2"), exactly as the leaderboard uses it.
export function displayNames(reg, tableId, typedNames, storedNames) {
  return [0, 1, 2, 3].map(function (i) {
    const typed = String((typedNames && typedNames[i]) || '').trim();
    if (!typed) return '';
    const stored = String((storedNames && storedNames[i]) || typed);
    const o = seatOwner(reg, tableId, i, nameKey(stored));
    const pl = o.id && reg.players.get(o.id);
    return pl ? pl.nickname : '';
  });
}
// A table page is asked for again every few seconds by everyone watching, so the registry is kept in memory for a
// short time instead of being read each time. Any admin change clears it at once (see admin/players.js).
let regCache = { at: 0, db: null, value: null };
export async function loadRegistryCached(env) {
  const ms = env && env.REGISTRY_CACHE_MS !== undefined ? Number(env.REGISTRY_CACHE_MS) : 15000;
  const now = Date.now();
  if (ms > 0 && regCache.value && regCache.db === env.DB && now - regCache.at < ms) return regCache.value;
  const value = await loadRegistry(env);
  regCache = { at: now, db: env.DB, value: value };
  return value;
}
export function clearRegistryCache() { regCache = { at: 0, db: null, value: null }; }
// Never lets a problem with the registry get in the way of showing a table.
export async function safeDisplay(env, tableId, typedNames, storedNames) {
  try { return displayNames(await loadRegistryCached(env), tableId, typedNames, storedNames); } catch (e) { return ['', '', '', '']; }
}

// A registered player's own page: who they are and every game they played, with the statistics kept for each game.
// Asked as /api/overview?player=<id>, public, no login. A player who hid their page, an id nobody has, and a badly written id
// all get the very same answer, so nobody can find out who chose to hide. Only an admin asking is told which of these it is.
export async function playerPage(env, rawId, admin) {
  const no = function (reason, reg) {
    const body = { error: 'not_available' };
    if (admin) { body.reason = reason; body.registryPlayers = reg ? reg.players.size : 0; }
    return json(body, 404);
  };
  try {
    // An id is whatever the registry holds: ids made by older versions look different from today's, so only the characters are checked.
    const raw = String(rawId || '');
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(raw)) return no('bad_id', null);
    const reg = await loadRegistryCached(env);
    if (!reg.ready) return no('registry_not_ready', reg);
    let pl = null;
    const tries = [raw, raw.toLowerCase()], dash = raw.lastIndexOf('-');
    if (dash > 0) tries.push(raw.slice(dash + 1));   // the first address style was <nickname>-<id>
    for (const k of tries) { pl = reg.players.get(k) || null; if (pl) break; }
    if (!pl) return no('not_found', reg);
    if (pl.hidden) return no('hidden', reg);
    const id = pl.id;

    // the tables where this person sat, by the same rule the leaderboard uses (the name written, or a choice made for that seat)
    const rows = (await env.DB.prepare('SELECT id, day_id, label, players, view_code FROM tables').all()).results;
    const mine = [];
    rows.forEach(function (t) {
      let names = []; try { names = JSON.parse(t.players); } catch (e) { names = []; }
      names.forEach(function (n, seat) { if (n && seatOwner(reg, t.id, seat, nameKey(n)).id === id) mine.push({ t: t, seat: seat }); });
    });
    const days = {};
    (await env.DB.prepare('SELECT id, label, date FROM days').all()).results.forEach(function (d) { days[d.id] = d; });

    const games = []; let skipped = 0;
    for (let i = 0; i < mine.length; i += 40) {   // the database takes a limited number of values per question
      const part = mine.slice(i, i + 40), ids = part.map(function (m) { return m.t.id; });
      const full = (await env.DB.prepare('SELECT id, day_id, label, view_code, players, stats, rounds, updated_at FROM tables WHERE id IN (' + ids.map(function () { return '?'; }).join(',') + ')').bind(...ids).all()).results;
      const byId = {}; full.forEach(function (r) { byId[r.id] = r; });
      for (const m of part) {
        try {   // a table whose saved data is damaged is left out of this page; it must not take the page down for everyone who sat there
          const row = byId[m.t.id]; if (!row) continue;
          const stats = await statsFor(env, row);   // renews an old table's statistics when its turn comes, so the facts are there
          if (!stats.events) continue;
          const me = summarizePlayers(stats)[m.seat], f = (stats.facts && stats.facts[stats.names[m.seat]]) || null;
          if (!me || !f) { skipped++; continue; }
          const d = days[row.day_id] || {};
          games.push({
            view: row.view_code, table: row.label, session: d.label || '', date: d.date || '', mode: stats.mode || 'casual', locked: !!stats.locked,
            rank: me.rank, net: me.netTotal, hands: stats.hands, winds: stats.winds, won: f.won, windFirsts: f.windFirsts,
            ptsSum: f.ptsSum, best: f.best, zimo: f.zimo, dealIns: f.dealIns,
            zimoLost: f.zimoLost || 0, penalties: f.penalties || 0, low: f.low === undefined ? null : f.low, dealPts: f.dealPts || 0, patterns: f.patterns || {}, streak: f.streak || 0,
            windsDone: stats.windsDone || 0, windHigh: f.windHigh === undefined ? null : f.windHigh, windLow: f.windLow === undefined ? null : f.windLow, windPlaceSum: f.windPlaceSum || 0,
          });
        } catch (e) { skipped++; }
      }
    }
    games.sort(function (a, b) { return b.date < a.date ? -1 : b.date > a.date ? 1 : (a.table < b.table ? -1 : 1); });
    const out = { player: { id: id, nickname: pl.nickname, since: (pl.createdAt || '').slice(0, 10) }, games: games };
    if (admin && skipped) out.skipped = skipped;   // games left out because their saved data could not be read
    return json(out);
  } catch (err) {
    return json(admin ? { error: 'server', detail: String((err && err.message) || err).slice(0, 200) } : { error: 'server' }, 500);
  }
}
