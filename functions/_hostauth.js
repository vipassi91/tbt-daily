// Hosts: registered players the admin has chosen. They log in with a personal password and can make sessions and tables.
import { json } from './_auth.js';

export const LIMITS = { tablesPerDay: 24, sessionsPerDay: 10 };
const LOGIN_DAYS = 30, FIRST_PASSWORD_DAYS = 7, ITERATIONS = 100000, COOKIE = 'tbt_host';
const enc = new TextEncoder();

// ---------- small tools
export function hex(buf) { return Array.from(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
export function randomHex(bytes) { const a = new Uint8Array(bytes); crypto.getRandomValues(a); return hex(a); }
export function randomToken() { const a = new Uint8Array(32); crypto.getRandomValues(a); let s = ''; for (const b of a) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export async function sha256Hex(text) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(text))); }
async function pbkdf2Hex(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map(function (h) { return parseInt(h, 16); }));
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: ITERATIONS }, key, 256));
}
export async function hashPassword(password) { const salt = randomHex(16); return { salt: salt, hash: await pbkdf2Hex(password, salt) }; }
function sameHex(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
export async function checkPassword(password, saltHex, hashHex) { return sameHex(await pbkdf2Hex(String(password), saltHex), hashHex); }
const DUMMY_SALT = '00112233445566778899aabbccddeeff';
export async function dummyHash(password) { await pbkdf2Hex(String(password), DUMMY_SALT); }   // an unknown nickname costs the same time as a wrong password
// The day in Jakarta time (UTC+7), as YYYY-MM-DD.
export function jakartaDay(d) { return new Date((d || new Date()).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10); }
export function lastSix(whatsapp) { const d = String(whatsapp || '').replace(/\D/g, ''); return d.length >= 8 ? d.slice(-6) : ''; }

// ---------- the tables this feature needs, made on first use so no one has to run SQL
const SQL = [
  'CREATE TABLE IF NOT EXISTS registry_hosts (registry_id TEXT PRIMARY KEY, pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, must_change INTEGER NOT NULL DEFAULT 1, first_until TEXT, last_login TEXT, created_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS host_logins (token_hash TEXT PRIMARY KEY, registry_id TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_host_logins_id ON host_logins(registry_id)',
  'CREATE TABLE IF NOT EXISTS host_daily (registry_id TEXT NOT NULL, day TEXT NOT NULL, tables INTEGER NOT NULL DEFAULT 0, sessions INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (registry_id, day))',
  'CREATE TABLE IF NOT EXISTS rate_events (kind TEXT NOT NULL, key TEXT NOT NULL, at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_rate_events ON rate_events(kind, key, at)',
];
const ALTERS = ['ALTER TABLE tables ADD COLUMN created_by TEXT', 'ALTER TABLE days ADD COLUMN created_by TEXT'];
let ensured = { db: null, p: null };
export function ensureHostTables(env) {
  if (ensured.db === env.DB && ensured.p) return ensured.p;
  const p = (async function () {
    for (const s of SQL) await env.DB.prepare(s).run();
    for (const s of ALTERS) { try { await env.DB.prepare(s).run(); } catch (e) { /* the column is already there */ } }
  })();
  ensured = { db: env.DB, p: p };
  p.catch(function () { ensured = { db: null, p: null }; });
  return p;
}

// ---------- limiting attempts
export async function ipKey(request) { return (await sha256Hex('tbt-rate|' + (request.headers.get('cf-connecting-ip') || 'unknown'))).slice(0, 24); }
export async function addEvent(env, kind, key) {
  await env.DB.prepare('INSERT INTO rate_events (kind, key, at) VALUES (?,?,?)').bind(kind, key, new Date().toISOString()).run();
  if (Math.random() < 0.05) await env.DB.prepare('DELETE FROM rate_events WHERE at<?').bind(new Date(Date.now() - 24 * 3600 * 1000).toISOString()).run();
}
export async function countEvents(env, kind, key, ms) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM rate_events WHERE kind=? AND key=? AND at>?').bind(kind, key, new Date(Date.now() - ms).toISOString()).first();
  return r ? r.n : 0;
}
// Wrong codes on the public pages (code lookup, scoreboard, players view). The block is remembered in memory so a good code costs no extra query;
// a wrong code is counted in the database, so every instance learns of an address that keeps guessing.
const GUESS_MAX = 60, GUESS_MS = 10 * 60 * 1000, blocked = new Map();
export async function guessBlocked(request) {
  if (!blocked.size) return false;
  const k = await ipKey(request), until = blocked.get(k);
  if (until && until > Date.now()) return true;
  if (until) blocked.delete(k);
  return false;
}
export async function guessMiss(env, request) {
  try {
    await ensureHostTables(env);
    const k = await ipKey(request);
    await addEvent(env, 'codeguess', k);
    if (await countEvents(env, 'codeguess', k, GUESS_MS) >= GUESS_MAX) { blocked.set(k, Date.now() + GUESS_MS); return true; }
  } catch (e) { /* a problem here must never stop a table from opening */ }
  return false;
}
export function tooManyGuesses() { return json({ error: 'Too many attempts. Please try again in a few minutes.' }, 429); }

// ---------- the login cookie: scripts on the page cannot read it, and other sites cannot send it
export function cookieFor(token, maxAge) { return COOKIE + '=' + token + '; Path=/api/host; Max-Age=' + maxAge + '; HttpOnly; Secure; SameSite=Strict'; }
export function readCookie(request) {
  const h = request.headers.get('cookie') || '';
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim(); }
  return '';
}
export function respond(body, status, cookie) {
  const h = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (cookie) h.append('Set-Cookie', cookie);
  return new Response(JSON.stringify(body), { status: status || 200, headers: h });
}
export function noStore(body, status) { return respond(body, status); }
export async function newLogin(env, registryId) {
  const token = randomToken(), now = new Date(), exp = new Date(now.getTime() + LOGIN_DAYS * 86400000);
  // at most five phones at once: the oldest are signed out
  await env.DB.prepare('DELETE FROM host_logins WHERE registry_id=? AND token_hash NOT IN (SELECT token_hash FROM host_logins WHERE registry_id=? ORDER BY created_at DESC LIMIT 4)').bind(registryId, registryId).run();
  await env.DB.prepare('INSERT INTO host_logins (token_hash, registry_id, created_at, expires_at) VALUES (?,?,?,?)').bind(await sha256Hex(token), registryId, now.toISOString(), exp.toISOString()).run();
  return { token: token, maxAge: LOGIN_DAYS * 86400 };
}
export const FIRST_PASSWORD_MS = FIRST_PASSWORD_DAYS * 86400000;

// Who is asking? Returns { host } or { res } (a response to send back).
export async function requireHost(request, env, opts) {
  try { await ensureHostTables(env); } catch (e) { return { res: respond({ error: 'Host tools are not available yet.' }, 503) }; }
  if (request.method !== 'GET' && request.headers.get('x-tbt') !== 'host') return { res: respond({ error: 'Not allowed' }, 403) };
  const token = readCookie(request);
  if (!token || token.length < 20) return { res: respond({ error: 'login_needed' }, 401) };
  const th = await sha256Hex(token);
  const row = await env.DB.prepare('SELECT l.expires_at, h.must_change, h.first_until, r.id, r.nickname, r.whatsapp FROM host_logins l JOIN registry_hosts h ON h.registry_id = l.registry_id JOIN registry r ON r.id = l.registry_id WHERE l.token_hash=?').bind(th).first();
  if (!row || row.expires_at <= new Date().toISOString()) return { res: respond({ error: 'login_needed' }, 401) };
  const host = { id: row.id, nickname: row.nickname, whatsapp: row.whatsapp || '', mustChange: !!row.must_change, tokenHash: th };
  if (host.mustChange && !(opts && opts.allowMustChange)) return { res: respond({ error: 'password_change_needed' }, 403) };
  return { host: host };
}

// ---------- what a host may make in a day: counted when it is made, and never given back by deleting
export async function takeDaily(env, registryId, field) {
  const day = jakartaDay(), max = field === 'tables' ? LIMITS.tablesPerDay : LIMITS.sessionsPerDay;
  await env.DB.prepare('INSERT OR IGNORE INTO host_daily (registry_id, day, tables, sessions) VALUES (?,?,0,0)').bind(registryId, day).run();
  const r = await env.DB.prepare('UPDATE host_daily SET ' + field + '=' + field + '+1 WHERE registry_id=? AND day=? AND ' + field + '<?').bind(registryId, day, max).run();
  return r.meta.changes > 0;
}
export async function giveBackDaily(env, registryId, field) { await env.DB.prepare('UPDATE host_daily SET ' + field + '=MAX(0,' + field + '-1) WHERE registry_id=? AND day=?').bind(registryId, jakartaDay()).run(); }
export async function madeToday(env, registryId) {
  const r = await env.DB.prepare('SELECT tables, sessions FROM host_daily WHERE registry_id=? AND day=?').bind(registryId, jakartaDay()).first();
  return { tables: r ? r.tables : 0, sessions: r ? r.sessions : 0 };
}

// ---------- the admin's list of hosts
export async function listHosts(env) {
  await ensureHostTables(env);
  const { results } = await env.DB.prepare('SELECT h.registry_id AS id, r.nickname, h.must_change, h.first_until, h.last_login FROM registry_hosts h JOIN registry r ON r.id = h.registry_id').all();
  const made = await env.DB.prepare('SELECT created_by, COUNT(*) AS n FROM tables WHERE created_by IS NOT NULL GROUP BY created_by').all();
  const by = {}; made.results.forEach(function (m) { by[m.created_by] = m.n; });
  const now = new Date().toISOString();
  return results.map(function (h) { return { id: h.id, nickname: h.nickname, firstUnused: !!h.must_change, firstExpired: !!h.must_change && !!h.first_until && h.first_until < now, lastLogin: h.last_login || null, tablesMade: by[h.id] || 0 }; })
    .sort(function (a, b) { return a.nickname.toLowerCase() < b.nickname.toLowerCase() ? -1 : 1; });
}
