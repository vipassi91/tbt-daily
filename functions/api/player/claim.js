import { respond, ensurePlayerTables, ipKey, addEvent, countEvents, sha256Hex, hashPassword, newPlayerLogin, cookieFor, passwordProblem } from '../../_playeraccount.js';

// GET /api/player/claim?t=<token>: is this link still good? (the page shows the nickname it is for)
// POST /api/player/claim { t, password }: the player chooses a password. The link is used up, and the player is signed in.
const WINDOW = 15 * 60 * 1000;
async function findClaim(env, token) {
  token = String(token || '');
  if (token.length < 20 || token.length > 100) return null;
  const c = await env.DB.prepare('SELECT c.id, c.registry_id, c.status, c.expires_at, r.nickname, r.whatsapp, r.hidden FROM player_claims c JOIN registry r ON r.id = c.registry_id WHERE c.token_hash=?').bind(await sha256Hex(token)).first();
  if (!c || c.status !== 'sent' || !c.expires_at || c.expires_at <= new Date().toISOString() || c.hidden) return null;
  return c;
}
const BAD = 'This link does not work any more. Ask for a new one on your page.';
export async function onRequestGet({ request, env }) {
  try {
    await ensurePlayerTables(env);
    const ip = await ipKey(request);
    if ((await countEvents(env, 'claimtok', ip, WINDOW)) >= 30) return respond({ error: 'Too many tries. Try again in 15 minutes.' }, 429);
    const c = await findClaim(env, new URL(request.url).searchParams.get('t'));
    if (!c) { await addEvent(env, 'claimtok', ip); return respond({ error: BAD }, 410); }
    return respond({ ok: true, nickname: c.nickname });
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}
export async function onRequestPost({ request, env }) {
  try {
    if (request.headers.get('x-tbt') !== 'player') return respond({ error: 'Not allowed' }, 403);
    await ensurePlayerTables(env);
    let b; try { b = await request.json(); } catch (e) { return respond({ error: 'Invalid data' }, 400); }
    const ip = await ipKey(request);
    if ((await countEvents(env, 'claimtok', ip, WINDOW)) >= 30) return respond({ error: 'Too many tries. Try again in 15 minutes.' }, 429);
    const c = await findClaim(env, b && b.t);
    if (!c) { await addEvent(env, 'claimtok', ip); return respond({ error: BAD }, 410); }
    const problem = passwordProblem(b && b.password, c.nickname, c.whatsapp);
    if (problem) return respond({ error: problem }, 400);
    const now = new Date().toISOString(), p = await hashPassword(String(b.password));
    await env.DB.prepare('INSERT INTO player_accounts (registry_id, pw_hash, pw_salt, created_at) VALUES (?,?,?,?) ON CONFLICT(registry_id) DO UPDATE SET pw_hash=excluded.pw_hash, pw_salt=excluded.pw_salt').bind(c.registry_id, p.hash, p.salt, now).run();
    await env.DB.prepare("UPDATE player_claims SET status='used', used_at=? WHERE id=?").bind(now, c.id).run();
    await env.DB.prepare("UPDATE player_claims SET status='cancelled' WHERE registry_id=? AND status IN ('pending','sent')").bind(c.registry_id).run();
    await env.DB.prepare('DELETE FROM player_logins WHERE registry_id=?').bind(c.registry_id).run();   // a new password signs the other phones out
    const l = await newPlayerLogin(env, c.registry_id);
    return respond({ ok: true, id: c.registry_id, nickname: c.nickname }, 200, cookieFor(l.token, l.maxAge));
  } catch (err) { return respond({ error: 'Something went wrong. Please try again.' }, 500); }
}
