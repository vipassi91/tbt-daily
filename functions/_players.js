import { statsFor, summarizePlayers } from './_tables.js';

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
  'CREATE TABLE IF NOT EXISTS registry (id TEXT PRIMARY KEY, full_name TEXT, nickname TEXT NOT NULL, whatsapp TEXT, instagram TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS registry_names (name_key TEXT PRIMARY KEY, registry_id TEXT NOT NULL, created_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_registry_names_id ON registry_names(registry_id)',
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_registry_whatsapp ON registry(whatsapp) WHERE whatsapp IS NOT NULL AND whatsapp != ''",
  // sign-up by link: one switch + secret token, and a waiting list that only ever holds pending requests
  'CREATE TABLE IF NOT EXISTS registry_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS registry_requests (id TEXT PRIMARY KEY, nickname TEXT NOT NULL, full_name TEXT, whatsapp TEXT NOT NULL, instagram TEXT, table_name TEXT, ip_hash TEXT, created_at TEXT NOT NULL)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_registry_requests_wa ON registry_requests(whatsapp)',
];
export async function ensureRegistryTables(env) {
  for (const s of REGISTRY_SQL) await env.DB.prepare(s).run();
}

// Without the tables everything still works as before: the registry is just empty.
export async function loadRegistry(env) {
  try {
    const p = await env.DB.prepare('SELECT id, full_name, nickname, whatsapp, instagram FROM registry').all();
    const n = await env.DB.prepare('SELECT name_key, registry_id FROM registry_names').all();
    const players = new Map(), names = new Map();
    p.results.forEach(function (r) { players.set(r.id, { id: r.id, fullName: r.full_name || '', nickname: r.nickname, whatsapp: r.whatsapp || '', instagram: r.instagram || '' }); });
    n.results.forEach(function (r) { names.set(r.name_key, r.registry_id); });
    return { ready: true, players: players, names: names };
  } catch (e) {
    return { ready: false, players: new Map(), names: new Map() };
  }
}
// The guest rule only starts once someone is registered, so switching this on never empties the board by itself.
export function guestRuleOn(reg) { return reg.ready && reg.players.size > 0; }

// The public data: registered people show their nickname and share one key, everyone else is a guest.
// Nothing private (full name, WhatsApp, Instagram) is ever added here.
export function applyRegistry(reg, players) {
  if (!guestRuleOn(reg)) return players;
  return players.map(function (p) {
    if (p.placeholder) return p;
    const k = nameKey(p.name);
    const pl = reg.players.get(reg.names.get(k));
    if (pl) return Object.assign({}, p, { name: pl.nickname, key: pl.id });
    return Object.assign({}, p, { guest: true, key: k });
  });
}

// Every name as typed at a played table, grouped by its normalised spelling.
export async function gatherNames(env) {
  const dayRes = await env.DB.prepare('SELECT id, date FROM days').all();
  const dayDate = {};
  dayRes.results.forEach(function (d) { dayDate[d.id] = d.date; });
  const tblRes = await env.DB.prepare('SELECT id, day_id, label, players, stats, updated_at FROM tables ORDER BY created_at ASC').all();
  const typed = new Map();
  let played = 0;
  for (const t of tblRes.results) {
    const stats = await statsFor(env, t);
    if (!stats.events) continue;
    played++;
    const date = dayDate[t.day_id] || '';
    summarizePlayers(stats).forEach(function (p) {
      if (p.placeholder) return;
      const k = nameKey(p.name);
      let w = typed.get(k);
      if (!w) { w = { key: k, variants: {}, games: 0, first: date, last: date, latestName: p.name, tables: [] }; typed.set(k, w); }
      w.variants[p.name] = (w.variants[p.name] || 0) + 1;
      w.games++;
      if (date && (!w.first || date < w.first)) w.first = date;
      if (date >= w.last) { w.last = date; w.latestName = p.name; }
      w.tables.push({ id: t.id, label: t.label, date: date });
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
