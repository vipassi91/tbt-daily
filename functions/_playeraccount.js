// Players who have claimed their page: they sign in with their nickname and a password they chose themselves, and can edit their own profile (avatar, tags, bio).
// Not the same thing as a host: a separate account table, a separate cookie, and nothing here lets a player make sessions or tables.
// How a page is claimed: the player asks on their page, the admin sends a one-time link to the WhatsApp number the player registered with (the admin presses one button,
// the message is ready), and the player opens that link to choose a password. The link works once and only for 30 minutes after it was sent.
import { respond, ensureHostTables, sha256Hex, randomToken, ipKey, addEvent, countEvents, hashPassword, checkPassword, dummyHash, lastSix } from './_hostauth.js';
export { respond, ipKey, addEvent, countEvents, hashPassword, checkPassword, dummyHash, randomToken, sha256Hex };

export const COOKIE = 'tbt_player', LOGIN_DAYS = 30, CLAIM_MINUTES = 30, PENDING_HOURS = 48, BIO_MAX = 120;
// the 22 characters of the tile quiz: any of them can be an avatar, whatever the player's own quiz result was
export const AVATARS = ['one-bamboo', 'nine-bamboo', 'one-character', 'nine-character', 'one-dot', 'nine-dot', 'red-dragon', 'green-dragon', 'white-dragon', 'east-wind', 'south-wind', 'west-wind', 'north-wind', 'spring', 'summer', 'autumn', 'winter', 'plum-blossom', 'orchid', 'chrysanthemum', 'bamboo', 'blank-tile'];
export const DEFAULT_AVATAR = 'blank-tile';
export const TAGS = [{ id: 'chicken-hand', label: 'Chicken Hand' }, { id: 'riichi', label: 'Riichi' }, { id: 'tbt', label: 'TBT' }, { id: 'mcr', label: 'MCR' }, { id: 'hk', label: 'HK' }, { id: 'others', label: 'Others' }];
const SQL = [
  'CREATE TABLE IF NOT EXISTS player_accounts (registry_id TEXT PRIMARY KEY, pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, created_at TEXT NOT NULL, last_login TEXT)',
  'CREATE TABLE IF NOT EXISTS player_logins (token_hash TEXT PRIMARY KEY, registry_id TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS idx_player_logins_id ON player_logins(registry_id)',
  'CREATE TABLE IF NOT EXISTS player_claims (id TEXT PRIMARY KEY, registry_id TEXT NOT NULL, token_hash TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, sent_at TEXT, expires_at TEXT, used_at TEXT)',
  'CREATE INDEX IF NOT EXISTS idx_player_claims_reg ON player_claims(registry_id, status)',
  'CREATE INDEX IF NOT EXISTS idx_player_claims_tok ON player_claims(token_hash)',
  "CREATE TABLE IF NOT EXISTS player_profiles (registry_id TEXT PRIMARY KEY, bio TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '[]', avatar TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL)",
];
let ensured = { db: null, p: null };
export function ensurePlayerTables(env) {
  if (ensured.db === env.DB && ensured.p) return ensured.p;
  const p = (async function () { await ensureHostTables(env); for (const s of SQL) await env.DB.prepare(s).run(); })();
  ensured = { db: env.DB, p: p };
  p.catch(function () { ensured = { db: null, p: null }; });
  return p;
}

// ---------- the login cookie: scripts on the page cannot read it, other sites cannot send it, and it only travels to /api/player
export function cookieFor(token, maxAge) { return COOKIE + '=' + token + '; Path=/api/player; Max-Age=' + maxAge + '; HttpOnly; Secure; SameSite=Strict'; }
export function readCookie(request) {
  const h = request.headers.get('cookie') || '';
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === COOKIE) return part.slice(i + 1).trim(); }
  return '';
}
export async function newPlayerLogin(env, registryId) {
  const token = randomToken(), now = new Date(), exp = new Date(now.getTime() + LOGIN_DAYS * 86400000);
  await env.DB.prepare('DELETE FROM player_logins WHERE registry_id=? AND token_hash NOT IN (SELECT token_hash FROM player_logins WHERE registry_id=? ORDER BY created_at DESC LIMIT 4)').bind(registryId, registryId).run();
  await env.DB.prepare('INSERT INTO player_logins (token_hash, registry_id, created_at, expires_at) VALUES (?,?,?,?)').bind(await sha256Hex(token), registryId, now.toISOString(), exp.toISOString()).run();
  return { token: token, maxAge: LOGIN_DAYS * 86400 };
}
// Who is asking? Returns { player } or { res }.
export async function requirePlayer(request, env) {
  try { await ensurePlayerTables(env); } catch (e) { return { res: respond({ error: 'Profiles are not available yet.' }, 503) }; }
  if (request.method !== 'GET' && request.headers.get('x-tbt') !== 'player') return { res: respond({ error: 'Not allowed' }, 403) };
  const token = readCookie(request);
  if (!token || token.length < 20) return { res: respond({ error: 'login_needed' }, 401) };
  const row = await env.DB.prepare('SELECT l.expires_at, r.id, r.nickname, r.whatsapp, r.hidden FROM player_logins l JOIN registry r ON r.id = l.registry_id WHERE l.token_hash=?').bind(await sha256Hex(token)).first();
  if (!row || row.expires_at <= new Date().toISOString()) return { res: respond({ error: 'login_needed' }, 401) };
  return { player: { id: row.id, nickname: row.nickname, whatsapp: row.whatsapp || '', tokenHash: await sha256Hex(token) } };
}

// ---------- small tools
export function maskWhatsapp(w) {
  let d = String(w || '').replace(/\D/g, ''); if (d.length < 9) return '';
  if (d.charAt(0) === '0') d = '62' + d.slice(1);
  return '+' + d.slice(0, 2) + ' \u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022' + d.slice(-3);   // only the country and the last 3 digits: whoever presses the button for someone else learns almost nothing
}
export function cleanBio(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, BIO_MAX); }
export function cleanTags(a) {
  const ok = {}; TAGS.forEach(function (t) { ok[t.id] = true; });
  const out = []; (Array.isArray(a) ? a : []).forEach(function (t) { if (typeof t === 'string' && ok[t] && out.indexOf(t) < 0) out.push(t); });
  return out;
}
// A password is refused when it is short, when it is the nickname, or when it is the phone number or a piece of it (the old first-password habit).
export function passwordProblem(password, nickname, whatsapp) {
  const p = String(password || '');
  if (p.length < 8) return 'Use at least 8 characters.';
  if (p.length > 200) return 'That password is too long.';
  const low = p.toLowerCase(), nick = String(nickname || '').trim().toLowerCase(), digits = String(whatsapp || '').replace(/\D/g, '');
  if (nick && low === nick) return 'The password cannot be your nickname.';
  const pd = p.replace(/\D/g, '');
  if (digits && pd.length >= 6 && (digits.indexOf(pd) >= 0 || pd.indexOf(lastSix(whatsapp)) >= 0 && lastSix(whatsapp))) return 'The password cannot be part of your phone number.';
  return '';
}
export async function loadProfile(env, registryId) {
  try {
    const r = await env.DB.prepare('SELECT bio, tags, avatar FROM player_profiles WHERE registry_id=?').bind(registryId).first();
    if (!r) return { bio: '', tags: [], avatar: '' };
    let tags = []; try { tags = cleanTags(JSON.parse(r.tags || '[]')); } catch (e) { tags = []; }
    return { bio: cleanBio(r.bio), tags: tags, avatar: AVATARS.indexOf(r.avatar) >= 0 ? r.avatar : '' };
  } catch (e) { return { bio: '', tags: [], avatar: '' }; }   // the table is made on first use: before that there is simply no profile
}
